import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sparkles,
  Send,
  Loader2,
  Calendar,
  Sun,
  Utensils,
  Target,
  Users,
  Heart,
  BookOpen,
  Brain,
  Smile,
  DollarSign,
  X,
  ChevronRight,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
  category?: string;
}

interface Category {
  id: string;
  name: string;
  icon: typeof Calendar;
  color: string;
  description: string;
}

const CATEGORIES: Category[] = [
  { id: "calendar", name: "Calendar", icon: Calendar, color: "text-blue-500", description: "View and edit your routine" },
  { id: "inspiration", name: "Daily Inspiration", icon: Sun, color: "text-yellow-500", description: "Wellness quotes and mindfulness" },
  { id: "meals", name: "Meal Prep", icon: Utensils, color: "text-pink-500", description: "Meal planning and recipes" },
  { id: "goals", name: "Goals", icon: Target, color: "text-green-500", description: "Brainstorm and create plans" },
  { id: "social", name: "Social", icon: Users, color: "text-purple-500", description: "Relationships and connections" },
  { id: "spiritual", name: "Spiritual", icon: Heart, color: "text-red-500", description: "Mindfulness and purpose" },
  { id: "diary", name: "Diary", icon: BookOpen, color: "text-orange-500", description: "Journal your thoughts" },
  { id: "mental", name: "Mental", icon: Brain, color: "text-indigo-500", description: "Focus and productivity" },
  { id: "emotional", name: "Emotional", icon: Smile, color: "text-amber-500", description: "Balance and wellbeing" },
  { id: "financial", name: "Financial", icon: DollarSign, color: "text-emerald-500", description: "Budgeting and goals" },
];

export function AIWorkspace() {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! I'm your wellness companion. I'm here to help you build a balanced, fulfilling life. You can chat with me about anything, or click on the categories on the right to explore specific areas like your calendar, goals, meal planning, and more. What's on your mind today?",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: lifeSystem } = useQuery({
    queryKey: ["/api/life-system"],
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat", {
        message,
        context: activeCategory,
        conversationHistory: messages.slice(-10),
      });
      return response.json();
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response, category: activeCategory || undefined },
      ]);
      setIsTyping(false);

      if (data.updatedCategory) {
        queryClient.invalidateQueries({ queryKey: ["/api/life-system"] });
      }
    },
    onError: () => {
      toast({
        title: "Couldn't get a response",
        description: "Please try again.",
        variant: "destructive",
      });
      setIsTyping(false);
    },
  });

  const handleSend = () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage, category: activeCategory || undefined },
    ]);
    setInput("");
    setIsTyping(true);
    chatMutation.mutate(userMessage);
  };

  const handleCategoryClick = (categoryId: string) => {
    if (activeCategory === categoryId) {
      setActiveCategory(null);
    } else {
      setActiveCategory(categoryId);
      const category = CATEGORIES.find((c) => c.id === categoryId);
      if (category) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `You've opened ${category.name}. ${getCategoryWelcome(categoryId)} What would you like to do?`,
            category: categoryId,
          },
        ]);
      }
    }
  };

  const getCategoryWelcome = (categoryId: string): string => {
    const welcomes: Record<string, string> = {
      calendar: "Here you can view your schedule, create routines, and plan your days.",
      inspiration: "Let me share some wisdom to brighten your day and shift your perspective.",
      meals: "Let's plan nutritious meals that fuel your body and fit your lifestyle.",
      goals: "This is where you brainstorm, set intentions, and create actionable plans.",
      social: "Nurturing relationships is key to wellbeing. Let's focus on your connections.",
      spiritual: "Take a moment to center yourself. We can explore mindfulness, gratitude, or purpose.",
      diary: "Your private space to reflect, process emotions, and track your journey.",
      mental: "Sharp mind, clear focus. Let's work on productivity and mental clarity.",
      emotional: "Understanding and managing emotions is a skill. Let's explore together.",
      financial: "Financial wellness reduces stress. Let's work on your money goals.",
    };
    return welcomes[categoryId] || "";
  };

  const activeCategoryData = CATEGORIES.find((c) => c.id === activeCategory);

  return (
    <div className="flex h-screen w-full bg-background">
      <div className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-chart-1" />
            <span className="font-semibold" data-testid="text-brand">Wellness AI</span>
          </div>
        </div>
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;
              
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    isActive ? "bg-chart-1/10 border border-chart-1/30" : "hover-elevate"
                  }`}
                  data-testid={`button-category-${category.id}`}
                >
                  <Icon className={`w-5 h-5 ${category.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{category.name}</p>
                  </div>
                  {isActive ? (
                    <X className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between gap-4 p-4 border-b flex-wrap">
          <div className="flex items-center gap-2">
            {activeCategoryData && (
              <Badge variant="secondary">
                <activeCategoryData.icon className={`w-3 h-3 mr-1 ${activeCategoryData.color}`} />
                {activeCategoryData.name}
              </Badge>
            )}
          </div>
          <ThemeToggle />
        </header>

        <div className="flex-1 flex flex-col overflow-hidden p-4">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 max-w-3xl mx-auto">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] p-4 rounded-2xl ${
                          message.role === "user"
                            ? "bg-chart-1 text-primary-foreground"
                            : "bg-muted"
                        }`}
                        data-testid={`message-chat-${index}`}
                      >
                        {message.category && message.role === "assistant" && (
                          <Badge variant="outline" className="mb-2 text-xs">
                            {CATEGORIES.find((c) => c.id === message.category)?.name}
                          </Badge>
                        )}
                        <p className={`${message.role === "assistant" ? "font-serif leading-relaxed" : ""} whitespace-pre-line`}>
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-muted p-4 rounded-2xl flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="p-4 border-t">
                <div className="flex gap-2 max-w-3xl mx-auto">
                  <Textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={activeCategory ? `Ask about ${activeCategoryData?.name.toLowerCase()}...` : "What's on your mind?"}
                    className="resize-none min-h-[44px] max-h-32"
                    disabled={isTyping}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    data-testid="input-chat-message"
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
