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
  UserPlus,
  Dumbbell,
  Flame,
  Play,
  ExternalLink,
  Shield,
  ArrowLeft,
  History,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@shared/schema";

interface WorkoutExercise {
  name: string;
  sets?: number;
  reps?: string;
  duration?: string;
  notes?: string;
}

interface WorkoutDay {
  day: string;
  focus: string;
  exercises: WorkoutExercise[];
  restDay?: boolean;
}

interface MeditationSuggestion {
  title: string;
  duration: string;
  type: string;
  description: string;
  youtubeUrl?: string;
}

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
  category?: string;
  attachments?: { name: string; type: string; url: string }[];
  workoutPlan?: { plan: WorkoutDay[]; summary: string };
  meditationSuggestions?: MeditationSuggestion[];
}

interface Category {
  id: string;
  name: string;
  icon: typeof Calendar;
  color: string;
  description: string;
}

const DIMENSION_TAGS = [
  { id: "physical", name: "Physical", icon: Heart, color: "text-red-500" },
  { id: "emotional", name: "Emotional", icon: Smile, color: "text-pink-500" },
  { id: "social", name: "Social", icon: Users, color: "text-purple-500" },
  { id: "intellectual", name: "Intellectual", icon: Brain, color: "text-indigo-500" },
  { id: "spiritual", name: "Spiritual", icon: Sun, color: "text-amber-500" },
  { id: "occupational", name: "Occupational", icon: Briefcase, color: "text-sky-500" },
  { id: "environmental", name: "Environmental", icon: Leaf, color: "text-teal-500" },
  { id: "financial", name: "Financial", icon: DollarSign, color: "text-emerald-500" },
];

const STARTER_OPTIONS = [
  { text: "Make a plan", icon: Calendar },
  { text: "Talk things out", icon: Heart },
  { text: "Try a challenge", icon: Target },
  { text: "Browse content", icon: Sparkles },
];

const MENU_ITEMS = [
  { name: "Browse", path: "/browse", icon: Sparkles, description: "Personalized content for you" },
  { name: "Challenges", path: "/challenges", icon: Target, description: "Push yourself to grow" },
  { name: "Talk It Out", path: "/talk", icon: Heart, description: "Process feelings and gain clarity" },
  { name: "Calendar", path: "/calendar", icon: Calendar, description: "Your schedule and events" },
  { name: "Blueprint", path: "/blueprint", icon: Shield, description: "Your 8 dimensions of wellness" },
];

const CATEGORIES: Category[] = DIMENSION_TAGS.map(d => ({
  ...d,
  description: `Filter by ${d.name.toLowerCase()} wellness`,
}));

const DEFAULT_WELCOME = "";

