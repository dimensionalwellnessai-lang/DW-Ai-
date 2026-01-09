import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowRightLeft, Sparkles, Check, Info, Clock, Zap } from "lucide-react";
import { getDomainConfig, type AlternativesDomain, type AlternativeOption } from "@/config/alternatives-config";

interface AlternativesResult {
  original: string;
  alternatives: AlternativeOption[];
  reason: string;
}

interface AlternativesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: AlternativesDomain;
  item: string;
  context?: string;
  excludedItems?: string[];
  constraints?: string[];
  onSelectAlternative?: (original: string, alternative: string) => void;
}

export function AlternativesDialog({
  open,
  onOpenChange,
  domain,
  item,
  context,
  excludedItems = [],
  constraints = [],
  onSelectAlternative
}: AlternativesDialogProps) {
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null);
  const [data, setData] = useState<{ alternatives: AlternativesResult; suggestions: string[] } | null>(null);

  const config = getDomainConfig(domain);
  const Icon = config.icon;

  const alternativesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/alternatives", {
        domain,
        item,
        context,
        excludedItems,
        constraints
      });
      return response.json();
    },
    onSuccess: (result) => {
      setData(result);
    }
  });

  useEffect(() => {
    if (open && item && !data && !alternativesMutation.isPending) {
      alternativesMutation.mutate();
    }
  }, [open, item]);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setSelectedAlternative(null);
      setData(null);
    }
  };

  const handleConfirmAlternative = () => {
    if (selectedAlternative && onSelectAlternative) {
      onSelectAlternative(item, selectedAlternative);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.color}`} />
            {config.alternativeLabel.charAt(0).toUpperCase() + config.alternativeLabel.slice(1)}s for {item}
          </DialogTitle>
          <DialogDescription>
            Choose an {config.alternativeLabel} that works better for you
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          {alternativesMutation.isPending ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Finding {config.alternativeLabel}s...</p>
            </div>
          ) : data?.alternatives ? (
            <div className="space-y-4">
              {data.alternatives.reason && (
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">{data.alternatives.reason}</p>
                </div>
              )}

              <div className="space-y-2">
                {data.alternatives.alternatives.map((alt, index) => (
                  <Card 
                    key={index}
                    className={`cursor-pointer transition-all ${
                      selectedAlternative === alt.name 
                        ? "ring-2 ring-primary bg-primary/5" 
                        : "hover-elevate"
                    }`}
                    onClick={() => setSelectedAlternative(alt.name)}
                    data-testid={`card-alternative-${index}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        {selectedAlternative === alt.name && (
                          <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium">{alt.name}</span>
                            {alt.ratio && (
                              <Badge variant="outline" className="text-xs">
                                {alt.ratio}
                              </Badge>
                            )}
                            {alt.duration && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {alt.duration}
                              </Badge>
                            )}
                            {alt.intensity && (
                              <Badge variant="outline" className="text-xs">
                                <Zap className="h-3 w-3 mr-1" />
                                {alt.intensity}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{alt.notes}</p>
                          {alt.tags && alt.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {alt.tags.map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
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
              No {config.alternativeLabel}s found
            </div>
          )}
        </ScrollArea>

        {data && selectedAlternative && onSelectAlternative && (
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
              onClick={handleConfirmAlternative}
              data-testid="button-confirm-alternative"
            >
              <Check className="h-4 w-4 mr-1" />
              Use {selectedAlternative}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
