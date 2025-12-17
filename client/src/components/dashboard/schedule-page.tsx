import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Calendar, Plus, Trash2, Clock, Download } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ScheduleBlock, InsertScheduleBlock, LifeSystem } from "@shared/schema";

function generateICS(blocks: ScheduleBlock[], systemName: string): string {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  
  let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${systemName}
`;

  blocks.forEach((block) => {
    const blockDate = new Date(startOfWeek);
    blockDate.setDate(startOfWeek.getDate() + (block.dayOfWeek || 0));
    
    const [startHour, startMin] = (block.startTime || "09:00").split(":").map(Number);
    const [endHour, endMin] = (block.endTime || "10:00").split(":").map(Number);
    
    const startDate = new Date(blockDate);
    startDate.setHours(startHour, startMin, 0, 0);
    
    const endDate = new Date(blockDate);
    endDate.setHours(endHour, endMin, 0, 0);
    
    const formatDate = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    icsContent += `BEGIN:VEVENT
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
RRULE:FREQ=WEEKLY;BYDAY=${["SU", "MO", "TU", "WE", "TH", "FR", "SA"][block.dayOfWeek || 0]}
SUMMARY:${block.title}
DESCRIPTION:Category: ${block.category || "general"}
END:VEVENT
`;
  });

  icsContent += "END:VCALENDAR";
  return icsContent;
}

function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const CATEGORIES = [
  { value: "work", label: "Work", color: "bg-chart-1" },
  { value: "wellness", label: "Wellness", color: "bg-chart-2" },
  { value: "personal", label: "Personal", color: "bg-chart-3" },
  { value: "social", label: "Social", color: "bg-chart-4" },
  { value: "rest", label: "Rest", color: "bg-chart-5" },
];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0");
  return `${hour}:00`;
});

interface DashboardData {
  systemName: string;
  lifeSystem: LifeSystem | null;
}

export function SchedulePage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [formData, setFormData] = useState({
    dayOfWeek: selectedDay,
    startTime: "09:00",
    endTime: "10:00",
    title: "",
    category: "work",
  });

  const { data: scheduleBlocks = [], isLoading } = useQuery<ScheduleBlock[]>({
    queryKey: ["/api/schedule"],
  });

  const { data: dashboardData } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<InsertScheduleBlock>) => {
      return apiRequest("POST", "/api/schedule", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      toast({ title: "Time block added!" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to add time block", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/schedule/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      toast({ title: "Time block removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove time block", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      dayOfWeek: selectedDay,
      startTime: "09:00",
      endTime: "10:00",
      title: "",
      category: "work",
    });
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const category = CATEGORIES.find((c) => c.value === formData.category);
    createMutation.mutate({
      ...formData,
      color: category?.color || "bg-chart-1",
    });
  };

  const dayBlocks = scheduleBlocks.filter((block) => block.dayOfWeek === selectedDay);

  const getCategoryColor = (category: string | null) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat?.color || "bg-chart-1";
  };

  if (isLoading) {
    return <ScheduleSkeleton />;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-schedule-title">Schedule</h1>
          <p className="text-muted-foreground">Plan your week with intentional time blocks</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {scheduleBlocks.length > 0 && (
            <Button 
              variant="outline"
              onClick={() => {
                const systemName = dashboardData?.systemName || "Life Wellness Calendar";
                const safeName = systemName.replace(/[^a-zA-Z0-9]/g, "_");
                const ics = generateICS(scheduleBlocks, systemName);
                downloadICS(ics, `${safeName}_Calendar.ics`);
                toast({ title: "Calendar exported!", description: "Import the .ics file into your calendar app" });
              }}
              data-testid="button-export-calendar"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Calendar
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setFormData((prev) => ({ ...prev, dayOfWeek: selectedDay }));
              }} data-testid="button-add-block">
                <Plus className="mr-2 h-4 w-4" />
                Add Time Block
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Time Block</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Activity</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Morning workout, Deep work..."
                  required
                  data-testid="input-block-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="day">Day</Label>
                <Select
                  value={formData.dayOfWeek.toString()}
                  onValueChange={(value) => setFormData({ ...formData, dayOfWeek: parseInt(value) })}
                >
                  <SelectTrigger data-testid="select-block-day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Select
                    value={formData.startTime}
                    onValueChange={(value) => setFormData({ ...formData, startTime: value })}
                  >
                    <SelectTrigger data-testid="select-block-start">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Select
                    value={formData.endTime}
                    onValueChange={(value) => setFormData({ ...formData, endTime: value })}
                  >
                    <SelectTrigger data-testid="select-block-end">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.value })}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                        formData.category === cat.value
                          ? `${cat.color} text-white`
                          : "bg-muted text-muted-foreground hover-elevate"
                      }`}
                      data-testid={`button-category-${cat.value}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-block">
                  Add Block
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {DAYS.map((day) => (
          <Button
            key={day.value}
            variant={selectedDay === day.value ? "default" : "outline"}
            onClick={() => setSelectedDay(day.value)}
            className="shrink-0"
            data-testid={`button-day-${day.value}`}
          >
            {day.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {DAYS.find((d) => d.value === selectedDay)?.label}'s Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dayBlocks.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No time blocks for this day yet</p>
                <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add a Time Block
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {dayBlocks
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((block) => (
                    <div
                      key={block.id}
                      className="flex items-center gap-4 p-4 rounded-md bg-muted/50"
                      data-testid={`block-${block.id}`}
                    >
                      <div className={`w-1 h-12 rounded-full ${getCategoryColor(block.category)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{block.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {block.startTime} - {block.endTime}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(block.id)}
                        data-testid={`button-delete-block-${block.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Legend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {CATEGORIES.map((cat) => (
              <div key={cat.value} className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${cat.color}`} />
                <span>{cat.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-chart-1/10 to-chart-2/10 border-0">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6 text-chart-1" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Scheduling Tip</h3>
              <p className="text-muted-foreground font-serif leading-relaxed">
                Block your most important wellness activities during your peak motivation hours. 
                Based on your profile, consider scheduling high-focus work in the morning and 
                restorative activities in the evening.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} className="h-10 w-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
