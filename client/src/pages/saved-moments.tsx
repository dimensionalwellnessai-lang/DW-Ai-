import { useState } from "react";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Bookmark, MoreVertical, Pencil, Trash2, Plus } from "lucide-react";
import {
  getCategories,
  getMomentsByCategory,
  createCategory,
  renameCategory,
  deleteCategory,
  type MomentCategory,
} from "@/lib/saved-moments-storage";

export default function SavedMomentsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [categories, setCategories] = useState<MomentCategory[]>(() => getCategories());
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<MomentCategory | null>(null);
  const [renameName, setRenameName] = useState("");

  const refresh = () => setCategories(getCategories());

  const handleCreateCategory = () => {
    if (!newCatName.trim()) return;
    const result = createCategory(newCatName.trim());
    if (!result.ok) {
      toast({ title: result.error, variant: "destructive" });
      return;
    }
    refresh();
    setNewCatName("");
    setNewCatOpen(false);
  };

  const handleRename = () => {
    if (!renameTarget || !renameName.trim()) return;
    const result = renameCategory(renameTarget.id, renameName.trim());
    if (!result.ok) {
      toast({ title: result.error, variant: "destructive" });
      return;
    }
    refresh();
    setRenameOpen(false);
    setRenameTarget(null);
    setRenameName("");
  };

  const handleDelete = (cat: MomentCategory) => {
    const count = getMomentsByCategory(cat.id).length;
    if (count > 0 && !window.confirm(`Delete "${cat.name}" and its ${count} saved moment${count !== 1 ? "s" : ""}?`)) return;
    deleteCategory(cat.id);
    refresh();
    toast({ title: `"${cat.name}" deleted` });
  };

  const openRename = (cat: MomentCategory) => {
    setRenameTarget(cat);
    setRenameName(cat.name);
    setRenameOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader title="My Library" />

      <div className="flex-1 p-4 space-y-3 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Your saved moments, organised by category.</p>
          <Button size="sm" variant="outline" onClick={() => setNewCatOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New
          </Button>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bookmark className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No categories yet. Save a moment from any chat to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => {
              const count = getMomentsByCategory(cat.id).length;
              return (
                <div key={cat.id} className="flex items-center gap-2">
                  <button
                    className="flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                    onClick={() => navigate(`/saved/${cat.id}`)}
                    aria-label={`Open ${cat.name} (${count} moments)`}
                  >
                    <Card className="hover:border-primary/30 transition-colors">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bookmark className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{cat.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{count} saved</span>
                      </CardContent>
                    </Card>
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" aria-label={`Actions for ${cat.name}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openRename(cat)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(cat)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New category dialog */}
      <Dialog open={newCatOpen} onOpenChange={setNewCatOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Category</DialogTitle>
            <DialogDescription>Give your new category a name.</DialogDescription>
          </DialogHeader>
          <Input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Category name…"
            maxLength={40}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCatOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCategory} disabled={!newCatName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Category</DialogTitle>
            <DialogDescription>Enter a new name for "{renameTarget?.name}".</DialogDescription>
          </DialogHeader>
          <Input
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            placeholder="New name…"
            maxLength={40}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={handleRename} disabled={!renameName.trim()}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
