import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, MessageSquareText, FolderOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Project } from "@shared/schema";

export function ProjectsPage() {
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background via-background to-muted/30" />
      
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold">Projects</h1>
            <p className="text-muted-foreground font-body mt-1">
              Organize your wellness journey into focused life areas
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Button className="gap-2" data-testid="button-new-project">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>
        </header>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-2/3 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-4">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover-elevate cursor-pointer" data-testid={`card-project-${project.id}`}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FolderOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>{project.name}</CardTitle>
                        {project.description && (
                          <CardDescription className="mt-1">{project.description}</CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {project.dimensionTags && project.dimensionTags.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="flex gap-1 flex-wrap">
                        {project.dimensionTags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg">No projects yet</h3>
                <p className="text-muted-foreground font-body mt-1">
                  Projects help you organize your wellness journey. Create one to start grouping related goals, routines, and plans.
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button className="gap-2" data-testid="button-create-first-project">
                  <Plus className="h-4 w-4" />
                  Create Project
                </Button>
                <Link href="/assistant">
                  <Button variant="outline" className="gap-2" data-testid="button-ask-ai-project">
                    <MessageSquareText className="h-4 w-4" />
                    Ask AI to help
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
