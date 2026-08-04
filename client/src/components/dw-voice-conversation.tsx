import { useState, useRef, useEffect, useCallback } from "react";
import { DWOrb } from "@/components/dw-orb";
import { Button } from "@/components/ui/button";
import { X, Loader2, MessageSquare, Mic, MicOff } from "lucide-react";
import { DW_MODES, type DWMode } from "@shared/dw-persona";

interface ChatMessage {
  role: "user" | "assistant" | "system" | "insight";
  content: string;
}

interface DWVoiceConversationProps {
  messages: ChatMessage[];
  /** Called when the user finishes a spoken turn (final transcript). */
  onSend: (text: string) => void;
  /** Called when DW finishes speaking (final assistant transcript). */
  onAssistantTranscript?: (text: string) => void;
  /** Optional short summary of who the user is + recent state, injected into the live session. */
  userContextSummary?: string;
  /** Initial mode for the session. Defaults to "companion". */
  initialMode?: DWMode;
  /** Ignored in realtime mode but kept for backwards-compat with existing callers. */
  isTyping?: boolean;
  onClose: () => void;
}

type ConvState = "connecting" | "idle" | "listening" | "thinking" | "speaking" | "muted" | "error";

const orbStateFor = (s: ConvState): "idle" | "listening" | "speaking" | "active" | "chat" => {
  if (s === "listening") return "listening";
  if (s === "speaking") return "speaking";
  if (s === "thinking") return "active";
  if (s === "connecting") return "chat";
  return "idle";
};

