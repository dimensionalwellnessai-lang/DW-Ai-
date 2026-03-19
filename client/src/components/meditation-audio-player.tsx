import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Square, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface Track {
  id: string;
  label: string;
  description: string;
  /** Generates audio nodes into the given AudioContext and returns a cleanup fn */
  build: (ctx: AudioContext, destination: AudioNode) => () => void;
}

// ---------------------------------------------------------------------------
// Audio-node builders (Web Audio API – no external files needed)
// ---------------------------------------------------------------------------

function buildWhiteNoise(ctx: AudioContext, destination: AudioNode): () => void {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 3000;

  source.connect(filter);
  filter.connect(destination);
  source.start();

  return () => {
    try { source.stop(); } catch { /* ignore */ }
    source.disconnect();
    filter.disconnect();
  };
}

function buildRain(ctx: AudioContext, destination: AudioNode): () => void {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Pink noise approximation: each sample is blend of multiple white-noise passes
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) / 9;
    b6 = white * 0.115926;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 600;
  filter.Q.value = 0.5;

  source.connect(filter);
  filter.connect(destination);
  source.start();

  return () => {
    try { source.stop(); } catch { /* ignore */ }
    source.disconnect();
    filter.disconnect();
  };
}

function buildOcean(ctx: AudioContext, destination: AudioNode): () => void {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) / 9;
    b6 = white * 0.115926;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Low-pass to make it feel like distant waves
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 800;

  // LFO for wave-like amplitude modulation
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.12; // ~7-second wave cycle
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.35;
  lfo.connect(lfoGain);

  const waveGain = ctx.createGain();
  waveGain.gain.value = 0.65;
  lfoGain.connect(waveGain.gain);

  source.connect(filter);
  filter.connect(waveGain);
  waveGain.connect(destination);
  lfo.start();
  source.start();

  return () => {
    try { source.stop(); } catch { /* ignore */ }
    try { lfo.stop(); } catch { /* ignore */ }
    source.disconnect();
    filter.disconnect();
    lfoGain.disconnect();
    waveGain.disconnect();
  };
}

function buildBinauralAlpha(ctx: AudioContext, destination: AudioNode): () => void {
  // Alpha waves: carrier ~200 Hz, binaural beat ~10 Hz (focus/relaxation)
  const carrier = 200;
  const beat = 10;

  const leftOsc = ctx.createOscillator();
  leftOsc.type = "sine";
  leftOsc.frequency.value = carrier;

  const rightOsc = ctx.createOscillator();
  rightOsc.type = "sine";
  rightOsc.frequency.value = carrier + beat;

  // Stereo merger to send each tone to a separate channel
  const merger = ctx.createChannelMerger(2);
  const leftGain = ctx.createGain();
  leftGain.gain.value = 0.3;
  const rightGain = ctx.createGain();
  rightGain.gain.value = 0.3;

  leftOsc.connect(leftGain);
  leftGain.connect(merger, 0, 0);

  rightOsc.connect(rightGain);
  rightGain.connect(merger, 0, 1);

  merger.connect(destination);
  leftOsc.start();
  rightOsc.start();

  return () => {
    try { leftOsc.stop(); } catch { /* ignore */ }
    try { rightOsc.stop(); } catch { /* ignore */ }
    leftOsc.disconnect();
    rightOsc.disconnect();
    leftGain.disconnect();
    rightGain.disconnect();
    merger.disconnect();
  };
}

