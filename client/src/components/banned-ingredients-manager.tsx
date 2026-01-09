import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  X, 
  Plus, 
  Ban, 
  AlertTriangle,
  Sparkles,
  Check
} from "lucide-react";
import { 
  getBannedIngredients, 
  addBannedIngredient, 
  removeBannedIngredient,
  getAllExcludedIngredients,
  getMealPrepPreferences
} from "@/lib/guest-storage";
import { useToast } from "@/hooks/use-toast";

const COMMON_ALLERGENS = [
  "peanuts", "tree nuts", "milk", "eggs", "wheat", "soy", "fish", "shellfish",
  "sesame", "gluten"
];

const COMMON_DIETARY_EXCLUSIONS = [
  "meat", "pork", "beef", "chicken", "dairy", "sugar", "salt", "oil",
  "alcohol", "caffeine", "processed foods", "artificial sweeteners"
];

interface BannedIngredientsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function BannedIngredientsManager({
  open,
  onOpenChange,
  onUpdate
}: BannedIngredientsManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [bannedList, setBannedList] = useState<string[]>(getBannedIngredients());
  const { toast } = useToast();

  const prefs = getMealPrepPreferences();
  const allergies = prefs?.allergies || [];
  const disliked = prefs?.dislikedIngredients || [];

  const handleAddIngredient = (ingredient: string) => {
    const normalized = ingredient.toLowerCase().trim();
    if (!normalized) return;
    
    if (bannedList.includes(normalized)) {
      toast({ title: "Already excluded", description: `${ingredient} is already on your exclusion list` });
      return;
    }
    
    addBannedIngredient(normalized);
    setBannedList(getBannedIngredients());
    setSearchQuery("");
    toast({ title: "Ingredient excluded", description: `${ingredient} will be excluded from AI suggestions` });
    onUpdate?.();
  };

  const handleRemoveIngredient = (ingredient: string) => {
    removeBannedIngredient(ingredient);
    setBannedList(getBannedIngredients());
    toast({ title: "Ingredient removed", description: `${ingredient} removed from exclusion list` });
    onUpdate?.();
  };

  const filteredSuggestions = [...COMMON_ALLERGENS, ...COMMON_DIETARY_EXCLUSIONS]
    .filter(item => 
      item.toLowerCase().includes(searchQuery.toLowerCase()) && 
      !bannedList.includes(item.toLowerCase()) &&
      !allergies.includes(item.toLowerCase()) &&
      !disliked.includes(item.toLowerCase())
    )
    .slice(0, 6);

  const allExcluded = getAllExcludedIngredients();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            Excluded Ingredients
          </DialogTitle>
          <DialogDescription>
            Search and add ingredients you want to avoid in all meal suggestions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    handleAddIngredient(searchQuery);
                  }
                }}
                placeholder="Search ingredient to exclude..."
                className="pl-9"
                data-testid="input-search-banned-ingredient"
              />
            </div>
            <Button 
              onClick={() => handleAddIngredient(searchQuery)}
              disabled={!searchQuery.trim()}
              data-testid="button-add-banned-ingredient"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {searchQuery && filteredSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {filteredSuggestions.map((item) => (
                <Badge
                  key={item}
                  variant="outline"
                  className="cursor-pointer hover-elevate"
                  onClick={() => handleAddIngredient(item)}
                  data-testid={`badge-suggestion-${item}`}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {item}
                </Badge>
              ))}
            </div>
          )}

          <ScrollArea className="max-h-[300px]">
            <div className="space-y-3">
              {bannedList.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Ban className="h-3 w-3" />
                    Banned Ingredients ({bannedList.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {bannedList.map((item) => (
                      <Badge
                        key={item}
                        variant="destructive"
                        className="cursor-pointer"
                        onClick={() => handleRemoveIngredient(item)}
                        data-testid={`badge-banned-${item}`}
                      >
                        {item}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {allergies.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Allergies (from profile)
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {allergies.map((item) => (
                      <Badge key={item} variant="secondary" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {disliked.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Disliked (from profile)
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {disliked.map((item) => (
                      <Badge key={item} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {allExcluded.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Ban className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No ingredients excluded yet</p>
                  <p className="text-xs">Search above to add ingredients to avoid</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              All excluded ingredients will be automatically filtered from AI meal suggestions and searches.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface BannedIngredientsButtonProps {
  className?: string;
}

export function BannedIngredientsButton({ className }: BannedIngredientsButtonProps) {
  const [open, setOpen] = useState(false);
  const bannedCount = getAllExcludedIngredients().length;

  return (
    <>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setOpen(true)}
        className={className}
        data-testid="button-manage-banned-ingredients"
      >
        <Ban className="h-4 w-4 mr-1" />
        Exclude Ingredients
        {bannedCount > 0 && (
          <Badge variant="secondary" className="ml-1 text-xs">
            {bannedCount}
          </Badge>
        )}
      </Button>
      <BannedIngredientsManager open={open} onOpenChange={setOpen} />
    </>
  );
}
