import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  RefreshCw, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp,
  Calendar,
  Clock,
  Target,
  Repeat
} from "lucide-react";
import type { AiSyncSession, AiSyncItem } from "@shared/schema";

interface SyncTrayData {
  session: AiSyncSession;
  items: AiSyncItem[];
  groupedItems: Record<string, AiSyncItem[]>;
  ungroupedItems: AiSyncItem[];
}

export function SyncTray() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [dismissedSessionId, setDismissedSessionId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<SyncTrayData | null>({
    queryKey: ["/api/sync/sessions/active"],
    refetchInterval: 2000,
  });

  const acceptGroupMutation = useMutation({
    mutationFn: async ({ sessionId, groupKey }: { sessionId: string; groupKey: string }) => {
      return apiRequest("POST", `/api/sync/items/group/${sessionId}/${groupKey}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync/sessions/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
    },
  });

  const rejectGroupMutation = useMutation({
    mutationFn: async ({ sessionId, groupKey }: { sessionId: string; groupKey: string }) => {
      return apiRequest("POST", `/api/sync/items/group/${sessionId}/${groupKey}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync/sessions/active"] });
    },
  });

  const acceptItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiRequest("PATCH", `/api/sync/items/${itemId}`, { status: "accepted", userDecision: "accepted" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync/sessions/active"] });
    },
  });

  const rejectItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiRequest("PATCH", `/api/sync/items/${itemId}`, { status: "rejected", userDecision: "rejected" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync/sessions/active"] });
    },
  });

  if (isLoading || !data || data.session.id === dismissedSessionId) {
    return null;
  }

  const { session, groupedItems, ungroupedItems } = data;
  const totalItems = session.totalItems || 0;
  const processedItems = session.processedItems || 0;
  const progress = totalItems > 0 ? (processedItems / totalItems) * 100 : 0;

  const pendingGroups = Object.entries(groupedItems).filter(
    ([_, items]) => items.some(item => item.status === "pending")
  );
  const pendingUngrouped = ungroupedItems.filter(item => item.status === "pending");

  const hasNoPendingItems = pendingGroups.length === 0 && pendingUngrouped.length === 0;

  if (hasNoPendingItems && session.status !== "processing") {
    return null;
  }

  const getItemIcon = (itemType: string) => {
    switch (itemType) {
      case "event":
        return <Calendar className="h-4 w-4" />;
      case "goal":
        return <Target className="h-4 w-4" />;
      case "habit":
        return <Repeat className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatTime = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <Card 
      className="fixed bottom-4 right-4 z-50 w-80 shadow-lg border"
      data-testid="sync-tray"
    >
      <div className="p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${session.status === "processing" ? "animate-spin" : ""}`} />
            <span className="text-sm font-medium">
              {session.status === "processing" ? "Syncing..." : "Review Items"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid="button-sync-toggle-expand"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setDismissedSessionId(session.id)}
              data-testid="button-sync-dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {session.status === "processing" && (
          <div className="mb-3">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {processedItems} of {totalItems} items processed
            </p>
          </div>
        )}

        {isExpanded && (
          <ScrollArea className="max-h-64">
            <div className="space-y-2">
              {pendingGroups.map(([groupKey, items]) => {
                const firstItem = items[0];
                const isRecurring = items.length > 1;
                
                return (
                  <div 
                    key={groupKey} 
                    className="p-2 rounded-md bg-muted/50 space-y-2"
                    data-testid={`sync-group-${groupKey}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {getItemIcon(firstItem.itemType)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{firstItem.title}</p>
                          {isRecurring && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              <Repeat className="h-3 w-3 mr-1" />
                              {items.length} occurrences
                            </Badge>
                          )}
                          {firstItem.startTime && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(firstItem.startTime)} at {formatTime(firstItem.startTime)}
                            </p>
                          )}
                          {firstItem.recurrencePattern && (
                            <p className="text-xs text-muted-foreground">
                              {firstItem.recurrencePattern}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={() => acceptGroupMutation.mutate({ sessionId: session.id, groupKey })}
                        disabled={acceptGroupMutation.isPending}
                        data-testid={`button-accept-group-${groupKey}`}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Accept {isRecurring ? "All" : ""}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => rejectGroupMutation.mutate({ sessionId: session.id, groupKey })}
                        disabled={rejectGroupMutation.isPending}
                        data-testid={`button-reject-group-${groupKey}`}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Skip
                      </Button>
                    </div>
                  </div>
                );
              })}

              {pendingUngrouped.map((item) => (
                <div 
                  key={item.id} 
                  className="p-2 rounded-md bg-muted/50 space-y-2"
                  data-testid={`sync-item-${item.id}`}
                >
                  <div className="flex items-start gap-2">
                    {getItemIcon(item.itemType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {item.startTime && (
                        <p className="text-xs text-muted-foreground">
                          {formatDate(item.startTime)} at {formatTime(item.startTime)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1"
                      onClick={() => acceptItemMutation.mutate(item.id)}
                      disabled={acceptItemMutation.isPending}
                      data-testid={`button-accept-item-${item.id}`}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => rejectItemMutation.mutate(item.id)}
                      disabled={rejectItemMutation.isPending}
                      data-testid={`button-reject-item-${item.id}`}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Skip
                    </Button>
                  </div>
                </div>
              ))}

              {hasNoPendingItems && session.status === "processing" && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Processing items...
                </p>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </Card>
  );
}
