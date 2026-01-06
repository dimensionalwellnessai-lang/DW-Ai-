import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Send,
  Zap,
  Heart,
  Brain,
  MessageSquare,
  Check,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { saveCurrentClarity } from "@/lib/energy-context";
import type { MoodLog, CheckIn } from "@shared/schema";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
}

const QUICK_RESPONSES = [
  "Feeling great today!",
  "A bit tired, but motivated",
  "Need some encouragement",
  "Want to review my habits",
  "Looking for productivity tips",
];

export function CheckInPage() {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Good to see you! How are you feeling today? Let's check in on your energy, mood, and clarity.",
    },
  ]);
  const [input, setInput] = useState("");
  const [moodData, setMoodData] = useState({
    energyLevel: 5,
    moodLevel: 5,
    clarityLevel: 5,
  });
  const [showMoodSliders, setShowMoodSliders] = useState(true);
  const [moodLogged, setMoodLogged] = useState(false);

  const { data: todaysMood } = useQuery<MoodLog | null>({
    queryKey: ["/api/mood/today"],
  });

  const { data: recentCheckIns = [] } = useQuery<CheckIn[]>({
    queryKey: ["/api/checkins"],
  });

  useEffect(() => {
    if (todaysMood) {
      setMoodLogged(true);
      setShowMoodSliders(false);
      setMoodData({
        energyLevel: todaysMood.energyLevel,
        moodLevel: todaysMood.moodLevel,
        clarityLevel: todaysMood.clarityLevel ?? 5,
      });
    }
  }, [todaysMood]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const logMoodMutation = useMutation({
    mutationFn: async (data: { energyLevel: number; moodLevel: number; clarityLevel: number }) => {
      saveCurrentClarity(data.clarityLevel, 10);
      return apiRequest("POST", "/api/mood", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setMoodLogged(true);
      setShowMoodSliders(false);
      toast({ title: "Mood logged successfully!" });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Thanks for checking in! I've logged your energy at ${moodData.energyLevel}/10, mood at ${moodData.moodLevel}/10, and clarity at ${moodData.clarityLevel}/10. How can I help you today?`,
        },
      ]);
    },
    onError: () => {
      toast({ title: "Failed to log mood", variant: "destructive" });
    },
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat", { message, messages });
      return response;
    },
    onSuccess: (response: { reply: string }) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.reply },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    },
  });

  const handleSendMessage = (message: string) => {
    if (!message.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    chatMutation.mutate(message);
  };

  const handleLogMood = () => {
    logMoodMutation.mutate(moodData);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-checkin-title">Daily Check-in</h1>
        <p className="text-muted-foreground">Track your wellness and chat with your AI wellness companion</p>
      </div>

      {showMoodSliders && (
        <Card data-testid="card-mood-sliders">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-chart-1" />
              How are you feeling today?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-md bg-chart-4/10 flex items-center justify-center shrink-0">
                  <Zap className="h-5 w-5 text-chart-4" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Energy Level</span>
                    <span className="text-muted-foreground">{moodData.energyLevel}/10</span>
                  </div>
                  <Slider
                    value={[moodData.energyLevel]}
                    onValueChange={([value]) => setMoodData({ ...moodData, energyLevel: value })}
                    max={10}
                    min={1}
                    step={1}
                    data-testid="slider-energy"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-md bg-chart-5/10 flex items-center justify-center shrink-0">
                  <Heart className="h-5 w-5 text-chart-5" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Mood Level</span>
                    <span className="text-muted-foreground">{moodData.moodLevel}/10</span>
                  </div>
                  <Slider
                    value={[moodData.moodLevel]}
                    onValueChange={([value]) => setMoodData({ ...moodData, moodLevel: value })}
                    max={10}
                    min={1}
                    step={1}
                    data-testid="slider-mood"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-md bg-chart-3/10 flex items-center justify-center shrink-0">
                  <Brain className="h-5 w-5 text-chart-3" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Mental Clarity</span>
                    <span className="text-muted-foreground">{moodData.clarityLevel}/10</span>
                  </div>
                  <Slider
                    value={[moodData.clarityLevel]}
                    onValueChange={([value]) => setMoodData({ ...moodData, clarityLevel: value })}
                    max={10}
                    min={1}
                    step={1}
                    data-testid="slider-clarity"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleLogMood}
              disabled={logMoodMutation.isPending}
              className="w-full rounded-full"
              data-testid="button-log-mood"
            >
              {logMoodMutation.isPending ? "Logging..." : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Log Today's Mood
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {moodLogged && (
        <Card className="bg-chart-2/10 border-chart-2/20">
          <CardContent className="p-4 flex items-center gap-4">
            <Check className="h-5 w-5 text-chart-2" />
            <div>
              <p className="font-medium">Today's mood logged</p>
              <p className="text-sm text-muted-foreground">
                Energy: {moodData.energyLevel}/10 • Mood: {moodData.moodLevel}/10 • Clarity: {moodData.clarityLevel}/10
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="h-[500px] flex flex-col" data-testid="card-chat">
        <CardHeader className="shrink-0">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat with Your Wellness AI
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
          <ScrollArea className="flex-1 px-6" ref={scrollRef}>
            <div className="space-y-4 py-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] min-w-0 p-4 rounded-2xl ${
                      message.role === "user"
                        ? "bg-chart-1 text-primary-foreground"
                        : "bg-muted"
                    }`}
                    data-testid={`message-${index}`}
                  >
                    <p className={`break-words ${message.role === "assistant" ? "font-serif leading-relaxed" : ""}`}>
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-muted p-4 rounded-2xl">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-pulse" />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-pulse delay-100" />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-pulse delay-200" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="shrink-0 p-4 border-t space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {QUICK_RESPONSES.map((response) => (
                <Button
                  key={response}
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-full"
                  onClick={() => handleSendMessage(response)}
                  disabled={chatMutation.isPending}
                  data-testid={`button-quick-${response.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {response}
                </Button>
              ))}
            </div>

            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="resize-none min-h-[44px] max-h-32"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(input);
                  }
                }}
                data-testid="input-chat-message"
              />
              <Button
                size="icon"
                onClick={() => handleSendMessage(input)}
                disabled={!input.trim() || chatMutation.isPending}
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
