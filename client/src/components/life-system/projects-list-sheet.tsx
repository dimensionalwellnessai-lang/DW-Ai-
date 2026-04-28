import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLocation } from "wouter";
import { useLifeSystem } from "@/lib/life-system";
import { ChevronRight, Hammer, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectsListSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectsListSheet({ open, onOpenChange }: ProjectsListSheetProps) {
  const [, navigate] = useLocation();
  const lifeSystem = useLifeSystem();
  const projects = (lifeSystem.data?.projects ?? []).filter(p => p.status === "active");

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Hammer className="h-4 w-4 text-primary" />
            Projects
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {projects.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center" data-testid="text-projects-empty">
              No active projects yet. Add one to start building.
            </div>
          ) : (
            projects.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => go(`/life-system/project/${p.id}`)}
                className="w-full text-left rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/40 transition-colors flex items-center gap-3"
                data-testid={`row-project-${p.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight truncate" data-testid={`text-project-name-${p.id}`}>
                    {p.name}
                  </p>
                  {p.currentFocus && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.currentFocus}</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))
          )}

          <Button
            variant="outline"
            className="w-full mt-3"
            onClick={() => go("/life-blueprint")}
            data-testid="btn-manage-projects"
          >
            <Plus className="h-4 w-4 mr-2" />
            Manage all projects
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
