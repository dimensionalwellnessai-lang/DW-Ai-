/**
 * AddToSheet - Unified component for adding items across the app
 * Provides consistent way to add workouts, meals, meditations, habits, goals to calendar or routine
 */

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Repeat,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export interface AddToSheetItem {
  title: string;
  type: 'workout' | 'meal' | 'meditation' | 'habit' | 'goal';
  duration?: number;
  description?: string;
}

export interface AddToSheetProps {
  item: AddToSheetItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded?: (destination: string) => void;
}

export function AddToSheet({ item, open, onOpenChange, onAdded }: AddToSheetProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToToday = async () => {
    setIsAdding(true);
    try {
      // Add to calendar for today
      const today = new Date();
      const startTime = today.toISOString();
      const endTime = new Date(
        today.getTime() + (item.duration ?? 60) * 60 * 1000
      ).toISOString();

      await apiRequest("POST", "/api/calendar", {
        title: item.title,
        description: item.description,
        startTime,
        endTime,
        eventType: item.type,
      });

      toast({
        title: "Added to Today",
        description: `${item.title} has been added to your calendar for today.`,
      });

      onAdded?.('today');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add to calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddToThisWeek = async () => {
    setIsAdding(true);
    try {
      // Add to calendar for selected date this week
      if (!selectedDate) {
        toast({
          title: "Select a date",
          description: "Please select a date first.",
          variant: "destructive",
        });
        return;
      }

      const startTime = selectedDate.toISOString();
      const endTime = new Date(
        selectedDate.getTime() + (item.duration ?? 60) * 60 * 1000
      ).toISOString();

      await apiRequest("POST", "/api/calendar", {
        title: item.title,
        description: item.description,
        startTime,
        endTime,
        eventType: item.type,
      });

      toast({
        title: "Added to This Week",
        description: `${item.title} has been scheduled for ${selectedDate.toLocaleDateString()}.`,
      });

      onAdded?.('week');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add to calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddToRoutine = async () => {
    setIsAdding(true);
    try {
      // Add to routine (backend expects name and steps fields)
      await apiRequest("POST", "/api/routines", {
        name: item.title,
        description: item.description,
        steps: [], // Start with empty steps
        totalDurationMinutes: item.duration,
        isActive: true,
      });

      toast({
        title: "Added to Routine",
        description: `${item.title} has been added to your routine.`,
      });

      onAdded?.('routine');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add to routine. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add "{item.title}"</SheetTitle>
          <SheetDescription>
            Choose where you'd like to add this {item.type}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Add to Orbit */}
          <Button
            className="w-full justify-start h-auto py-4"
            variant="outline"
            onClick={handleAddToToday}
            disabled={isAdding}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Add to Orbit</p>
                <p className="text-sm text-muted-foreground">
                  Schedule for today's calendar
                </p>
              </div>
            </div>
          </Button>

          {/* Add to This Week */}
          <div className="space-y-3">
            <Button
              className="w-full justify-start h-auto py-4"
              variant="outline"
              onClick={handleAddToThisWeek}
              disabled={isAdding || !selectedDate}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 rounded-lg bg-blue-500/10 dark:bg-blue-400/15">
                  <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">Add to This Week</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedDate ? `Schedule for ${selectedDate.toLocaleDateString()}` : 'Select a date below'}
                  </p>
                </div>
              </div>
            </Button>

            <div className="pl-4">
              <Label className="text-sm text-muted-foreground mb-2 block">
                Select Date
              </Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </div>
          </div>

          {/* Add to Routine */}
          <Button
            className="w-full justify-start h-auto py-4"
            variant="outline"
            onClick={handleAddToRoutine}
            disabled={isAdding}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="p-2 rounded-lg bg-purple-500/10 dark:bg-purple-400/15">
                <Repeat className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Add to Routine</p>
                <p className="text-sm text-muted-foreground">
                  Make this a recurring activity
                </p>
              </div>
            </div>
          </Button>

          {item.duration && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
              <Clock className="h-4 w-4" />
              <span>{item.duration} minutes</span>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
