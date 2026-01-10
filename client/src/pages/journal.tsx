import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
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
  Wind
} from "lucide-react";
import { format } from "date-fns";
import { consumeHighlightNext } from "@/lib/momentum";
import { getOnboardingLogs, type OnboardingLog } from "@/lib/guest-storage";

const JOURNAL_STORAGE_KEY = "fts_journal_entries";

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
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
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [momentumLogs, setMomentumLogs] = useState<OnboardingLog[]>([]);
  const [pendingHighlightId, setPendingHighlightId] = useState<string | null>(null);
  const highlightProcessedRef = useRef(false);

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
    setTags([]);
    setShowEditor(true);
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setTitle(entry.title);
    setContent(entry.content);
    setMood(entry.mood || "");
    setTags(entry.tags);
    setShowEditor(true);
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
    if (!title.trim() || !content.trim()) return;

    const now = new Date().toISOString();
    
    if (editingEntry) {
      const updated = entries.map(e => 
        e.id === editingEntry.id 
          ? { ...e, title: title.trim(), content: content.trim(), mood, tags, updatedAt: now }
          : e
      );
      setEntries(updated);
      saveEntries(updated);
    } else {
      const newEntry: JournalEntry = {
        id: `entry_${Date.now()}`,
        title: title.trim(),
        content: content.trim(),
        mood,
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
    setContent(prompt + "\n\n");
  };

  const todayEntries = entries.filter(e => {
    const entryDate = new Date(e.createdAt).toDateString();
    return entryDate === new Date().toDateString();
  });

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Journal" />
      
      <ScrollArea className="h-[calc(100vh-57px)]">
        <div className="p-4 max-w-2xl mx-auto space-y-6 pb-8">
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
                            <h4 className="font-medium">{log.title}</h4>
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
                  <p className="text-sm font-medium">No entry today yet</p>
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
                  <h3 className="font-medium mb-1">Start Your Journal</h3>
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
                            <h4 className="font-medium truncate">{entry.title}</h4>
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
                    {JOURNAL_PROMPTS.map((prompt, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="cursor-pointer hover-elevate"
                        onClick={() => handlePromptClick(prompt)}
                      >
                        {prompt.slice(0, 30)}...
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Input
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="input-entry-title"
                />
              </div>

              <div className="space-y-2">
                <Textarea
                  placeholder="Write your thoughts..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[150px] resize-none"
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
