import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search,
  Loader2,
  X,
  CheckCircle2,
  Target,
  ListTodo,
  FolderOpen,
  Calendar,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useLocation } from "wouter";

export type UnifiedSearchCategory = "tasks" | "projects" | "routines" | "goals" | "all";

export interface UnifiedSearchResult {
  id: string;
  type: "task" | "project" | "routine" | "goal";
  title: string;
  description?: string | null;
  status?: string;
  dueDate?: string | null;
  isActive?: boolean;
  duration?: number | null;
  progress?: number | null;
  relevanceScore: number;
}

interface UnifiedSearchProps {
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onResultSelect?: (result: UnifiedSearchResult) => void;
}

const typeIcons: Record<string, typeof Target> = {
  task: ListTodo,
  project: FolderOpen,
  routine: Calendar,
  goal: Target,
};

const typeColors: Record<string, string> = {
  task: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  project: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  routine: "bg-green-500/10 text-green-600 dark:text-green-400",
  goal: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

export function UnifiedSearch({
  placeholder = "Search tasks, projects, routines, goals...",
  className = "",
  autoFocus = false,
  onResultSelect,
}: UnifiedSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [activeCategory, setActiveCategory] = useState<UnifiedSearchCategory>("all");
  const [hasSearched, setHasSearched] = useState(false);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  const searchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      const categories = activeCategory === "all" 
        ? ["tasks", "projects", "routines", "goals"] 
        : [activeCategory];
      
      const response = await apiRequest("POST", "/api/search/unified", {
        query: searchQuery,
        categories,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setResults(data.results || []);
      setHasSearched(true);
    },
  });

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSearch = () => {
    if (query.trim()) {
      searchMutation.mutate(query.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    } else if (e.key === "Escape") {
      clearSearch();
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
  };

  const handleResultClick = (result: UnifiedSearchResult) => {
    if (onResultSelect) {
      onResultSelect(result);
    } else {
      // Default navigation behavior
      const routes: Record<string, string> = {
        task: "/systems-hub?tab=tasks",
        project: "/projects",
        routine: "/routines",
        goal: "/goals",
      };
      navigate(routes[result.type] || "/today-hub");
    }
  };

  const filteredResults = activeCategory === "all" 
    ? results 
    : results.filter(r => r.type === activeCategory);

  const resultsByType = {
    tasks: results.filter(r => r.type === "task").length,
    projects: results.filter(r => r.type === "project").length,
    routines: results.filter(r => r.type === "routine").length,
    goals: results.filter(r => r.type === "goal").length,
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pl-9 pr-9"
            data-testid="unified-search-input"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              data-testid="clear-search-button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          onClick={handleSearch}
          disabled={!query.trim() || searchMutation.isPending}
          data-testid="search-button"
        >
          {searchMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </Button>
      </div>

      {searchMutation.isPending && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Searching...</span>
        </div>
      )}

      {hasSearched && !searchMutation.isPending && (
        <>
          <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as UnifiedSearchCategory)}>
            <TabsList className="w-full grid grid-cols-5">
              <TabsTrigger value="all" className="text-xs">
                All ({results.length})
              </TabsTrigger>
              <TabsTrigger value="tasks" className="text-xs">
                Tasks ({resultsByType.tasks})
              </TabsTrigger>
              <TabsTrigger value="projects" className="text-xs">
                Projects ({resultsByType.projects})
              </TabsTrigger>
              <TabsTrigger value="routines" className="text-xs">
                Routines ({resultsByType.routines})
              </TabsTrigger>
              <TabsTrigger value="goals" className="text-xs">
                Goals ({resultsByType.goals})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No results found. Try a different search.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {filteredResults.map((result) => {
                  const Icon = typeIcons[result.type];
                  const colorClass = typeColors[result.type];
                  
                  return (
                    <Card
                      key={`${result.type}-${result.id}`}
                      className="hover-elevate cursor-pointer transition-all"
                      onClick={() => handleResultClick(result)}
                      data-testid={`search-result-${result.type}-${result.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${colorClass}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium text-sm truncate">{result.title}</h4>
                              <Badge variant="outline" className="text-xs capitalize">
                                {result.type}
                              </Badge>
                              {result.status && (
                                <Badge variant="secondary" className="text-xs">
                                  {result.status}
                                </Badge>
                              )}
                            </div>
                            
                            {result.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {result.description}
                              </p>
                            )}

                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              {result.progress !== null && result.progress !== undefined && (
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>{result.progress}% complete</span>
                                </div>
                              )}
                              {result.dueDate && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{new Date(result.dueDate).toLocaleDateString()}</span>
                                </div>
                              )}
                              {result.isActive !== undefined && (
                                <Badge variant={result.isActive ? "default" : "outline"} className="text-xs">
                                  {result.isActive ? "Active" : "Inactive"}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {filteredResults.length > 0 && (
            <p className="text-xs text-center text-muted-foreground">
              Found {filteredResults.length} result{filteredResults.length !== 1 ? "s" : ""} matching "{query}"
            </p>
          )}
        </>
      )}
    </div>
  );
}
