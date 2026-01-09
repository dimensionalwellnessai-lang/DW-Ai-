import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowRightLeft, Sparkles, Check, Info } from "lucide-react";

interface IngredientAlternative {
  name: string;
  ratio: string;
  notes: string;
}

interface IngredientSubstituteData {
  ingredient: string;
  alternatives: IngredientAlternative[];
  reason: string;
}

interface IngredientSubstitutesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredient: string;
  context?: string;
  excludedIngredients?: string[];
  onSelectSubstitute?: (original: string, substitute: string) => void;
}

export function IngredientSubstitutesDialog({
  open,
  onOpenChange,
  ingredient,
  context,
  excludedIngredients = [],
  onSelectSubstitute
}: IngredientSubstitutesDialogProps) {
  const [selectedSubstitute, setSelectedSubstitute] = useState<string | null>(null);
  const [data, setData] = useState<{ substitutes: IngredientSubstituteData; suggestions: string[] } | null>(null);

  const substituteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ingredient-substitutes", {
        ingredient,
        context,
        excludedIngredients
      });
      return response.json();
    },
    onSuccess: (result) => {
      setData(result);
    }
  });

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen && !data && !substituteMutation.isPending) {
      substituteMutation.mutate();
    }
    if (!isOpen) {
      setSelectedSubstitute(null);
    }
  };

  const handleConfirmSubstitute = () => {
    if (selectedSubstitute && onSelectSubstitute) {
      onSelectSubstitute(ingredient, selectedSubstitute);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Substitutes for {ingredient}
          </DialogTitle>
          <DialogDescription>
            Choose an alternative ingredient to use instead
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          {substituteMutation.isPending ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Finding alternatives...</p>
            </div>
          ) : data?.substitutes ? (
            <div className="space-y-4">
              {data.substitutes.reason && (
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">{data.substitutes.reason}</p>
                </div>
              )}

              <div className="space-y-2">
                {data.substitutes.alternatives.map((alt, index) => (
                  <Card 
                    key={index}
                    className={`cursor-pointer transition-all ${
                      selectedSubstitute === alt.name 
                        ? "ring-2 ring-primary bg-primary/5" 
                        : "hover-elevate"
                    }`}
                    onClick={() => setSelectedSubstitute(alt.name)}
                    data-testid={`card-substitute-${index}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        {selectedSubstitute === alt.name && (
                          <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{alt.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {alt.ratio}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{alt.notes}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {data.suggestions && data.suggestions.length > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Tips
                  </p>
                  <ul className="space-y-1">
                    {data.suggestions.map((tip, index) => (
                      <li key={index} className="text-xs text-muted-foreground">
                        • {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No substitutes found
            </div>
          )}
        </ScrollArea>

        {data && selectedSubstitute && onSelectSubstitute && (
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={handleConfirmSubstitute}
              data-testid="button-confirm-substitute"
            >
              <Check className="h-4 w-4 mr-1" />
              Use {selectedSubstitute}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