export function AIWorkspace() {
  const { toast } = useToast();
  const { mood, themeMode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moodPickerOpen, setMoodPickerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [input, setInput] = useState("");

  const { data: userProfile } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
  });
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
    return [];
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
      const response = await apiRequest("POST", "/api/chat/smart", {
        message,
        context: activeCategory,
        conversationHistory: messages.slice(-10),
        attachments,
        userProfile: userProfile || undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      const newMessage: ChatMessage = {
        role: "assistant",
        content: data.response,
        category: activeCategory || undefined,
      };
      
      if (data.workoutPlan) {
        newMessage.workoutPlan = data.workoutPlan;
      }
      if (data.meditationSuggestions) {
        newMessage.meditationSuggestions = data.meditationSuggestions;
      }
      
      setMessages((prev) => [...prev, newMessage]);
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

  return (
    <div 
      className="flex flex-col h-screen w-full transition-colors duration-700 font-body living-bg"
      style={{
        background: mood && themeMode === "full-background" 
          ? `linear-gradient(135deg, hsl(var(--mood-bg-start)) 0%, hsl(var(--mood-bg-end)) 50%, hsl(var(--mood-bg-start)) 100%)`
          : `linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--card)) 50%, hsl(var(--background)) 100%)`
      }}
    >
      <header className="flex items-center justify-between gap-4 p-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(!menuOpen)}
            data-testid="button-menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <button 
            onClick={() => setMoodPickerOpen(true)}
            className="flex items-center gap-2 group"
            data-testid="button-energy-ring"
          >
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 energy-ring shadow-lg cursor-pointer"
              style={{ 
                background: currentMood 
                  ? `linear-gradient(135deg, ${currentMood.color}, ${currentMood.color}80)` 
                  : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
                boxShadow: currentMood 
                  ? `0 0 20px ${currentMood.color}40` 
                  : '0 0 20px hsl(var(--primary) / 0.3)'
              }}
            >
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight" data-testid="text-brand">DWAI</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="default" size="sm" className="rounded-full shadow-md" data-testid="button-signup">
              <UserPlus className="w-4 h-4 mr-1" />
              Sign up
            </Button>
          </Link>
        </div>
      </header>
      
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setMenuOpen(false)}>
          <div 
            className="absolute left-0 top-0 h-full w-72 bg-background border-r p-4 animate-slide-in-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <span className="font-display font-bold text-lg">Menu</span>
              <Button variant="ghost" size="icon" onClick={() => setMenuOpen(false)} data-testid="button-close-menu">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-2">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.path} href={item.path}>
                    <button
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover-elevate text-left"
                      onClick={() => setMenuOpen(false)}
                      data-testid={`menu-item-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-display font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground font-body">{item.description}</div>
                      </div>
                    </button>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
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
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 space-y-8 animate-fade-in-up">
                <div className="text-center space-y-4 max-w-lg">
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto energy-ring"
                    style={{ 
                      background: currentMood 
                        ? `linear-gradient(135deg, ${currentMood.color}, ${currentMood.color}80)` 
                        : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))'
                    }}
                  >
                    <Sparkles className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-display font-bold mt-6">
                    What do you feel like you need today?
                  </h2>
                  <p className="text-muted-foreground font-body">
                    Or do you want help figuring that out?
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                  {STARTER_OPTIONS.map((option, idx) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setInput(option.text);
                          inputRef.current?.focus();
                        }}
                        className="flex items-center gap-3 p-4 rounded-2xl bg-card/60 hover-elevate transition-all text-left floating-surface"
                        data-testid={`button-option-${idx}`}
                      >
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <span className="font-body text-sm">{option.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex animate-fade-in-up ${message.role === "user" ? "justify-end" : "justify-start"}`}
                style={{ animationDelay: `${Math.min(index * 50, 200)}ms` }}
              >
                <div
                  className={`max-w-[85%] ${
                    message.role === "user"
                      ? "bg-primary/90 text-primary-foreground px-5 py-3 rounded-3xl shadow-md"
                      : "bg-card/60 px-5 py-4 rounded-3xl floating-surface"
                  }`}
                  data-testid={`message-chat-${index}`}
                >
                  {message.category && message.role === "assistant" && (
                    <Badge variant="secondary" className="mb-2 text-xs bg-muted/50">
                      {CATEGORIES.find((c) => c.id === message.category)?.name}
                    </Badge>
                  )}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {message.attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-1 bg-muted/50 rounded-full px-2 py-1 text-xs">
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
                  <p className={`${message.role === "assistant" ? "leading-relaxed text-foreground/90 font-body" : "font-body"} whitespace-pre-line`}>
                    {message.content}
                  </p>
                  
                  {message.workoutPlan && (
                    <div className="mt-4 space-y-3" data-testid="workout-plan-display">
                      <div className="flex items-center gap-2 text-sm font-display font-semibold text-foreground">
                        <Dumbbell className="w-4 h-4 text-primary" />
                        Your 7-Day Workout Plan
                      </div>
                      <p className="text-sm text-muted-foreground font-body">{message.workoutPlan.summary}</p>
                      <div className="grid grid-cols-1 gap-2 mt-3">
                        {message.workoutPlan.plan.map((day, dayIdx) => (
                          <div
                            key={dayIdx}
                            className={`p-3 rounded-2xl ${day.restDay ? "bg-muted/30" : "bg-primary/5"} border border-foreground/5`}
                            data-testid={`workout-day-${dayIdx}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="font-display font-semibold text-sm">{day.day}</span>
                              <Badge variant="secondary" className="text-xs">
                                {day.restDay ? "Rest" : day.focus}
                              </Badge>
                            </div>
                            {!day.restDay && day.exercises.length > 0 && (
                              <div className="space-y-1">
                                {day.exercises.map((ex, exIdx) => (
                                  <div key={exIdx} className="flex items-center gap-2 text-xs text-muted-foreground font-body">
                                    <Flame className="w-3 h-3 text-orange-500" />
                                    <span className="font-medium text-foreground">{ex.name}</span>
                                    {ex.sets && ex.reps && <span>{ex.sets} x {ex.reps}</span>}
                                    {ex.duration && <span>{ex.duration}</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                            {day.restDay && (
                              <p className="text-xs text-muted-foreground font-body">Take a break and let your body recover.</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {message.meditationSuggestions && message.meditationSuggestions.length > 0 && (
                    <div className="mt-4 space-y-3" data-testid="meditation-suggestions-display">
                      <div className="flex items-center gap-2 text-sm font-display font-semibold text-foreground">
                        <Sun className="w-4 h-4 text-amber-500" />
                        Meditation Suggestions
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {message.meditationSuggestions.map((med, medIdx) => (
                          <div
                            key={medIdx}
                            className="p-3 rounded-2xl bg-amber-500/5 border border-foreground/5"
                            data-testid={`meditation-suggestion-${medIdx}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-display font-semibold text-sm">{med.title}</span>
                                  <Badge variant="secondary" className="text-xs">{med.duration}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground font-body mb-2">{med.description}</p>
                                {med.youtubeUrl && (
                                  <a
                                    href={med.youtubeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-body"
                                    data-testid={`link-meditation-youtube-${medIdx}`}
                                  >
                                    <Play className="w-3 h-3" />
                                    Watch on YouTube
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {message.role === "assistant" && index === messages.length - 1 && !isTyping && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-foreground/5">
                      <Button variant="ghost" size="sm" className="text-xs rounded-full bg-muted/30" data-testid="button-action-continue">
                        Tell me more
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs rounded-full bg-muted/30" data-testid="button-action-save">
                        Save this
                      </Button>
                    </div>
                  )}
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
                  className="resize-none min-h-[44px] max-h-32 rounded-3xl bg-card/60 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 floating-surface shadow-sm"
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
                  className="rounded-full shadow-md"
                  data-testid="button-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div 
          className="fixed inset-0 z-50 flex flex-col living-bg"
          style={{
            background: mood && themeMode === "full-background" 
              ? `linear-gradient(135deg, hsl(var(--mood-bg-start)) 0%, hsl(var(--mood-bg-end)) 50%, hsl(var(--mood-bg-start)) 100%)`
              : `linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--card)) 50%, hsl(var(--background)) 100%)`
          }}
        >
          <header className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg energy-ring">
                <Sparkles className="h-5 w-5 text-white" />
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
            <div className="max-w-2xl mx-auto space-y-6">
              <Link href="/blueprint" onClick={() => setMenuOpen(false)}>
                <button
                  className="w-full flex items-center gap-4 p-5 rounded-3xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 shadow-lg hover-elevate transition-all duration-300 animate-fade-in-up floating-surface"
                  data-testid="button-blueprint-link"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-display font-semibold text-lg">Wellness Blueprint</p>
                    <p className="text-sm text-muted-foreground font-body">Your personal wellness framework</p>
                  </div>
                </button>
              </Link>
              
              <div className="grid grid-cols-2 gap-4">
              {CATEGORIES.map((category, catIndex) => {
                const Icon = category.icon;
                const isActive = activeCategory === category.id;
                
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.id)}
                    className={`flex flex-col items-center gap-3 p-6 rounded-3xl text-center transition-all duration-300 hover-elevate animate-fade-in-up floating-surface ${
                      isActive 
                        ? "bg-primary/15 shadow-lg" 
                        : "bg-card/40 shadow-md"
                    }`}
                    style={{ animationDelay: `${catIndex * 30}ms` }}
                    data-testid={`button-category-${category.id}`}
                  >
                    <div 
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? "shadow-lg" : "shadow-md"}`}
                      style={{ 
                        background: isActive 
                          ? `linear-gradient(135deg, ${category.color.replace('text-', '')}20, ${category.color.replace('text-', '')}40)` 
                          : 'hsl(var(--muted))' 
                      }}
                    >
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
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
