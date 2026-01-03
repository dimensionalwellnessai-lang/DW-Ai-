import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, MessageSquareText, CheckSquare, Circle, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task } from "@shared/schema";

export function TasksPage() {
  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const toggleTask = useMutation({
    mutationFn: async (task: Task) => {
      return apiRequest("PATCH", `/api/tasks/${task.id}`, {
        isCompleted: !task.isCompleted,
        status: task.isCompleted ? "todo" : "done",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const todoTasks = tasks?.filter((t) => !t.isCompleted) || [];
  const doneTasks = tasks?.filter((t) => t.isCompleted) || [];

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background via-background to-muted/30" />
      
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold">Tasks</h1>
            <p className="text-muted-foreground font-body mt-1">
              Track what needs to be done across your wellness journey
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Button className="gap-2" data-testid="button-new-task">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </div>
        </header>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-card rounded-lg animate-pulse" />
            ))}
          </div>
        ) : tasks && tasks.length > 0 ? (
          <div className="space-y-6">
            {todoTasks.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  To Do ({todoTasks.length})
                </h2>
                <div className="space-y-2">
                  {todoTasks.map((task) => (
                    <Card
                      key={task.id}
                      className="hover-elevate cursor-pointer"
                      data-testid={`card-task-${task.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleTask.mutate(task)}
                            className="flex-shrink-0"
                            data-testid={`button-toggle-task-${task.id}`}
                          >
                            <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{task.title}</p>
                            {task.description && (
                              <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                            )}
                          </div>
                          {task.dueDate && (
                            <span className="text-xs text-muted-foreground">{task.dueDate}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {doneTasks.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Done ({doneTasks.length})
                </h2>
                <div className="space-y-2">
                  {doneTasks.map((task) => (
                    <Card
                      key={task.id}
                      className="opacity-60 cursor-pointer"
                      data-testid={`card-task-${task.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleTask.mutate(task)}
                            className="flex-shrink-0"
                            data-testid={`button-toggle-task-${task.id}`}
                          >
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          </button>
                          <p className="font-medium line-through text-muted-foreground">{task.title}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <CheckSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg">No tasks yet</h3>
                <p className="text-muted-foreground font-body mt-1">
                  Tasks help you break down your goals into actionable steps. Create one or ask AI to help plan your day.
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button className="gap-2" data-testid="button-create-first-task">
                  <Plus className="h-4 w-4" />
                  Create Task
                </Button>
                <Link href="/">
                  <Button variant="outline" className="gap-2" data-testid="button-ask-ai-tasks">
                    <MessageSquareText className="h-4 w-4" />
                    Ask AI to plan
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
