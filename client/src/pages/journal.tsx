import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { 
  BookOpen, 
  Plus, 
  Calendar, 
  Search,
  Trash2,
  Edit3,
  Save,
  X,
  Sparkles,
  ChevronRight,
  Wind,
  Wand2,
  Tag,
  Brain,
} from "lucide-react";
import { format } from "date-fns";
import { consumeHighlightNext } from "@/lib/momentum";
import { usePageMeta } from "@/hooks/use-page-meta";
import { getOnboardingLogs, type OnboardingLog } from "@/lib/guest-storage";
import { useTutorialStart } from "@/contexts/tutorial-context";
import { isFeatureEnabled } from "@/config/featureFlags";
import { useDwIntelligence } from "@/hooks/use-dw-intelligence";
import { 
  detectJournalCategory, 
  generateJournalTitle, 
  JOURNAL_CATEGORIES, 
  getCategoryInfo,
  getCategoryPrompts,
  type JournalCategory 
} from "@/lib/journal-ai";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";

const JOURNAL_STORAGE_KEY = "dw_journal_entries";

interface DwJournalRecord {
  id: string;
  title: string;
  story: string;
  tags: string[];
  createdAt: string | number;
}

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood?: string;
  category?: JournalCategory;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface DwAiJournalEntry {
  id: string;
  title: string;
  story: string;
  quotes?: string[];
  tags?: string[];
  createdAt: string;
}

const MOOD_OPTIONS = [
  { label: "Peaceful", value: "peaceful" },
  { label: "Grateful", value: "grateful" },
  { label: "Energized", value: "energized" },
  { label: "Reflective", value: "reflective" },
  { label: "Uncertain", value: "uncertain" },
  { label: "Heavy", value: "heavy" },
];

const JOURNAL_PROMPTS = [
  "What am I grateful for today?",
  "What's weighing on my mind right now?",
  "What would make today feel complete?",
  "What did I learn about myself recently?",
  "What small win can I celebrate?",
  "What do I need to let go of?",
];

