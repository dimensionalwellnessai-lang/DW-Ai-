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
  Calendar,
  Dumbbell,
  Utensils,
  Repeat,
  LayoutGrid,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ttsService } from "@/lib/tts-service";

export type LifeSystemItemType = "goal" | "habit" | "schedule" | "calendar" | "workout" | "meal" | "routine";

export interface ExtractedItem {
  type: LifeSystemItemType;
  title: string;
  description?: string;
  frequency?: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  date?: string;
  category?: string;
  wellnessDimension?: string;
  exerciseType?: string;
  durationMinutes?: number;
  mealType?: string;
  isRecurring?: boolean;
  steps?: { title: string; durationMinutes: number }[];
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
    if (!ttsService.isAvailable()) {
      toast({
        title: "Not supported",
        description: "Text-to-speech is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }

    if (isSpeaking) {
      ttsService.stop();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    ttsService.speak(messageContent)
      .then(() => setIsSpeaking(false))
      .catch(() => {
        setIsSpeaking(false);
        toast({
          title: "Could not read message",
          description: "Text-to-speech encountered an error.",
          variant: "destructive",
        });
      });
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
      case "goal": return Target;
      case "habit": return Repeat;
      case "schedule": return Bookmark;
      case "calendar": return Calendar;
      case "workout": return Dumbbell;
      case "meal": return Utensils;
      case "routine": return LayoutGrid;
      default: return Target;
    }
  };

  const getItemLabel = (type: LifeSystemItemType) => {
    switch (type) {
      case "goal": return "Goal";
      case "habit": return "Habit";
      case "schedule": return "Schedule Block";
      case "calendar": return "Calendar Event";
      case "workout": return "Workout";
      case "meal": return "Meal / Recipe";
      case "routine": return "Routine";
      default: return "Item";
    }
  };

  const getItemDestination = (type: LifeSystemItemType) => {
    switch (type) {
      case "goal": return "→ Goals";
      case "habit": return "→ Habits";
      case "schedule": return "→ Daily Schedule";
      case "calendar": return "→ Calendar";
      case "workout": return "→ Workouts";
      case "meal": return "→ Meal Prep";
      case "routine": return "→ Routines";
      default: return "";
    }
  };

  const getItemColor = (type: LifeSystemItemType) => {
    switch (type) {
      case "goal": return "text-violet-500";
      case "habit": return "text-green-500";
      case "schedule": return "text-blue-400";
      case "calendar": return "text-blue-500";
      case "workout": return "text-orange-500";
      case "meal": return "text-amber-500";
      case "routine": return "text-teal-500";
      default: return "text-muted-foreground";
    }
  };

  const getItemSubtext = (item: ExtractedItem) => {
    const parts: string[] = [];
    if (item.type === "workout" && item.exerciseType) parts.push(item.exerciseType);
    if (item.durationMinutes) parts.push(`${item.durationMinutes} min`);
    if (item.type === "meal" && item.mealType) parts.push(item.mealType);
    if (item.type === "habit" && item.frequency) parts.push(item.frequency);
    if (item.type === "goal" && item.wellnessDimension) parts.push(item.wellnessDimension);
    if (item.startTime) parts.push(item.startTime + (item.endTime ? `–${item.endTime}` : ""));
    if (item.date) parts.push(item.date);
    if (item.isRecurring) parts.push("recurring");
    return parts.join(" · ");
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
              aria-label="Message actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
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
          
          <ScrollArea className="max-h-[360px] pr-4">
            <div className="space-y-3">
              {extractedItems.map((item, index) => {
                const Icon = getItemIcon(item.type);
                const subtext = getItemSubtext(item);
                const colorClass = getItemColor(item.type);
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
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <Icon className={`h-3.5 w-3.5 ${colorClass}`} />
                          <span className={`text-xs font-medium uppercase tracking-wide ${colorClass}`}>
                            {getItemLabel(item.type)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground/60 shrink-0">
                          {getItemDestination(item.type)}
                        </span>
                      </div>
                      <Label className="font-medium text-sm cursor-pointer leading-snug">
                        {item.title}
                      </Label>
                      {subtext && (
                        <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>
                      )}
                      {item.description && (
                        <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      {item.steps && item.steps.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.steps.length} steps
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
