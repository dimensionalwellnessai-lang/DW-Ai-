import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { WeeklyScheduleConfirmation, type ScheduleItem } from "@/components/weekly-schedule-confirmation";
import { Send, Loader2, Calendar, Pencil, Check, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, parseApiError } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
}

interface ProposedBlock {
  id: string;
  title: string;
  day: number;
  startTime: string;
  endTime?: string;
  category?: string;
  why?: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CATEGORY_COLORS: Record<string, string> = {
  workout: "bg-green-500/10 text-green-700 dark:text-green-400",
  meal: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  work: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  personal: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  social: "bg-red-500/10 text-red-700 dark:text-red-400",
  wellness: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  sleep: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
};

function BlockEditor({
  block,
  onSave,
  onCancel,
}: {
  block: ProposedBlock;
  onSave: (updated: ProposedBlock) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(block.title);
  const [day, setDay] = useState(block.day);
  const [startTime, setStartTime] = useState(block.startTime);
  const [endTime, setEndTime] = useState(block.endTime || "");

  const isDirty =
    title !== block.title ||
    day !== block.day ||
    startTime !== block.startTime ||
    endTime !== (block.endTime || "");

  const handleCancel = () => {
    if (isDirty && !window.confirm("Discard your changes to this block?")) return;
    onCancel();
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
      <div>
        <label htmlFor={`block-title-${block.id}`} className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</label>
        <input
          id={`block-title-${block.id}`}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full mt-1 px-3 py-1.5 text-sm border rounded-md bg-background"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`block-day-${block.id}`} className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Day</label>
          <select
            id={`block-day-${block.id}`}
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className="w-full mt-1 px-3 py-1.5 text-sm border rounded-md bg-background"
          >
            {DAY_NAMES.map((name, i) => (
              <option key={i} value={i}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`block-start-${block.id}`} className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Start Time</label>
          <input
            id={`block-start-${block.id}`}
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full mt-1 px-3 py-1.5 text-sm border rounded-md bg-background"
          />
        </div>
      </div>
      <div>
        <label htmlFor={`block-end-${block.id}`} className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          End Time <span className="normal-case font-normal">(leave blank to use start time)</span>
        </label>
        <input
          id={`block-end-${block.id}`}
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="w-full mt-1 px-3 py-1.5 text-sm border rounded-md bg-background"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          <X className="w-3.5 h-3.5 mr-1" />Cancel
        </Button>
        <Button size="sm" onClick={() => onSave({ ...block, title, day, startTime, endTime: endTime || undefined })}>
          <Check className="w-3.5 h-3.5 mr-1" />Save
        </Button>
      </div>
    </div>
  );
}

function ProposedBlockCard({
  block,
  onEdit,
}: {
  block: ProposedBlock;
  onEdit: (block: ProposedBlock) => void;
}) {
  const colorClass = block.category ? CATEGORY_COLORS[block.category] || "bg-muted/40" : "bg-muted/40";
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{block.title}</span>
          {block.category && (
            <Badge variant="secondary" className={`text-xs capitalize ${colorClass}`}>
              {block.category}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {DAY_NAMES[block.day]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {block.startTime}{block.endTime ? ` – ${block.endTime}` : ""}
        </p>
        {block.why && (
          <p className="text-xs text-muted-foreground/80 italic leading-relaxed">
            {block.why}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => onEdit(block)}
        aria-label={`Edit ${block.title}`}
      >
        <Pencil className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

export default function ExpandMyWeekPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Let's build your week together. I'll ask you a few questions — up to 8 — to understand your commitments, goals, and preferences. Then I'll propose a personalised week plan you can tweak and confirm.\n\nFirst: what time do you usually wake up, and how does your energy feel in the morning?",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [phase, setPhase] = useState<"questions" | "proposal" | "confirmed">("questions");
  const [proposedBlocks, setProposedBlocks] = useState<ProposedBlock[]>([]);
  const [editingBlock, setEditingBlock] = useState<ProposedBlock | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute the upcoming week start (next Sunday, or today if Sunday) once per mount.
  // This is shared with WeeklyScheduleConfirmation (for display) and the confirm API
  // (for anchoring) so both sides show and save to the same week.
  const upcomingWeekStart = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sunday
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const d = new Date(now);
    d.setDate(now.getDate() + daysUntilSunday);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, proposedBlocks]);

  // Clean up redirect timeout on unmount
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    };
  }, []);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/week-planner/chat", {
        message,
        conversationHistory: messages,
        questionCount,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
      setQuestionCount(Math.min(data.questionCount, 8));
      setPhase(data.phase);
      if (data.proposedSchedule && data.proposedSchedule.length > 0) {
        setProposedBlocks(data.proposedSchedule);
      }
      setIsTyping(false);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm having a small moment on my end — give me a second and try again. I'm still here with you.",
        },
      ]);
      setIsTyping(false);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (items: ScheduleItem[]) => {
      const response = await apiRequest("POST", "/api/week-planner/confirm", {
        confirmedItems: items.filter((i) => i.isConfirmed === true),
        // Pass the computed week start so the server anchors events to the same week
        // that the confirmation dialog displayed to the user.
        weekStart: upcomingWeekStart.toISOString(),
      });
      return response.json();
    },
    onSuccess: (data) => {
      setPhase("confirmed");
      toast({
        title: "Week plan saved!",
        description: `${data.created} block${data.created !== 1 ? "s" : ""} added to your schedule.`,
      });
      // Refresh calendar views so newly-created events appear immediately
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      redirectTimeoutRef.current = setTimeout(() => setLocation("/plans"), 1500);
    },
    onError: (error) => {
      toast({
        title: "Save failed",
        description: parseApiError(error) || "Couldn't save the schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!input.trim() || isTyping || phase !== "questions") return;
    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setIsTyping(true);
    chatMutation.mutate(userMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEditBlock = (block: ProposedBlock) => {
    setEditingBlock(block);
  };

  const handleSaveEdit = (updated: ProposedBlock) => {
    setProposedBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setEditingBlock(null);
  };

  const handleConfirmSchedule = (confirmedItems: ScheduleItem[]) => {
    confirmMutation.mutate(confirmedItems);
  };

  // Convert ProposedBlocks to ScheduleItems for the confirmation dialog
  const scheduleItems: ScheduleItem[] = proposedBlocks.map((b) => ({
    id: b.id,
    title: b.title,
    description: b.why,
    day: b.day,
    startTime: b.startTime,
    endTime: b.endTime,
    category: b.category,
    isConfirmed: true,
  }));

  const cappedQuestionCount = Math.min(questionCount, 8);

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader
        title="Expand My Week"
        backPath="/"
        rightContent={
          <div className="p-2 rounded-full bg-primary/10">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
          {/* Progress indicator */}
          {phase === "questions" && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(cappedQuestionCount / 8) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {cappedQuestionCount} / 8 questions
              </span>
            </div>
          )}

          {/* Chat messages */}
          {messages.map((message, index) => (
            <article
              key={index}
              className={`animate-fade-in-up ${
                message.role === "user" ? "border-l-4 border-primary/40 pl-4 py-2" : ""
              }`}
              data-testid={`message-week-planner-${index}`}
            >
              {message.role === "user" ? (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">You</p>
                  <p className="font-body text-base leading-relaxed text-foreground/90 whitespace-pre-line break-words">
                    {message.content}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {index === 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-foreground">DW Week Planner</p>
                    </div>
                  )}
                  <p className="font-body text-base leading-relaxed text-foreground whitespace-pre-line">
                    {message.content}
                  </p>
                </div>
              )}
            </article>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <article className="animate-fade-in-up">
              <div className="flex items-center gap-3 py-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-body text-muted-foreground">Thinking...</span>
              </div>
            </article>
          )}

          {/* Proposed schedule blocks */}
          {phase === "proposal" && proposedBlocks.length > 0 && (
            <div className="space-y-4 animate-fade-in-up" data-testid="proposed-schedule">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-base">Proposed Week Plan</h2>
                <Badge variant="outline">{proposedBlocks.length} blocks</Badge>
              </div>
              <div className="space-y-2">
                {proposedBlocks.map((block) =>
                  editingBlock?.id === block.id ? (
                    <BlockEditor
                      key={block.id}
                      block={block}
                      onSave={handleSaveEdit}
                      onCancel={() => setEditingBlock(null)}
                    />
                  ) : (
                    <ProposedBlockCard key={block.id} block={block} onEdit={handleEditBlock} />
                  )
                )}
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={() => setConfirmOpen(true)}
                data-testid="button-open-confirm"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Review & Confirm Schedule
              </Button>
            </div>
          )}

          {phase === "confirmed" && (
            <div className="text-center py-8 space-y-2 animate-fade-in-up">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Check className="h-6 w-6 text-primary" />
              </div>
              <p className="font-semibold">Your week is ready!</p>
              <p className="text-sm text-muted-foreground">Taking you to your schedule…</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area — only visible during Q&A phase */}
      {phase === "questions" && (
        <div className="border-t bg-background/95 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto p-4">
            <div className="flex gap-2 items-end">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer…"
                className="min-h-[48px] max-h-[160px] resize-none rounded-2xl bg-card border font-body"
                rows={1}
                data-testid="input-week-planner-message"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isTyping || phase !== "questions"}
                size="icon"
                className="rounded-full h-12 w-12 shrink-0"
                data-testid="button-send-week-planner"
              >
                {isTyping ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      <WeeklyScheduleConfirmation
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        scheduleItems={scheduleItems}
        onConfirm={handleConfirmSchedule}
        isLoading={confirmMutation.isPending}
        weekStartDate={upcomingWeekStart}
      />
    </div>
  );
}
