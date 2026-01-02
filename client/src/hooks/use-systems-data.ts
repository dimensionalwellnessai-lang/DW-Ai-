import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  getSystemPreferences,
  saveSystemPreferences as saveGuestPreferences,
  getScheduleEvents,
  saveScheduleEventWithId as saveGuestScheduleEvent,
  deleteScheduleEvent as deleteGuestScheduleEvent,
  type SystemPreferences,
  type ScheduleEvent,
  type SystemType,
} from "@/lib/guest-storage";
import type { UserSystemPreferences, DailyScheduleEvent } from "@shared/schema";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function useSystemPreferences() {
  const [guestPrefs, setGuestPrefs] = useState<SystemPreferences>(() => getSystemPreferences());

  const apiQuery = useQuery<UserSystemPreferences | null>({
    queryKey: ["/api/system-preferences"],
    retry: false,
    staleTime: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<SystemPreferences>) => {
      return apiRequest("PATCH", "/api/system-preferences", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-preferences"] });
    },
  });

  const isAuthenticated = !apiQuery.error && apiQuery.data !== undefined;
  
  const savePreferencesGuest = useCallback((updates: Partial<SystemPreferences>) => {
    setGuestPrefs(prev => {
      const newPrefs = { ...prev, ...updates, updatedAt: Date.now() };
      saveGuestPreferences(updates);
      return newPrefs;
    });
  }, []);

  const toggleSystemGuest = useCallback((systemType: SystemType, enabled: boolean) => {
    setGuestPrefs(prev => {
      const newSystems = enabled
        ? [...prev.enabledSystems.filter(s => s !== systemType), systemType]
        : prev.enabledSystems.filter(s => s !== systemType);
      const newPrefs = { ...prev, enabledSystems: newSystems, updatedAt: Date.now() };
      saveGuestPreferences({ enabledSystems: newSystems });
      return newPrefs;
    });
  }, []);

  const isSystemEnabledGuest = useCallback((systemType: SystemType) => {
    return guestPrefs.enabledSystems.includes(systemType);
  }, [guestPrefs.enabledSystems]);
  
  if (isAuthenticated && apiQuery.data) {
    const serverPrefs = apiQuery.data;
    const prefs: SystemPreferences = {
      enabledSystems: (serverPrefs.enabledSystems || ["wake_up", "meals", "training", "wind_down"]) as SystemType[],
      meditationEnabled: serverPrefs.meditationEnabled ?? false,
      spiritualEnabled: serverPrefs.spiritualEnabled ?? false,
      astrologyEnabled: serverPrefs.astrologyEnabled ?? false,
      journalingEnabled: serverPrefs.journalingEnabled ?? true,
      mealContainersEnabled: serverPrefs.mealContainersEnabled ?? true,
      aiRoutingEnabled: serverPrefs.aiRoutingEnabled ?? true,
      preferredWakeTime: serverPrefs.preferredWakeTime || "07:00",
      preferredSleepTime: serverPrefs.preferredSleepTime || "22:00",
      updatedAt: serverPrefs.updatedAt ? new Date(serverPrefs.updatedAt).getTime() : Date.now(),
    };
    
    return {
      prefs,
      isLoading: apiQuery.isLoading,
      isAuthenticated: true,
      savePreferences: (updates: Partial<SystemPreferences>) => {
        updateMutation.mutate(updates);
      },
      isSystemEnabled: (systemType: SystemType) => prefs.enabledSystems.includes(systemType),
      toggleSystem: (systemType: SystemType, enabled: boolean) => {
        const newSystems = enabled
          ? [...prefs.enabledSystems.filter(s => s !== systemType), systemType]
          : prefs.enabledSystems.filter(s => s !== systemType);
        updateMutation.mutate({ enabledSystems: newSystems });
      },
    };
  }
  
  return {
    prefs: guestPrefs,
    isLoading: apiQuery.isLoading,
    isAuthenticated: false,
    savePreferences: savePreferencesGuest,
    isSystemEnabled: isSystemEnabledGuest,
    toggleSystem: toggleSystemGuest,
  };
}

export function useScheduleEvents(dayOfWeek?: number) {
  const [guestEvents, setGuestEvents] = useState<ScheduleEvent[]>(() => getScheduleEvents());

  const apiQuery = useQuery<DailyScheduleEvent[]>({
    queryKey: ["/api/schedule-events", { day: dayOfWeek }],
    retry: false,
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: async (event: Omit<ScheduleEvent, "id">) => {
      return apiRequest("POST", "/api/schedule-events", event);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-events"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/schedule-events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-events"] });
    },
  });

  const createEventGuest = useCallback((event: Omit<ScheduleEvent, "id">) => {
    const newEvent: ScheduleEvent = {
      ...event,
      id: generateId(),
      createdAt: event.createdAt || Date.now(),
    };
    setGuestEvents(prev => {
      const updated = [...prev, newEvent];
      saveGuestScheduleEvent(newEvent);
      return updated;
    });
  }, []);

  const deleteEventGuest = useCallback((id: string) => {
    setGuestEvents(prev => {
      const updated = prev.filter(e => e.id !== id);
      deleteGuestScheduleEvent(id);
      return updated;
    });
  }, []);

  const isAuthenticated = !apiQuery.error && apiQuery.data !== undefined;
  
  if (isAuthenticated && apiQuery.data) {
    const serverEvents = apiQuery.data;
    const events: ScheduleEvent[] = serverEvents.map(e => ({
      id: e.id,
      title: e.title,
      scheduledTime: e.scheduledTime,
      endTime: e.endTime,
      dayOfWeek: e.dayOfWeek ?? 0,
      systemReference: e.systemReference,
      systemType: e.systemType as SystemType | null,
      isRecurring: e.isRecurring ?? false,
      notes: e.notes || "",
      createdAt: e.createdAt ? new Date(e.createdAt).getTime() : Date.now(),
    }));

    const filteredEvents = dayOfWeek !== undefined 
      ? events.filter(e => e.dayOfWeek === dayOfWeek || e.isRecurring)
      : events;

    return {
      events: filteredEvents,
      isLoading: apiQuery.isLoading,
      isAuthenticated: true,
      createEvent: (event: Omit<ScheduleEvent, "id">) => {
        createMutation.mutate(event);
      },
      deleteEvent: (id: string) => {
        deleteMutation.mutate(id);
      },
    };
  }
  
  const filteredEvents = dayOfWeek !== undefined
    ? guestEvents.filter(e => e.dayOfWeek === dayOfWeek || e.isRecurring)
    : guestEvents;
  
  return {
    events: filteredEvents,
    isLoading: apiQuery.isLoading,
    isAuthenticated: false,
    createEvent: createEventGuest,
    deleteEvent: deleteEventGuest,
  };
}
