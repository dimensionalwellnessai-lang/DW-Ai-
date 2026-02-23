import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, CheckCircle2, XCircle } from "lucide-react";
import { format, startOfWeek, addDays } from "date-fns";

export interface ScheduleItem {
  id: string;
  title: string;
  description?: string;
  day: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime?: string;
  category?: string;
  isConfirmed?: boolean;
}

interface WeeklyScheduleConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleItems: ScheduleItem[];
  onConfirm: (confirmedItems: ScheduleItem[]) => void;
  weekStartDate?: Date;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const CATEGORY_COLORS: Record<string, string> = {
  workout: "hsl(141, 53%, 53%)",
  meal: "hsl(45, 96%, 56%)",
  work: "hsl(231, 82%, 69%)",
  personal: "hsl(256, 100%, 83%)",
  social: "hsl(4, 64%, 66%)",
  wellness: "hsl(174, 60%, 51%)",
  sleep: "hsl(243, 75%, 59%)",
};

export function WeeklyScheduleConfirmation({
  open,
  onOpenChange,
  scheduleItems,
  onConfirm,
  weekStartDate = new Date(),
}: WeeklyScheduleConfirmationProps) {
  const [confirmed, setConfirmed] = useState<Set<string>>(
    new Set(scheduleItems.filter(item => item.isConfirmed).map(item => item.id))
  );

  const weekStart = startOfWeek(weekStartDate);

  // Group items by day
  const groupedByDay = scheduleItems.reduce((acc, item) => {
    if (!acc[item.day]) {
      acc[item.day] = [];
    }
    acc[item.day].push(item);
    return acc;
  }, {} as Record<number, ScheduleItem[]>);

  // Sort items within each day by start time
  Object.keys(groupedByDay).forEach(day => {
    groupedByDay[Number(day)].sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });
  });

  const toggleConfirm = (id: string) => {
    const newConfirmed = new Set(confirmed);
    if (newConfirmed.has(id)) {
      newConfirmed.delete(id);
    } else {
      newConfirmed.add(id);
    }
    setConfirmed(newConfirmed);
  };

  const confirmAll = () => {
    setConfirmed(new Set(scheduleItems.map(item => item.id)));
  };

  const clearAll = () => {
    setConfirmed(new Set());
  };

  const handleConfirm = () => {
    const confirmedItems = scheduleItems.map(item => ({
      ...item,
      isConfirmed: confirmed.has(item.id),
    }));
    onConfirm(confirmedItems);
    onOpenChange(false);
  };

  const confirmedCount = confirmed.size;
  const totalCount = scheduleItems.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Confirm Your Weekly Schedule
          </DialogTitle>
          <DialogDescription>
            Review and confirm your planned activities for the week of{" "}
            {format(weekStart, "MMM d, yyyy")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-y">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {confirmedCount} of {totalCount} confirmed
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={confirmAll}>
                <CheckCircle2 className="w-4 h-4 mr-1" />
                All
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                <XCircle className="w-4 h-4 mr-1" />
                None
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-6 pr-4">
            {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
              const items = groupedByDay[dayIndex] || [];
              if (items.length === 0) return null;

              const dayDate = addDays(weekStart, dayIndex);

              return (
                <div key={dayIndex} className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <h3 className="font-semibold text-sm">
                      {DAY_NAMES[dayIndex]}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {format(dayDate, "MMM d")}
                    </span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {items.filter(item => confirmed.has(item.id)).length} / {items.length}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {items.map(item => {
                      const isConfirmed = confirmed.has(item.id);
                      const categoryColor = item.category 
                        ? CATEGORY_COLORS[item.category] || "hsl(var(--muted))"
                        : "hsl(var(--muted))";

                      return (
                        <div
                          key={item.id}
                          className={`
                            flex items-start gap-3 p-3 rounded-lg border transition-all
                            ${isConfirmed ? 'bg-primary/5 border-primary/20' : 'bg-card hover:bg-muted/50'}
                            cursor-pointer group
                          `}
                          onClick={() => toggleConfirm(item.id)}
                        >
                          <Checkbox
                            checked={isConfirmed}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              {item.category && (
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: categoryColor }}
                                />
                              )}
                              <h4 className="font-medium text-sm">{item.title}</h4>
                            </div>
                            {item.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {item.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {item.startTime}
                                {item.endTime && ` - ${item.endTime}`}
                              </span>
                              {item.category && (
                                <Badge variant="outline" className="text-xs">
                                  {item.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Confirm {confirmedCount} Item{confirmedCount !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
