import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  Loader2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  X,
  Sparkles 
} from "lucide-react";

export type SearchCategory = "meals" | "workouts" | "recovery" | "spiritual" | "community";

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  duration?: string;
  tags: string[];
  details?: string[];
  source: "ai-generated";
  category: SearchCategory;
}

interface InAppSearchProps {
  category: SearchCategory;
  placeholder?: string;
  onResultSelect?: (result: SearchResult) => void;
  onResultSave?: (result: SearchResult) => void;
  className?: string;
}

export function InAppSearch({ 
  category, 
  placeholder, 
  onResultSelect,
  onResultSave,
  className = "" 
}: InAppSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      const response = await apiRequest("POST", "/api/search", {
        query: searchQuery,
        category,
        limit: 5
      });
      return response.json();
    },
    onSuccess: (data) => {
      setResults(data.results || []);
      setHasSearched(true);
    }
  });

  const handleSearch = () => {
    if (query.trim()) {
      searchMutation.mutate(query.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setExpandedId(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const defaultPlaceholders: Record<SearchCategory, string> = {
    meals: "Search recipes, meal ideas...",
    workouts: "Search workouts, exercises...",
    recovery: "Search stretches, recovery routines...",
    spiritual: "Search prayers, practices...",
    community: "Search resources, support services..."
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || defaultPlaceholders[category]}
            className="pl-9 pr-9"
            data-testid={`input-search-${category}`}
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              data-testid={`button-clear-search-${category}`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button 
          onClick={handleSearch} 
          disabled={!query.trim() || searchMutation.isPending}
          data-testid={`button-search-${category}`}
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
          <span className="text-sm">Finding results...</span>
        </div>
      )}

      {hasSearched && !searchMutation.isPending && results.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No results found. Try a different search.</p>
        </div>
      )}

      {results.length > 0 && (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {results.map((result) => (
              <Card 
                key={result.id} 
                className="hover-elevate cursor-pointer"
                data-testid={`card-search-result-${result.id}`}
              >
                <CardContent className="p-3">
                  <div 
                    className="flex items-start justify-between gap-2"
                    onClick={() => toggleExpand(result.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm">{result.title}</h4>
                        {result.duration && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {result.duration}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {result.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {result.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs capitalize">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="flex-shrink-0"
                      data-testid={`button-expand-${result.id}`}
                    >
                      {expandedId === result.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {expandedId === result.id && result.details && result.details.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Details:</p>
                      <ul className="space-y-1">
                        {result.details.map((detail, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex gap-2 mt-3">
                        {onResultSelect && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onResultSelect(result);
                            }}
                            data-testid={`button-view-${result.id}`}
                          >
                            View Details
                          </Button>
                        )}
                        {onResultSave && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onResultSave(result);
                            }}
                            data-testid={`button-save-${result.id}`}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {hasSearched && results.length > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          Results generated by AI based on your search
        </p>
      )}
    </div>
  );
}
