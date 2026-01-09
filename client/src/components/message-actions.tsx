import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  RefreshCw,
  Lightbulb,
  Send,
  Volume2,
  VolumeX,
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
  onResend?: (content: string) => void;
  onThinkDeeper?: (originalResponse: string) => void;
  onRegenerate?: () => void;
  isLoggedIn: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export function MessageActions({
  messageIndex,
  messageContent,
  isUserMessage,
  onEdit,
  onDelete,
  onAskFollowUp,
  onResend,
  onThinkDeeper,
  onRegenerate,
  isLoggedIn,
  isOpen: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: MessageActionsProps) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const menuOpen = isControlled ? controlledOpen : internalOpen;
  const setMenuOpen = (open: boolean) => {
    if (onOpenChange) onOpenChange(open);
    if (!isControlled) setInternalOpen(open);
  };

  const handleReadAloud = () => {
    if (!("speechSynthesis" in window)) {
      toast({
        title: "Not supported",
        description: "Text-to-speech is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(messageContent);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith("en") && v.name.includes("Natural")) 
      || voices.find(v => v.lang.startsWith("en"));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      toast({
        title: "Could not read message",
        description: "Text-to-speech encountered an error.",
        variant: "destructive",
      });
    };

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

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
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        {showTrigger ? (
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 opacity-40 hover:opacity-100 transition-opacity shrink-0"
              data-testid={`button-message-actions-${messageIndex}`}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
        ) : (
          <DropdownMenuTrigger asChild>
            <span className="sr-only" aria-hidden="true" />
          </DropdownMenuTrigger>
        )}
        <DropdownMenuContent align={isUserMessage ? "end" : "start"} sideOffset={5}>
          <DropdownMenuItem onClick={handleCopy} data-testid={`action-copy-${messageIndex}`}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleReadAloud} data-testid={`action-read-aloud-${messageIndex}`}>
            {isSpeaking ? (
              <>
                <VolumeX className="h-4 w-4 mr-2" />
                Stop reading
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4 mr-2" />
                Read aloud
              </>
            )}
          </DropdownMenuItem>

          {isUserMessage ? (
            <>
              {onEdit && (
                <DropdownMenuItem onClick={handleEdit} data-testid={`action-edit-${messageIndex}`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onResend && (
                <DropdownMenuItem 
                  onClick={() => onResend(messageContent)} 
                  data-testid={`action-resend-${messageIndex}`}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Resend
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
              {onThinkDeeper && (
                <DropdownMenuItem 
                  onClick={() => onThinkDeeper(messageContent)} 
                  data-testid={`action-think-deeper-${messageIndex}`}
                >
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Think deeper
                </DropdownMenuItem>
              )}
              {onRegenerate && (
                <DropdownMenuItem 
                  onClick={onRegenerate} 
                  data-testid={`action-regenerate-${messageIndex}`}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
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
