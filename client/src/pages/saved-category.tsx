import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Bookmark, MoreVertical, Trash2, MessageCircle, ChevronRight } from "lucide-react";
import {
  getCategories,
  getMomentsByCategory,
  deleteMoment,
  type SavedMoment,
} from "@/lib/saved-moments-storage";

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function SavedCategoryPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/saved/:categoryId");
  const { toast } = useToast();
  const categoryId = params?.categoryId ?? "";

  const categories = getCategories();
  const category = categories.find((c) => c.id === categoryId);

  const [moments, setMoments] = useState<SavedMoment[]>(() =>
    getMomentsByCategory(categoryId).sort((a, b) => b.createdAt - a.createdAt)
  );

  const refresh = () =>
    setMoments(getMomentsByCategory(categoryId).sort((a, b) => b.createdAt - a.createdAt));

  const handleDelete = (moment: SavedMoment) => {
    if (!window.confirm(`Delete "${moment.title}"?`)) return;
    deleteMoment(moment.id);
    refresh();
    toast({ title: "Moment deleted" });
  };

  const handleContinueWithDW = (moment: SavedMoment) => {
    // Build context string for DW
    const context = encodeURIComponent(
      `[Saved moment – "${moment.title}"]\n${moment.excerpt}`
    );
    navigate(`/?savedMoment=${context}`);
  };

  if (!category) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <PageHeader title="Category not found" />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground space-y-2">
            <p>This category doesn't exist or has been deleted.</p>
            <Button variant="outline" onClick={() => navigate("/saved")}>Back to My Library</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader title={category.name} />

      <div className="flex-1 p-4 space-y-3 max-w-lg mx-auto w-full">
        {moments.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bookmark className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No moments saved here yet.</p>
            <p className="text-xs mt-1">Save a moment from any chat to see it here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {moments.map((moment) => (
              <div key={moment.id} className="flex items-start gap-2">
                <Card className="flex-1 hover:border-primary/30 transition-colors">
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-semibold leading-tight line-clamp-1">{moment.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{moment.excerpt}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{formatRelativeTime(moment.createdAt)}</span>
                          {moment.sourceLabel && (
                            <>
                              <span>·</span>
                              <span>{moment.sourceLabel}</span>
                            </>
                          )}
                          <span>·</span>
                          <span className="capitalize">{moment.source.kind === "exchange" ? "Exchange" : "Message"}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs h-7"
                      onClick={() => handleContinueWithDW(moment)}
                      aria-label={`Continue with DW from "${moment.title}"`}
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                      Continue with DW
                      <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                    </Button>
                  </CardContent>
                </Card>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 flex-shrink-0 mt-1"
                      aria-label={`Actions for "${moment.title}"`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(moment)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
