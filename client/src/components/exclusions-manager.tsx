import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  X, 
  Plus, 
  Ban, 
  Sparkles
} from "lucide-react";
import { 
  getDomainExclusions, 
  addDomainExclusion, 
  removeDomainExclusion,
  type AlternativesDomain
} from "@/lib/guest-storage";
import { getDomainConfig } from "@/config/alternatives-config";
import { useToast } from "@/hooks/use-toast";

interface ExclusionsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: AlternativesDomain;
  onUpdate?: () => void;
}

export function ExclusionsManager({
  open,
  onOpenChange,
  domain,
  onUpdate
}: ExclusionsManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [exclusions, setExclusions] = useState<string[]>([]);
  const { toast } = useToast();

  const config = getDomainConfig(domain);
  const Icon = config.icon;

  useEffect(() => {
    if (open) {
      setExclusions(getDomainExclusions(domain));
    }
  }, [open, domain]);

  const handleAddExclusion = (item: string) => {
    const normalized = item.toLowerCase().trim();
    if (!normalized) return;
    
    if (exclusions.includes(normalized)) {
      toast({ title: "Already excluded", description: `${item} is already on your exclusion list` });
      return;
    }
    
    addDomainExclusion(domain, normalized);
    setExclusions(getDomainExclusions(domain));
    setSearchQuery("");
    toast({ title: `${config.singularLabel} excluded`, description: `${item} will be excluded from suggestions` });
    onUpdate?.();
  };

  const handleRemoveExclusion = (item: string) => {
    removeDomainExclusion(domain, item);
    setExclusions(getDomainExclusions(domain));
    toast({ title: `${config.singularLabel} removed`, description: `${item} removed from exclusion list` });
    onUpdate?.();
  };

  const filteredSuggestions = config.commonExclusions
    .filter(item => 
      item.toLowerCase().includes(searchQuery.toLowerCase()) && 
      !exclusions.includes(item.toLowerCase())
    )
    .slice(0, 6);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            {config.exclusionsLabel}
          </DialogTitle>
          <DialogDescription>
            {config.exclusionsDescription}
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
                    handleAddExclusion(searchQuery);
                  }
                }}
                placeholder={`Search ${config.itemLabel} to exclude...`}
                className="pl-9"
                data-testid={`input-search-exclusion-${domain}`}
              />
            </div>
            <Button 
              onClick={() => handleAddExclusion(searchQuery)}
              disabled={!searchQuery.trim()}
              data-testid={`button-add-exclusion-${domain}`}
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
                  onClick={() => handleAddExclusion(item)}
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
              {exclusions.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Ban className="h-3 w-3" />
                    Excluded ({exclusions.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {exclusions.map((item) => (
                      <Badge
                        key={item}
                        variant="destructive"
                        className="cursor-pointer"
                        onClick={() => handleRemoveExclusion(item)}
                        data-testid={`badge-exclusion-${item}`}
                      >
                        {item}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Ban className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No {config.itemLabel}s excluded yet</p>
                  <p className="text-xs">Search above to add {config.itemLabel}s to avoid</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              All excluded {config.itemLabel}s will be filtered from AI suggestions and searches.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ExclusionsButtonProps {
  domain: AlternativesDomain;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ExclusionsButton({ 
  domain, 
  className,
  variant = "outline",
  size = "sm"
}: ExclusionsButtonProps) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(getDomainExclusions(domain).length);

  const config = getDomainConfig(domain);

  const handleUpdate = () => {
    setCount(getDomainExclusions(domain).length);
  };

  return (
    <>
      <Button 
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className}
        data-testid={`button-manage-exclusions-${domain}`}
      >
        <Ban className="h-4 w-4 mr-1" />
        {config.exclusionsLabel}
        {count > 0 && (
          <Badge variant="secondary" className="ml-1 text-xs">
            {count}
          </Badge>
        )}
      </Button>
      <ExclusionsManager 
        open={open} 
        onOpenChange={setOpen} 
        domain={domain}
        onUpdate={handleUpdate}
      />
    </>
  );
}