function buildBowl(ctx: AudioContext, destination: AudioNode): () => void {
  // Tibetan singing bowl approximation: fundamental + harmonics with slow decay
  // Continuously re-struck on a slow interval for a sustained ambient feel
  const fundamental = 432; // Hz – "healing frequency" often cited in spiritual contexts
  const harmonics = [1, 2.756, 5.404]; // Bowl overtone ratios (approximate)
  const nodes: { osc: OscillatorNode; gain: GainNode }[] = [];

  let stopped = false;
  let intervalId: ReturnType<typeof setInterval>;

  function strike() {
    if (stopped) return;
    harmonics.forEach((ratio, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = fundamental * ratio;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(i === 0 ? 0.25 : 0.1 / (i + 1), ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 6);

      osc.connect(gainNode);
      gainNode.connect(destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 6.5);
      nodes.push({ osc, gain: gainNode });
    });
  }

  strike();
  // Re-strike every 8 seconds for a continuous ambient loop
  intervalId = setInterval(strike, 8000);

  return () => {
    stopped = true;
    clearInterval(intervalId);
    nodes.forEach(({ osc, gain }) => {
      try { osc.stop(); } catch { /* ignore */ }
      osc.disconnect();
      gain.disconnect();
    });
  };
}

// ---------------------------------------------------------------------------
// Track catalogue
// ---------------------------------------------------------------------------

const TRACKS: Track[] = [
  {
    id: "rain",
    label: "Rainfall",
    description: "Steady rain on leaves — grounding and calming",
    build: buildRain,
  },
  {
    id: "ocean",
    label: "Ocean Waves",
    description: "Slow tide rhythm — steadies the nervous system",
    build: buildOcean,
  },
  {
    id: "white",
    label: "White Noise",
    description: "Soft static — masks distractions, deepens focus",
    build: buildWhiteNoise,
  },
  {
    id: "binaural",
    label: "Alpha Binaural",
    description: "10 Hz beat — supports focus and light meditation",
    build: buildBinauralAlpha,
  },
  {
    id: "bowl",
    label: "Tibetan Bowl",
    description: "432 Hz resonance — invites stillness and presence",
    build: buildBowl,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MeditationAudioPlayer() {
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [volume, setVolume] = useState(60);
  const [muted, setMuted] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Sync master gain whenever volume or muted changes
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = muted ? 0 : volume / 100;
    }
  }, [volume, muted]);

  const stopTrack = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {/* ignore */});
      ctxRef.current = null;
      masterGainRef.current = null;
    }
    setActiveTrackId(null);
  }, []);

  const playTrack = useCallback(
    (track: Track) => {
      // Stop whatever is currently playing
      stopTrack();

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      ctxRef.current = ctx;

      const master = ctx.createGain();
      master.gain.value = muted ? 0 : volume / 100;
      master.connect(ctx.destination);
      masterGainRef.current = master;

      cleanupRef.current = track.build(ctx, master);
      setActiveTrackId(track.id);
    },
    [stopTrack, volume, muted],
  );

  const handleToggle = useCallback(
    (track: Track) => {
      if (activeTrackId === track.id) {
        stopTrack();
      } else {
        playTrack(track);
      }
    },
    [activeTrackId, stopTrack, playTrack],
  );

  // Stop audio when component unmounts
  useEffect(() => {
    return () => stopTrack();
  }, [stopTrack]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          Ambient Sounds
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Play calming audio in the background while you practice
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Track list */}
        <div className="space-y-2">
          {TRACKS.map((track) => {
            const isActive = activeTrackId === track.id;
            return (
              <div
                key={track.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors",
                  isActive
                    ? "border-primary/40 bg-primary/5"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none">{track.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {track.description}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  onClick={() => handleToggle(track)}
                  aria-label={isActive ? `Stop ${track.label}` : `Play ${track.label}`}
                  data-testid={`ambient-track-${track.id}`}
                >
                  {isActive ? (
                    <>
                      <Square className="w-3 h-3 mr-1.5" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 mr-1.5" />
                      Play
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Volume control — only shown when a track is active */}
        {activeTrackId && (
          <div className="flex items-center gap-3 pt-1">
            <Button
              size="icon"
              variant="ghost"
              className="shrink-0 h-7 w-7"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Unmute" : "Mute"}
              data-testid="ambient-mute-toggle"
            >
              {muted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[muted ? 0 : volume]}
              onValueChange={([val]) => {
                setVolume(val);
                if (val > 0) setMuted(false);
              }}
              className="flex-1"
              aria-label="Volume"
              data-testid="ambient-volume-slider"
            />
            <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
              {muted ? 0 : volume}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
