import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { MoodPicker } from "@/components/mood-picker";
import { useTheme, MOOD_OPTIONS } from "@/lib/theme-provider";
import { getGuestData, saveGuestData, initGuestData, type GuestData } from "@/lib/guest-storage";
import { Link } from "wouter";
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
  Menu,
  Paperclip,
  Image,
  Mic,
  MicOff,
  Briefcase,
  Leaf,
  Palette,
  UserPlus,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
  category?: string;
  attachments?: { name: string; type: string; url: string }[];
}

interface Category {
  id: string;
  name: string;
  icon: typeof Calendar;
  color: string;
  description: string;
}

const CATEGORIES: Category[] = [
  { id: "calendar", name: "Calendar", icon: Calendar, color: "text-blue-500", description: "Your schedule and routines" },
  { id: "physical", name: "Physical", icon: Heart, color: "text-red-500", description: "Exercise, sleep, and health" },
  { id: "emotional", name: "Emotional", icon: Smile, color: "text-pink-500", description: "Feelings and self-care" },
  { id: "social", name: "Social", icon: Users, color: "text-purple-500", description: "Relationships and connections" },
  { id: "mental", name: "Intellectual", icon: Brain, color: "text-indigo-500", description: "Learning and growth" },
  { id: "spiritual", name: "Spiritual", icon: Sun, color: "text-amber-500", description: "Purpose and inner peace" },
  { id: "occupational", name: "Occupational", icon: Briefcase, color: "text-sky-500", description: "Work and career growth" },
  { id: "environmental", name: "Environmental", icon: Leaf, color: "text-teal-500", description: "Your space and nature" },
  { id: "financial", name: "Financial", icon: DollarSign, color: "text-emerald-500", description: "Money and security" },
  { id: "meals", name: "Meal Prep", icon: Utensils, color: "text-orange-500", description: "Nutrition and recipes" },
  { id: "diary", name: "Diary", icon: BookOpen, color: "text-cyan-500", description: "Journal your thoughts" },
  { id: "goals", name: "Goals", icon: Target, color: "text-green-500", description: "Dreams and milestones" },
];

const DEFAULT_WELCOME = "Hey there! I'm DWAI - your Dimensional Wellness AI. Think of me like Siri, but I actually understand your whole life across all dimensions of wellness. I can help you with physical health, emotional wellbeing, social connections, intellectual growth, spiritual practice, work-life balance, your environment, finances, meals, journaling, and goals. Just talk to me naturally - I'm here to help you thrive. What can I help you with today?";