export function DWVoiceConversation({
  messages,
  onSend,
  onAssistantTranscript,
  userContextSummary,
  initialMode = "companion",
  onClose,
}: DWVoiceConversationProps) {
  const [convState, setConvState] = useState<ConvState>("connecting");
  const [statusText, setStatusText] = useState("Waking DW…");
  const [mode, setMode] = useState<DWMode>(initialMode);
  const [modeReason, setModeReason] = useState<string>("default opener");
  const [reasonOpen, setReasonOpen] = useState<boolean>(false);
  const [muted, setMuted] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [lastDWText, setLastDWText] = useState<string>(() => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    return last?.content.replace(/[#*`_~[\]()>]/g, "").trim().slice(0, 320) ?? "";
  });
  const [lastUserText, setLastUserText] = useState<string>("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const isMountedRef = useRef(true);
  const assistantBufferRef = useRef<string>("");
  const userBufferRef = useRef<string>("");
  const modeRef = useRef<DWMode>(initialMode);
  modeRef.current = mode;

  const setState = useCallback((s: ConvState) => {
    if (isMountedRef.current) setConvState(s);
  }, []);

  const sendEvent = useCallback((event: Record<string, unknown>) => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;
    try {
      dc.send(JSON.stringify(event));
    } catch (err) {
      console.warn("[dw-voice] failed to send event", err);
    }
  }, []);

  const teardown = useCallback(() => {
    try {
      dcRef.current?.close();
    } catch {}
    dcRef.current = null;
    try {
      pcRef.current?.getSenders().forEach((s) => s.track && s.track.stop());
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (remoteAudioRef.current) {
      try {
        remoteAudioRef.current.pause();
      } catch {}
      remoteAudioRef.current.srcObject = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    teardown();
    onClose();
  }, [teardown, onClose]);

  // Apply a new mode to a live session via session.update.
  const applyMode = useCallback(
    (next: DWMode) => {
      const def = DW_MODES.find((m) => m.id === next);
      if (!def) return;
      sendEvent({
        type: "session.update",
        session: {
          instructions: undefined, // server keeps base persona; we only nudge the mode addendum below
          // We can't replace instructions wholesale without losing the user context summary
          // baked in at session creation, so we layer the mode hint in via a system message.
        },
      });
      sendEvent({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "system",
          content: [
            {
              type: "input_text",
              text: `Mode switch → ${def.label}. ${def.systemAddendum}`,
            },
          ],
        },
      });
    },
    [sendEvent]
  );

  // Per-turn role pick. Called after every completed user transcript.
  const requestRolePick = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) return;
      try {
        const resp = await fetch("/api/realtime/pick-mode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            message: transcript,
            // Hysteresis: tell the picker which lane we're already in so it
            // requires a clearly stronger signal to switch lanes mid-call.
            previousMode: modeRef.current,
          }),
        });
        if (!resp.ok) return;
        const data = (await resp.json()) as {
          mode: DWMode;
          reason: string;
          confidence: number;
          applied: boolean;
          locked: boolean;
        };
        if (!isMountedRef.current) return;
        if (data.locked) return;
        setModeReason(data.reason);
        if (data.applied && data.mode !== modeRef.current) {
          setMode(data.mode);
          applyMode(data.mode);
        }
      } catch {
        // picker is best-effort; never block the conversation
      }
    },
    [applyMode]
  );

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const willMute = !muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !willMute));
    setMuted(willMute);
    if (willMute) setState("muted");
    else setState("listening");
  }, [muted, setState]);

  // --- Connect on mount ---
  useEffect(() => {
    isMountedRef.current = true;

    let cancelled = false;
    const connect = async () => {
      try {
        // 1. Mint ephemeral session
        const sessionResp = await fetch("/api/realtime/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            mode,
            userContextSummary: userContextSummary || undefined,
          }),
        });
        if (!sessionResp.ok) {
          const j = await sessionResp.json().catch(() => ({}));
          throw new Error((j as any)?.error || "Voice mode unavailable");
        }
        const { clientSecret, model, mode: serverMode, modeReason: serverReason } =
          (await sessionResp.json()) as {
            clientSecret: string;
            model: string;
            mode?: DWMode;
            modeReason?: string | null;
          };
        if (cancelled) return;
        if (serverMode && serverMode !== modeRef.current) {
          setMode(serverMode);
        }
        if (serverReason) setModeReason(serverReason);

        // 2. Get mic
        const localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        if (cancelled) {
          localStream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = localStream;

        // 3. Build peer connection
        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        // Remote audio
        const remoteAudio = remoteAudioRef.current ?? new Audio();
        remoteAudio.autoplay = true;
        remoteAudioRef.current = remoteAudio;
        pc.ontrack = (ev) => {
          if (ev.streams && ev.streams[0]) {
            remoteAudio.srcObject = ev.streams[0];
          }
        };

        // Local mic
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

        // 4. Data channel for events
        const dc = pc.createDataChannel("oai-events");
        dcRef.current = dc;
        dc.onopen = () => {
          if (!isMountedRef.current) return;
          setState("idle");
          setStatusText("Connected. Say hi.");
          // Ask DW for a brief opening so the user hears it's alive.
          sendEvent({
            type: "response.create",
            response: {
              modalities: ["audio", "text"],
              instructions:
                "Greet the user in one short sentence. Sound natural — like answering a call from a friend. Then stop and wait.",
            },
          });
        };
        dc.onmessage = (ev) => handleServerEvent(ev.data);
        dc.onerror = () => {
          if (!isMountedRef.current) return;
          setState("error");
          setErrorText("Voice channel hiccup.");
        };

        pc.onconnectionstatechange = () => {
          if (!isMountedRef.current) return;
          const s = pc.connectionState;
          if (s === "failed" || s === "disconnected" || s === "closed") {
            if (convState !== "error") {
              setState("error");
              setStatusText("Connection dropped — tap to retry.");
            }
          }
        };

        // 5. Offer / answer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpResp = await fetch(
          `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${clientSecret}`,
              "Content-Type": "application/sdp",
            },
            body: offer.sdp,
          }
        );
        if (!sdpResp.ok) throw new Error("Could not establish voice session.");
        const answerSDP = await sdpResp.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answerSDP });
      } catch (err: any) {
        if (cancelled || !isMountedRef.current) return;
        console.error("[dw-voice] connect failed", err);
        setErrorText(err?.message || "Voice mode failed to start.");
        setState("error");
      }
    };

    connect();

    return () => {
      cancelled = true;
      isMountedRef.current = false;
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Server event handler ---
  const handleServerEvent = useCallback((raw: any) => {
    let evt: any;
    try {
      evt = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return;
    }
    if (!evt?.type) return;

    switch (evt.type) {
      case "input_audio_buffer.speech_started":
        if (!muted) {
          setState("listening");
          setStatusText("Listening…");
        }
        break;
      case "input_audio_buffer.speech_stopped":
        setState("thinking");
        setStatusText("DW is thinking…");
        break;
      case "conversation.item.input_audio_transcription.completed": {
        const text: string = (evt.transcript || "").trim();
        if (text) {
          setLastUserText(text);
          userBufferRef.current = text;
          try {
            onSend(text);
          } catch {}
          // Fire-and-forget: ask the server to pick the right lane for this turn.
          requestRolePick(text);
        }
        break;
      }
      case "response.created":
        setState("thinking");
        setStatusText("DW is thinking…");
        assistantBufferRef.current = "";
        break;
      case "response.audio.delta":
        if (convState !== "speaking") {
          setState("speaking");
          setStatusText("DW is speaking…");
        }
        break;
      case "response.audio_transcript.delta": {
        const piece: string = evt.delta || "";
        assistantBufferRef.current += piece;
        const preview = assistantBufferRef.current.slice(-320);
        setLastDWText(preview);
        break;
      }
      case "response.audio_transcript.done":
      case "response.done": {
        const final = (assistantBufferRef.current || evt.transcript || "").trim();
        if (final) {
          setLastDWText(final.slice(-320));
          try {
            onAssistantTranscript?.(final);
          } catch {}
        }
        assistantBufferRef.current = "";
        if (!muted) {
          setState("idle");
          setStatusText("Your turn.");
        }
        break;
      }
      case "error": {
        const msg = evt?.error?.message || "Something went sideways.";
        console.error("[dw-voice] server error", evt);
        setErrorText(msg);
        setState("error");
        break;
      }
      default:
        // useful while iterating: console.debug("[dw-voice] evt", evt.type, evt);
        break;
    }
  }, [convState, muted, onSend, onAssistantTranscript, setState, requestRolePick]);

  // ---------- UI ----------
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" data-testid="voice-conversation">
      {/* Top bar */}
      <div className="flex items-center justify-between p-3 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          data-testid="button-voice-close"
          className="gap-1"
        >
          <X className="h-4 w-4" />
          <span className="hidden sm:inline">Close</span>
        </Button>
        <span className="text-xs text-muted-foreground" data-testid="text-voice-status">
          {statusText}
        </span>
        <Button
          variant={muted ? "default" : "ghost"}
          size="sm"
          onClick={toggleMute}
          disabled={convState === "connecting" || convState === "error"}
          data-testid="button-voice-mute"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
      </div>

      {/* Active role label */}
      <div className="px-3 pt-2 flex items-center justify-center">
        <button
          type="button"
          onClick={() => setReasonOpen((v) => !v)}
          data-testid="button-voice-mode-label"
          className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
          aria-label="Why this mode?"
        >
          DW · {DW_MODES.find((m) => m.id === mode)?.label ?? "Companion"}
        </button>
      </div>
      {reasonOpen && (
        <div
          className="px-3 pb-2 text-center text-xs text-muted-foreground"
          data-testid="text-voice-mode-reason"
        >
          {modeReason}
        </div>
      )}

      {/* Center stage */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <DWOrb size={160} state={orbStateFor(convState)} />

        <div className="min-h-[80px] max-w-md text-center space-y-2">
          {convState === "connecting" && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting…
            </div>
          )}
          {convState === "error" && (
            <p className="text-sm text-destructive" data-testid="text-voice-error">
              {errorText || "Something went wrong with voice mode."}
            </p>
          )}
          {lastUserText && convState !== "connecting" && (
            <p
              className="text-xs text-muted-foreground italic"
              data-testid="text-voice-user-transcript"
            >
              You: {lastUserText}
            </p>
          )}
          {lastDWText && convState !== "connecting" && (
            <p
              className="text-base text-foreground leading-relaxed"
              data-testid="text-voice-dw-transcript"
            >
              {lastDWText}
            </p>
          )}
        </div>

        <p className="text-xs text-muted-foreground max-w-xs text-center flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          Just talk. DW will reply and adapt its role to the conversation.
        </p>
      </div>
    </div>
  );
}