function getStoredEntries(): JournalEntry[] {
  try {
    const stored = localStorage.getItem(JOURNAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: JournalEntry[]): void {
  localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
}

export default function JournalPage() {
  usePageMeta("Journal", "Write, reflect, and capture your daily thoughts and insights.");
  useTutorialStart("journal", 1000);
  const dwInsightJournalEnabled = isFeatureEnabled("DW_INSIGHT_JOURNAL");
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);

  // DW AI Journal Entries (flag-gated, auth only)
  const { data: dwAiJournalData } = useQuery<DwAiJournalEntry[] | null>({
    queryKey: ['/api/dw/journalEntries'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoggedIn && dwInsightJournalEnabled,
    retry: false,
  });
  const dwAiJournalEntries = dwAiJournalData ?? [];
  const [activeJournalTab, setActiveJournalTab] = useState<"my-entries" | "dw-journal" | "dw-insights">("my-entries");

  // Load DW Conversation Insights from localStorage (written by Talk It Out)
  const [dwConvInsights, setDwConvInsights] = useState<Array<{
    id: string; createdAt: number; title: string; summary: string; category: string;
  }>>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("dw_conversation_insights");
      if (raw) setDwConvInsights(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [activeJournalTab]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<string>("");
  const [category, setCategory] = useState<JournalCategory>("general");
  const [autoDetectedCategory, setAutoDetectedCategory] = useState<JournalCategory | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [momentumLogs, setMomentumLogs] = useState<OnboardingLog[]>([]);
  const [pendingHighlightId, setPendingHighlightId] = useState<string | null>(null);
  const highlightProcessedRef = useRef(false);

  // DW Intelligence AI-generated journal entries
  const dwIntelligenceOn = isFeatureEnabled("JOURNAL_AUTOGEN");
  useDwIntelligence();
  const dwJournalEntries: DwJournalRecord[] = [];
  const dwLoading = false;

  useEffect(() => {
    setEntries(getStoredEntries());
    
    const logs = getOnboardingLogs().filter(log => 
      log.type === "grounding_practice" && 
      log.dimensionTags?.some(t => t === "mind" || t === "emotional") &&
      log.backgroundContext?.includes("momentum")
    );
    setMomentumLogs(logs);
    
    const highlight = consumeHighlightNext("/journal");
    if (highlight) {
      setPendingHighlightId(highlight.id);
    }
  }, []);
  
  useEffect(() => {
    if (!pendingHighlightId || highlightProcessedRef.current) return;
    
    // Priority: momentumLogs first, then filteredEntries (if not found in momentumLogs)
    const foundInMomentumLogs = momentumLogs.some(l => l.id === pendingHighlightId);
    const foundInEntries = entries.some(e => e.id === pendingHighlightId);
    
    if (foundInMomentumLogs || foundInEntries) {
      highlightProcessedRef.current = true;
      setHighlightedId(pendingHighlightId);
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      setTimeout(() => {
        setHighlightedId(null);
        setPendingHighlightId(null);
      }, 3000);
    }
  }, [momentumLogs, entries, pendingHighlightId]);

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = searchQuery === "" || 
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesMood = !selectedMoodFilter || entry.mood === selectedMoodFilter;
    return matchesSearch && matchesMood;
  });

  const handleNewEntry = () => {
    setEditingEntry(null);
    setTitle("");
    setContent("");
    setMood("");
    setCategory("general");
    setAutoDetectedCategory(null);
    setTags([]);
    setShowEditor(true);
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setTitle(entry.title);
    setContent(entry.content);
    setMood(entry.mood || "");
    setCategory(entry.category || "general");
    setAutoDetectedCategory(null);
    setTags(entry.tags);
    setShowEditor(true);
  };

  // Auto-detect category when content changes
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    
    if (newContent.trim().length > 20) {
      const detected = detectJournalCategory(newContent);
      setAutoDetectedCategory(detected);
      
      // Auto-set category if user hasn't manually changed it
      if (!editingEntry) {
        setCategory(detected);
      }
    }
  };

  // Auto-generate title suggestion
  const handleGenerateTitle = () => {
    if (content.trim()) {
      const suggested = generateJournalTitle(content, category);
      setTitle(suggested);
    }
  };

  const handleDeleteEntry = (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    saveEntries(updated);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSaveEntry = () => {
    if (!content.trim()) return;

    // Auto-generate title if empty
    const finalTitle = title.trim() || generateJournalTitle(content, category);
    
    const now = new Date().toISOString();
    
    if (editingEntry) {
      const updated = entries.map(e => 
        e.id === editingEntry.id 
          ? { ...e, title: finalTitle, content: content.trim(), mood, category, tags, updatedAt: now }
          : e
      );
      setEntries(updated);
      saveEntries(updated);
    } else {
      const newEntry: JournalEntry = {
        id: `entry_${Date.now()}`,
        title: finalTitle,
        content: content.trim(),
        mood,
        category,
        tags,
        createdAt: now,
        updatedAt: now,
      };
      const updated = [newEntry, ...entries];
      setEntries(updated);
      saveEntries(updated);
    }

    setShowEditor(false);
    setEditingEntry(null);
  };

  const handlePromptClick = (prompt: string) => {
    setContent(prompt);
    handleContentChange(prompt);
  };

  const todayEntries = entries.filter(e => {
    const entryDate = new Date(e.createdAt).toDateString();
    return entryDate === new Date().toDateString();
  });

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader title="Journal" />
      
      <ScrollArea className="flex-1 overflow-auto">
        <div className="p-4 max-w-2xl mx-auto space-y-6 pb-8">
          <Tabs
            value={activeJournalTab}
            onValueChange={(v) => setActiveJournalTab(v as "my-entries" | "dw-journal" | "dw-insights")}
            className="w-full"
          >
            <TabsList className={`grid w-full ${dwInsightJournalEnabled ? "grid-cols-3" : "grid-cols-2"}`}>
              <TabsTrigger value="my-entries">My Entries</TabsTrigger>
              {dwInsightJournalEnabled && (
                <TabsTrigger value="dw-journal">DW Journal</TabsTrigger>
              )}
              <TabsTrigger value="dw-insights" className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Insights
              </TabsTrigger>
            </TabsList>

            {/* DW Journal tab — backend entries, flag-gated */}
            {dwInsightJournalEnabled && (
              <TabsContent value="dw-journal" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      DW Journal Entries
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!isLoggedIn ? (
                      <p className="text-muted-foreground text-center py-8">
                        Sign in to see your DW journal entries
                      </p>
                    ) : dwAiJournalEntries.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No DW journal entries yet — have a conversation with DW to generate your first reflective journal entry
                      </p>
                    ) : (
                      dwAiJournalEntries.map((entry) => (
                        <div key={entry.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm leading-snug">{entry.title}</p>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {format(new Date(entry.createdAt), "MMM d, yyyy")}
                            </span>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed">{entry.story}</p>
                          {Array.isArray(entry.quotes) && entry.quotes.length > 0 && (
                            <div className="space-y-1">
                              {entry.quotes.map((q, i) => (
                                <p key={i} className="text-xs border-l-2 border-primary/30 pl-2 text-muted-foreground italic">
                                  "{q}"
                                </p>
                              ))}
                            </div>
                          )}
                          {Array.isArray(entry.tags) && entry.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {entry.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-[10px] py-0">
                                  <Tag className="h-2.5 w-2.5 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* ── DW Conversation Insights tab — always visible, reads from localStorage ── */}
            <TabsContent value="dw-insights" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                    What DW Has Gathered
                  </CardTitle>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Patterns and themes DW noticed in your conversations — small truths worth sitting with.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dwConvInsights.length === 0 ? (
                    <div className="text-center py-10 space-y-3">
                      <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/30" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">No insights captured yet</p>
                        <p className="text-xs text-muted-foreground/60 mt-1 max-w-[220px] mx-auto">
                          Talk with DW — insights appear here as patterns emerge from your conversations
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dwConvInsights.map((ins) => (
                        <div key={ins.id} className="border border-border rounded-xl p-4 space-y-3 bg-card">
                          {/* Title + category badge */}
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-sm text-foreground leading-snug">{ins.title}</p>
                            <Badge variant="secondary" className="shrink-0 text-xs capitalize">
                              <Tag className="h-2.5 w-2.5 mr-1" />
                              {ins.category}
                            </Badge>
                          </div>

                          {/* Summary */}
                          <p className="text-sm text-foreground/80 leading-relaxed">{ins.summary}</p>

                          {/* Go deeper prompt */}
                          <div className="rounded-lg bg-muted/50 px-3 py-2.5 space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Go deeper</p>
                            <p className="text-xs text-muted-foreground/80 leading-relaxed italic">
                              What does this pattern reveal about what you value most? Where in your life do you see it playing out?
                            </p>
                          </div>

                          {/* Date */}
                          <p className="text-xs text-muted-foreground/50">
                            {new Date(ins.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* My Entries tab content — always present */}
            <TabsContent value="my-entries">
              {/* spacer – actual entries rendered below outside tabs */}
            </TabsContent>
          </Tabs>

          {/* Manual journal UI — shown on "My Entries" tab */}
          {activeJournalTab === "my-entries" && (
            <>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-journal-search"
              />
            </div>
            <Button onClick={handleNewEntry} data-testid="button-new-entry">
              <Plus className="w-4 h-4 mr-2" />
              New Entry
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Badge
              variant={selectedMoodFilter === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedMoodFilter(null)}
            >
              All
            </Badge>
            {MOOD_OPTIONS.map(m => (
              <Badge
                key={m.value}
                variant={selectedMoodFilter === m.value ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedMoodFilter(m.value)}
              >
                {m.label}
              </Badge>
            ))}
          </div>
          
          {momentumLogs.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wind className="w-4 h-4" />
                Reset Practices
              </h2>
              {momentumLogs.map(log => {
                const isHighlighted = highlightedId === log.id;
                return (
                  <div 
                    key={log.id}
                    ref={isHighlighted ? highlightRef : undefined}
                    data-testid={`momentum-log-${log.id}`}
                  >
                    <Card className={`transition-all duration-500 ${isHighlighted ? "ring-2 ring-primary bg-primary/5" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {isHighlighted && <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground">{log.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{log.content}</p>
                            {log.actionStep && (
                              <p className="text-xs text-muted-foreground mt-2 italic">{log.actionStep}</p>
                            )}
                          </div>
                          <Badge variant="secondary" className="shrink-0">Reset</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}

          {todayEntries.length === 0 && entries.length > 0 && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">No entry today yet</p>
                  <p className="text-xs text-muted-foreground">Taking a moment to reflect can help you feel more grounded.</p>
                </div>
                <Button size="sm" variant="outline" onClick={handleNewEntry}>
                  Write
                </Button>
              </CardContent>
            </Card>
          )}

          {entries.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center space-y-4">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="font-medium mb-1 text-foreground">Start Your Journal</h3>
                  <p className="text-sm text-muted-foreground">
                    Capture your thoughts, track your moods, and reflect on your journey.
                  </p>
                </div>
                <Button onClick={handleNewEntry}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Entry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* DW Intelligence – AI-generated journal entries */}
          {dwIntelligenceOn && (
            <DwJournalSection entries={dwJournalEntries} isLoading={dwLoading} />
          )}

          <div className="space-y-3">
            {filteredEntries.map(entry => {
              const isHighlighted = highlightedId === entry.id;
              return (
                <div
                  key={entry.id}
                  ref={isHighlighted ? highlightRef : undefined}
                >
                  <Card 
                    className={`hover-elevate cursor-pointer transition-all duration-500 ${isHighlighted ? "ring-2 ring-primary bg-primary/5" : ""}`} 
                    data-testid={`card-entry-${entry.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0" onClick={() => handleEditEntry(entry)}>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {isHighlighted && <Sparkles className="w-4 h-4 text-primary shrink-0" />}
                            {entry.category && (
                              <span className="text-sm">{getCategoryInfo(entry.category).emoji}</span>
                            )}
                            <h4 className="font-medium truncate text-foreground">{entry.title}</h4>
                            {entry.mood && (
                              <Badge variant="secondary" className="text-xs">
                                {MOOD_OPTIONS.find(m => m.value === entry.mood)?.label || entry.mood}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {entry.content}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(entry.createdAt), "MMM d, yyyy")}
                            </span>
                            {entry.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditEntry(entry)}
                            data-testid={`button-edit-${entry.id}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteEntry(entry.id)}
                            data-testid={`button-delete-${entry.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          {filteredEntries.length === 0 && entries.length > 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No entries match your search</p>
            </div>
          )}
            </>
          )}
        </div>
      </ScrollArea>

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Edit Entry" : "New Journal Entry"}</DialogTitle>
            <DialogDescription>
              {editingEntry ? "Update your thoughts" : "What's on your mind?"}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 py-2">
              {!editingEntry && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Quick prompts</p>
                  <div className="flex flex-wrap gap-2">
                    {getCategoryPrompts(category).map((prompt, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="cursor-pointer hover-lift text-xs"
                        onClick={() => handlePromptClick(prompt)}
                      >
                        {prompt}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Title (auto-generated if empty)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    data-testid="input-entry-title"
                    className="flex-1"
                  />
                  {content.trim() && (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={handleGenerateTitle}
                      title="Generate title from content"
                    >
                      <Wand2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Category Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Category
                  {autoDetectedCategory && autoDetectedCategory !== category && (
                    <Badge variant="outline" className="text-xs">
                      Detected: {getCategoryInfo(autoDetectedCategory).emoji} {getCategoryInfo(autoDetectedCategory).label}
                    </Badge>
                  )}
                </label>
                <Select value={category} onValueChange={(value) => setCategory(value as JournalCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOURNAL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <span>{cat.emoji}</span>
                          <div>
                            <div className="font-medium">{cat.label}</div>
                            <div className="text-xs text-muted-foreground">{cat.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Textarea
                  placeholder="Write your thoughts..."
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="min-h-[200px]"
                  data-testid="input-entry-content"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">How are you feeling?</p>
                <div className="flex flex-wrap gap-2">
                  {MOOD_OPTIONS.map(m => (
                    <Badge
                      key={m.value}
                      variant={mood === m.value ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setMood(mood === m.value ? "" : m.value)}
                    >
                      {m.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Tags</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                    className="flex-1"
                    data-testid="input-entry-tag"
                  />
                  <Button variant="outline" size="sm" onClick={handleAddTag}>
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map(tag => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        {tag}
                        <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Button
                className="w-full"
                onClick={handleSaveEntry}
                disabled={!title.trim() || !content.trim()}
                data-testid="button-save-entry"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingEntry ? "Update Entry" : "Save Entry"}
              </Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── DW Intelligence Journal Section ──────────────────────────────────────────

function DwJournalSection({ entries, isLoading }: { entries: DwJournalRecord[]; isLoading: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isLoading && entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Brain className="w-4 h-4 text-violet-500" />
        DW-Generated Reflections
      </h2>

      {isLoading ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Generating your reflections…</p>
          </CardContent>
        </Card>
      ) : (
        entries.map((entry) => {
          const isExpanded = expandedId === entry.id;
          const date = typeof entry.createdAt === "number"
            ? new Date(entry.createdAt)
            : new Date(entry.createdAt);
          return (
            <Card
              key={entry.id}
              className="border border-violet-500/20 hover:border-violet-500/40 transition-colors"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Brain className="h-3.5 w-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
                    <h4 className="text-sm font-medium leading-tight line-clamp-2">{entry.title}</h4>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {format(date, "MMM d")}
                  </span>
                </div>

                <p className={`text-xs text-muted-foreground leading-relaxed italic ${isExpanded ? "" : "line-clamp-3"}`}>
                  {entry.story}
                </p>

                {entry.story.length > 200 && (
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="text-[11px] text-violet-500 hover:text-violet-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? "Show less" : "Read more"}
                  </button>
                )}

                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-violet-500/10 text-violet-600 dark:text-violet-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
