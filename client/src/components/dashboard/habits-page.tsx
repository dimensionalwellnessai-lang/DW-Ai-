import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Circle, Plus, Trash2, Edit, Flame, Calendar } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Habit, InsertHabit } from "@shared/schema";

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function HabitsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    frequency: "daily",
    reminderTime: "",
  });

  const { data: habits = [], isLoading } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<InsertHabit>) => {
      return apiRequest("POST", "/api/habits", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Habit created successfully!" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create habit", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Habit> }) => {
      return apiRequest("PATCH", `/api/habits/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Habit updated!" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update habit", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/habits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Habit deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete habit", variant: "destructive" });
    },
  });

  const logHabitMutation = useMutation({
    mutationFn: async (habitId: string) => {
      return apiRequest("POST", `/api/habits/${habitId}/log`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Habit logged!" });
    },
    onError: () => {
      toast({ title: "Failed to log habit", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ title: "", description: "", frequency: "daily", reminderTime: "" });
    setEditingHabit(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingHabit) {
      updateMutation.mutate({ id: editingHabit.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (habit: Habit) => {
    setEditingHabit(habit);
    setFormData({
      title: habit.title,
      description: habit.description || "",
      frequency: habit.frequency || "daily",
      reminderTime: habit.reminderTime || "",
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <HabitsSkeleton />;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-habits-title">Habits</h1>
          <p className="text-muted-foreground">Build consistent routines with daily habit tracking</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} data-testid="button-add-habit">
              <Plus className="mr-2 h-4 w-4" />
              Add Habit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingHabit ? "Edit Habit" : "Create New Habit"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Habit Name</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Morning meditation"
                  required
                  data-testid="input-habit-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add more details..."
                  data-testid="input-habit-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger data-testid="select-habit-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reminderTime">Reminder Time (optional)</Label>
                <Input
                  id="reminderTime"
                  type="time"
                  value={formData.reminderTime}
                  onChange={(e) => setFormData({ ...formData, reminderTime: e.target.value })}
                  data-testid="input-habit-reminder"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-habit"
                >
                  {editingHabit ? "Save Changes" : "Create Habit"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {habits.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-chart-2/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-chart-2" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No habits yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Start building healthy routines by creating your first habit.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-habit">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Habit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Weekly Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-3 font-medium">Habit</th>
                      {DAYS.map((day) => (
                        <th key={day} className="text-center py-2 px-2 font-medium text-sm">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {habits.map((habit) => (
                      <tr key={habit.id} className="border-t" data-testid={`row-habit-${habit.id}`}>
                        <td className="py-3 px-3">
                          <span className="font-medium">{habit.title}</span>
                        </td>
                        {DAYS.map((day, index) => (
                          <td key={day} className="text-center py-3 px-2">
                            <button
                              className="w-8 h-8 rounded-md flex items-center justify-center mx-auto hover-elevate"
                              onClick={() => logHabitMutation.mutate(habit.id)}
                              data-testid={`button-log-${habit.id}-${day}`}
                            >
                              {index < (habit.streak ?? 0) ? (
                                <CheckCircle2 className="h-5 w-5 text-chart-2" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground/30" />
                              )}
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <h2 className="text-xl font-semibold">All Habits</h2>
            {habits.map((habit) => (
              <Card key={habit.id} data-testid={`card-habit-${habit.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <button
                        className="w-10 h-10 rounded-md bg-chart-2/10 flex items-center justify-center shrink-0 hover-elevate"
                        onClick={() => logHabitMutation.mutate(habit.id)}
                        data-testid={`button-complete-habit-${habit.id}`}
                      >
                        <CheckCircle2 className="h-5 w-5 text-chart-2" />
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold">{habit.title}</h3>
                          <Badge variant="secondary">{habit.frequency}</Badge>
                        </div>
                        {habit.description && (
                          <p className="text-sm text-muted-foreground">{habit.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <div className="flex items-center gap-1 text-chart-4">
                            <Flame className="h-4 w-4" />
                            <span>{habit.streak ?? 0} day streak</span>
                          </div>
                          {habit.reminderTime && (
                            <span className="text-muted-foreground">
                              Reminder: {habit.reminderTime}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(habit)}
                        data-testid={`button-edit-habit-${habit.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(habit.id)}
                        data-testid={`button-delete-habit-${habit.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function HabitsSkeleton() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