export function AIWorkspace() {
  const { toast } = useToast();
  const { mood, themeMode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moodPickerOpen, setMoodPickerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<{ name: string; type: string; url: string }[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const guestData = getGuestData();
    if (guestData && guestData.messages.length > 0) {
      return guestData.messages.map(m => ({
        role: m.role,
        content: m.content,
        category: m.category,
        attachments: m.attachments,
      }));
    }
    return [{ role: "assistant", content: DEFAULT_WELCOME }];
  });
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  
  const currentMood = MOOD_OPTIONS.find(m => m.id === mood);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    const guestData = getGuestData() || initGuestData();
    const existingTimestamps = new Map(
      guestData.messages.map((m, i) => [i, m.timestamp])
    );
    const messagesToSave = messages.map((m, i) => ({
      ...m,
      timestamp: existingTimestamps.get(i) || Date.now(),
    }));
    saveGuestData({ ...guestData, messages: messagesToSave });
    
    const userMessageCount = messages.filter(m => m.role === "user").length;
    if (userMessageCount >= 3 && !showSavePrompt) {
      setShowSavePrompt(true);
    }
  }, [messages]);

  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognitionInstance = new SpeechRecognitionAPI();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = "en-US";

      recognitionInstance.onresult = (event: any) => {
        let transcript = "";
        
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        
        setInput(transcript);
      };

      recognitionInstance.onerror = () => {
        setIsListening(false);
        toast({
          title: "Voice input error",
          description: "Couldn't hear you. Please try again.",
          variant: "destructive",
        });
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, [toast]);

  const toggleVoiceInput = () => {
    if (!recognition) {
      toast({
        title: "Voice not supported",
        description: "Your browser doesn't support voice input.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setInput("");
      recognition.start();
      setIsListening(true);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat", {
        message,
        context: activeCategory,
        conversationHistory: messages.slice(-10),
        attachments,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response, category: activeCategory || undefined },
      ]);
      setIsTyping(false);

      if (data.updatedCategories && data.updatedCategories.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/category-entries"] });
        toast({
          title: "Saved to categories",
          description: `Added to: ${data.updatedCategories.join(", ")}`,
        });
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
      { role: "user", content: userMessage, category: activeCategory || undefined, attachments: attachments.length > 0 ? [...attachments] : undefined },
    ]);
    setInput("");
    setAttachments([]);
    setIsTyping(true);
    chatMutation.mutate(userMessage);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "file" | "image") => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type,
            url: reader.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCategoryClick = (categoryId: string) => {
    setMenuOpen(false);
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
      calendar: "Here you can view your schedule, create routines, and plan your days. Tell me about any appointments or events you want to add.",
      physical: "Your physical wellness is the foundation. Let's talk about exercise, sleep, nutrition, or any health goals you have.",
      emotional: "Emotional wellness matters. I'm here to help you process feelings, practice self-care, and build resilience.",
      social: "Relationships are everything. Let's strengthen your connections - tell me about people you want to reach out to or plans to make.",
      mental: "Keep your mind sharp! We can explore learning goals, books, courses, or anything that sparks your curiosity.",
      spiritual: "Find your center. Whether it's meditation, gratitude, or exploring your purpose - I'm here for this journey with you.",
      occupational: "Your work life matters too. Let's talk about career goals, work-life balance, skill development, or job satisfaction.",
      environmental: "Your surroundings affect your wellbeing. Let's discuss your living space, time in nature, or creating a peaceful environment.",
      financial: "Financial peace of mind is real wellness. Let's track spending, set budgets, or work toward your money goals.",
      meals: "Good food is self-care. Tell me about your dietary preferences and I'll help with meal plans and recipes.",
      diary: "Your private space to reflect. Journal freely - I'll help you process thoughts and track your emotional journey.",
      goals: "Dreams become reality with a plan. What do you want to achieve? Let's break it down into actionable steps.",
    };
    return welcomes[categoryId] || "";
  };

  const activeCategoryData = CATEGORIES.find((c) => c.id === activeCategory);
  
  const backgroundStyle = mood && themeMode === "full-background" 
    ? { background: `linear-gradient(135deg, hsl(var(--mood-bg-start)) 0%, hsl(var(--mood-bg-end)) 100%)` }
    : undefined;

  return (
    <div 
      className="flex flex-col h-screen w-full bg-background transition-colors duration-500 font-body"
    >
      <header className="flex items-center justify-between gap-4 p-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(true)}
            data-testid="button-open-menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300"
              style={{ background: currentMood ? `linear-gradient(135deg, ${currentMood.color}, ${currentMood.color}80)` : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}
            >
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight" data-testid="text-brand">DWAI</span>
          </div>
          {activeCategoryData && (
            <Badge variant="secondary" className="bg-primary/10">
              <activeCategoryData.icon className={`w-3 h-3 mr-1 ${activeCategoryData.color}`} />
              {activeCategoryData.name}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMoodPickerOpen(true)}
            className="relative"
            data-testid="button-open-mood-picker"
          >
            <Palette className="h-5 w-5" />
            {currentMood && (
              <span 
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background"
                style={{ backgroundColor: currentMood.color }}
              />
            )}
          </Button>
          <ThemeToggle />
          <Link href="/login">
            <Button variant="default" size="sm" className="rounded-full" data-testid="button-signup">
              <UserPlus className="w-4 h-4 mr-1" />
              Sign up
            </Button>
          </Link>
        </div>
      </header>
      
      {showSavePrompt && (
        <div className="px-4 pb-2">
          <div className="max-w-3xl mx-auto bg-primary/10 rounded-2xl p-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm font-body">
              Your chat is saved locally. Sign up to sync across devices and never lose your data.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSavePrompt(false)}
                data-testid="button-dismiss-save-prompt"
              >
                Dismiss
              </Button>
              <Link href="/login">
                <Button size="sm" className="rounded-full" data-testid="button-save-prompt-signup">
                  Sign up free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {moodPickerOpen && <MoodPicker onClose={() => setMoodPickerOpen(false)} />}

      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-6 max-w-3xl mx-auto py-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground px-4 py-3 rounded-3xl"
                      : ""
                  }`}
                  data-testid={`message-chat-${index}`}
                >
                  {message.category && message.role === "assistant" && (
                    <Badge variant="secondary" className="mb-2 text-xs bg-muted">
                      {CATEGORIES.find((c) => c.id === message.category)?.name}
                    </Badge>
                  )}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {message.attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-1 bg-muted rounded-full px-2 py-1 text-xs">
                          {att.type.startsWith("image/") ? (
                            <Image className="w-3 h-3" />
                          ) : (
                            <Paperclip className="w-3 h-3" />
                          )}
                          {att.name}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className={`${message.role === "assistant" ? "leading-relaxed text-foreground font-body" : "font-body"} whitespace-pre-line`}>
                    {message.content}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-4">
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 max-w-3xl mx-auto">
                  {attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2 bg-muted rounded-full px-3 py-1">
                      {att.type.startsWith("image/") ? (
                        <Image className="w-4 h-4" />
                      ) : (
                        <Paperclip className="w-4 h-4" />
                      )}
                      <span className="text-sm truncate max-w-[150px]">{att.name}</span>
                      <button
                        onClick={() => removeAttachment(i)}
                        className="text-muted-foreground hover:text-foreground"
                        data-testid={`button-remove-attachment-${i}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 max-w-3xl mx-auto">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, "file")}
                  multiple
                  data-testid="input-file-upload"
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, "image")}
                  multiple
                  data-testid="input-image-upload"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isTyping}
                  data-testid="button-attach-file"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isTyping}
                  data-testid="button-attach-image"
                >
                  <Image className="w-4 h-4" />
                </Button>
                <Button
                  variant={isListening ? "default" : "ghost"}
                  size="icon"
                  onClick={toggleVoiceInput}
                  disabled={isTyping}
                  className={isListening ? "bg-red-500 hover:bg-red-600 animate-pulse" : ""}
                  data-testid="button-voice-input"
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? "Listening..." : (activeCategory ? `Ask about ${activeCategoryData?.name.toLowerCase()}...` : "Ask anything...")}
                  className="resize-none min-h-[44px] max-h-32 rounded-3xl bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
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
                  className="bg-primary"
                  data-testid="button-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <header className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-display font-bold">Life Categories</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen(false)}
              data-testid="button-close-menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </header>
          <ScrollArea className="flex-1 p-6">
            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
              {CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isActive = activeCategory === category.id;
                
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.id)}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl text-center transition-all duration-200 hover-elevate ${
                      isActive 
                        ? "bg-primary/15" 
                        : "bg-muted/50"
                    }`}
                    data-testid={`button-category-${category.id}`}
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isActive ? "bg-primary/20" : "bg-muted"}`}>
                      <Icon className={`w-7 h-7 ${category.color}`} />
                    </div>
                    <div>
                      <p className="font-display font-semibold">{category.name}</p>
                      <p className="text-sm text-muted-foreground mt-1 font-body">{category.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
