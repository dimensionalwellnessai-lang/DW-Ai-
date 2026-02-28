import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bookmark } from "lucide-react";
import {
  getCategories,
  createCategory,
  saveMoment,
  buildDefaultTitle,
  buildExcerpt,
  INTENT_TO_CATEGORY,
  type MomentKind,
} from "@/lib/saved-moments-storage";
import { detectIntent } from "@/core/interactionEngine";

export interface SaveMomentPayload {
  /** The primary text to save (user message, or combined exchange) */
  text: string;
  /** Optional: the assistant reply paired with a user message */
  assistantText?: string;
  kind: MomentKind;
  /** Role of the primary message for single_message saves */
  role?: "user" | "assistant";
  conversationId?: string;
  messageIndex?: number;
  /** "Talk" | "Chat" | undefined */
  sourceLabel?: string;
}

interface SaveMomentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: SaveMomentPayload | null;
}

export function SaveMomentModal({ open, onOpenChange, payload }: SaveMomentModalProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const categories = getCategories();

  // Reset state when modal opens with new payload
  useEffect(() => {
    if (!open || !payload) return;
    const defaultTitle = buildDefaultTitle(payload.text);
    setTitle(defaultTitle);
    setNewCategoryName("");
    setShowNewCategory(false);

    // Suggest a category from heuristic intent detection
    const intent = detectIntent({ message: payload.text });
    const suggestedId = INTENT_TO_CATEGORY[intent] ?? "preset-journal";
    setCategoryId(suggestedId);
  }, [open, payload]);

  const handleSave = () => {
    if (!payload) return;
    let finalCategoryId = categoryId;

    if (showNewCategory) {
      if (!newCategoryName.trim()) {
        toast({ title: "Category name required", variant: "destructive" });
        return;
      }
      const result = createCategory(newCategoryName.trim());
      if (!result.ok) {
        toast({ title: result.error, variant: "destructive" });
        return;
      }
      finalCategoryId = result.category.id;
    }

    if (!finalCategoryId) {
      toast({ title: "Please select a category", variant: "destructive" });
      return;
    }

    const fullText =
      payload.kind === "exchange" && payload.assistantText
        ? `${payload.text}\n\n${payload.assistantText}`
        : payload.text;

    setIsSaving(true);
    const result = saveMoment({
      categoryId: finalCategoryId,
      title: title.trim() || buildDefaultTitle(payload.text),
      excerpt: buildExcerpt(fullText),
      source: {
        conversationId: payload.conversationId,
        messageIndex: payload.messageIndex,
        kind: payload.kind,
        roles: payload.kind === "exchange" ? ["user", "assistant"] : [payload.role ?? "user"],
      },
      sourceLabel: payload.sourceLabel,
    });
    setIsSaving(false);

    if (!result.ok) {
      toast({ title: result.error, variant: "destructive" });
      return;
    }

    toast({ title: "Moment saved!", description: `Saved to "${getCategories().find((c) => c.id === finalCategoryId)?.name ?? "category"}".` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-primary" />
            Save to Category
          </DialogTitle>
          <DialogDescription>
            Capture this moment in your personal library.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="moment-title">Title</Label>
            <Input
              id="moment-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Optional title…"
              maxLength={80}
            />
          </div>

          {/* Category */}
          {!showNewCategory ? (
            <div className="space-y-1.5">
              <Label htmlFor="moment-category">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="moment-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => setShowNewCategory(true)}
                className="text-xs text-primary underline-offset-2 hover:underline"
              >
                + New category
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="new-category-name">New category name</Label>
              <Input
                id="new-category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Reflections"
                maxLength={40}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowNewCategory(false)}
                className="text-xs text-primary underline-offset-2 hover:underline"
              >
                ← Choose existing
              </button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
