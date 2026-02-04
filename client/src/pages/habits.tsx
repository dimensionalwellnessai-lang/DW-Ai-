import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { CheckSquare, Plus, Circle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function HabitsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [habitTitle, setHabitTitle] = useState("");

  const { data: habits = [] } = useQuery<any[]>({
    queryKey: ['/api/habits'],
  });

  const createHabitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create habit');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/habits'] });
      setShowForm(false);
      setHabitTitle("");
      toast({ title: "Habit created successfully!" });
    },
  });

  const toggleHabitMutation = useMutation({
    mutationFn: async ({ habitId, completed }: { habitId: string, completed: boolean }) => {
      const res = await fetch(`/api/habits/${habitId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error('Failed to update habit');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/habits'] });
    },
  });

  const handleCreateHabit = () => {
    if (habitTitle.trim()) {
      createHabitMutation.mutate({
        name: habitTitle,
        frequency: 'daily',
        status: 'active',
      });
    }
  };

  const handleToggleHabit = (habitId: string, currentCompleted: boolean) => {
    toggleHabitMutation.mutate({ habitId, completed: !currentCompleted });
  };

  // Get today's date for checking completion
  const today = new Date().toDateString();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <PageHeader 
        title="My Habits" 
        rightContent={
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Habit
          </Button>
        }
      />
      <div className="container max-w-4xl mx-auto p-4 space-y-6">

        {/* Create Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Habit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Habit Name</label>
                <Input
                  value={habitTitle}
                  onChange={(e) => setHabitTitle(e.target.value)}
                  placeholder="e.g., Drink 8 glasses of water, Exercise 30 min"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateHabit} disabled={!habitTitle.trim()}>
                  Create Habit
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Habits List */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Habits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {habits.length === 0 && !showForm && (
              <div className="text-center py-8">
                <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium">No habits yet</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Create your first habit to start building consistency
                </p>
              </div>
            )}

            {habits.map((habit: any) => {
              const completedToday = habit.completions?.some(
                (c: any) => new Date(c.completedAt).toDateString() === today
              );
              
              return (
                <div
                  key={habit.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <button
                    onClick={() => handleToggleHabit(habit.id, completedToday)}
                    className="shrink-0"
                  >
                    {completedToday ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1">
                    <p className={`font-medium ${completedToday ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {habit.name}
                    </p>
                    {habit.currentStreak > 0 && (
                      <p className="text-sm text-muted-foreground">
                        🔥 {habit.currentStreak} day streak
                      </p>
                    )}
                  </div>
                  <Badge variant={habit.status === 'active' ? 'default' : 'secondary'}>
                    {habit.status}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
