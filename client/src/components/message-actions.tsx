import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Copy,
  Pencil,
  Trash2,
  Bookmark,
  MessageSquarePlus,
  Target,
  MoreHorizontal,
  Check,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export type LifeSystemItemType = "goal" | "habit" | "schedule";

export interface ExtractedItem {
  type: LifeSystemItemType;
  title: string;
  description?: string;
  frequency?: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  category?: string;
  wellnessDimension?: string;
}

interface MessageActionsProps {
  messageIndex: number;
  messageContent: string;
  isUserMessage: boolean;
  onEdit?: (content: string) => void;
  onDelete?: () => void;
  onAskFollowUp?: (content: string) => void;
  isLoggedIn: boolean;
}

export function MessageActions({
  messageIndex,
  messageContent,
  isUserMessage,
  onEdit,
  onDelete,
  onAskFollowUp,
  isLoggedIn,
}: MessageActionsProps) {
  const { toast } = useToast();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isExtracting, setIsExtracting] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageContent);
      toast({
        title: "Copied",
        description: "Message copied to clipboard.",
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Could not copy message.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(messageContent);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
  };

  const handleAskFollowUp = () => {
    if (onAskFollowUp) {
      onAskFollowUp(`Regarding: "${messageContent.slice(0, 100)}${messageContent.length > 100 ? '...' : ''}"

Can you tell me more about this?`);
    }
  };

  const extractItemsMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/life-system/extract", { content });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.items && data.items.length > 0) {
        setExtractedItems(data.items);
        setSelectedItems(new Set(data.items.map((_: ExtractedItem, i: number) => i)));
        setSaveDialogOpen(true);
      } else {
        toast({
          title: "Nothing to save",
          description: "No actionable items found in this message.",
        });
      }
      setIsExtracting(false);
    },
    onError: () => {
      toast({
        title: "Could not extract items",
        description: "Please try again.",
        variant: "destructive",
      });
      setIsExtracting(false);
    },
  });

  const saveItemsMutation = useMutation({
    mutationFn: async (items: ExtractedItem[]) => {
      const response = await apiRequest("POST", "/api/life-system/save-items", { items });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Saved to your life system",
        description: `Added ${data.saved} item${data.saved !== 1 ? 's' : ''} to your life system.`,
      });
      setSaveDialogOpen(false);
      setExtractedItems([]);
      setSelectedItems(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
    },
    onError: () => {
      toast({
        title: "Failed to save",
        description: "Could not save items to your life system.",
        variant: "destructive",
      });
    },
  });

  const handleSaveToLifeSystem = () => {
    if (!isLoggedIn) {
      toast({
        title: "Account needed",
        description: "Create an account to save items to your life system.",
      });
      return;
    }
    setIsExtracting(true);
    extractItemsMutation.mutate(messageContent);
  };

  const handleSaveSelected = () => {
    const itemsToSave = extractedItems.filter((_, i) => selectedItems.has(i));
    if (itemsToSave.length === 0) {
      toast({
        title: "Nothing selected",
        description: "Please select at least one item to save.",
      });
      return;
    }
    saveItemsMutation.mutate(itemsToSave);
  };

  const toggleItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const getItemIcon = (type: LifeSystemItemType) => {
    switch (type) {
      case "goal":
        return Target;
      case "habit":
        return Check;
      case "schedule":
        return Bookmark;
      default:
        return Target;
    }
  };

  const getItemLabel = (type: LifeSystemItemType) => {
    switch (type) {
      case "goal":
        return "Goal";
      case "habit":
        return "Habit";
      case "schedule":
        return "Schedule";
      default:
        return "Item";
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            data-testid={`button-message-actions-${messageIndex}`}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isUserMessage ? "end" : "start"}>
          <DropdownMenuItem onClick={handleCopy} data-testid={`action-copy-${messageIndex}`}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </DropdownMenuItem>

          {isUserMessage ? (
            <>
              {onEdit && (
                <DropdownMenuItem onClick={handleEdit} data-testid={`action-edit-${messageIndex}`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit and resend
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleDelete} 
                    className="text-destructive"
                    data-testid={`action-delete-${messageIndex}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </>
          ) : (
            <>
              <DropdownMenuItem 
                onClick={handleSaveToLifeSystem}
                disabled={isExtracting}
                data-testid={`action-save-${messageIndex}`}
              >
                {isExtracting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Target className="h-4 w-4 mr-2" />
                )}
                Save to Life System
              </DropdownMenuItem>
              {onAskFollowUp && (
                <DropdownMenuItem onClick={handleAskFollowUp} data-testid={`action-followup-${messageIndex}`}>
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  Ask follow-up
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add to your life system</DialogTitle>
            <DialogDescription>
              Select the items you'd like to save. You can always edit them later.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[300px] pr-4">
            <div className="space-y-3">
              {extractedItems.map((item, index) => {
                const Icon = getItemIcon(item.type);
                return (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg border hover-elevate cursor-pointer"
                    onClick={() => toggleItem(index)}
                    data-testid={`extracted-item-${index}`}
                  >
                    <Checkbox
                      checked={selectedItems.has(index)}
                      onCheckedChange={() => toggleItem(index)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground uppercase">
                          {getItemLabel(item.type)}
                        </span>
                      </div>
                      <Label className="font-medium text-sm cursor-pointer">
                        {item.title}
                      </Label>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      {item.frequency && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Frequency: {item.frequency}
                        </p>
                      )}
                      {item.startTime && item.endTime && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.startTime} - {item.endTime}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveSelected}
              disabled={selectedItems.size === 0 || saveItemsMutation.isPending}
              data-testid="button-save-to-life-system"
            >
              {saveItemsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Save {selectedItems.size > 0 ? `(${selectedItems.size})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
