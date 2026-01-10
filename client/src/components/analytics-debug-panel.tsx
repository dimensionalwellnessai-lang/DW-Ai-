import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { X, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import type { StoredEvent } from "@/lib/analytics";

function getRelativeTime(ts: number): string {
  const now = Date.now();
  const diff = Math.floor((now - ts) / 1000);
  
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function EventCard({ event }: { event: StoredEvent }) {
  const [expanded, setExpanded] = useState(false);
  const hasPayload = event.payload != null && 
    typeof event.payload === "object" && 
    Object.keys(event.payload as object).length > 0;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-3 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-mono font-semibold text-sm text-foreground truncate">
              {event.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {getRelativeTime(event.ts)} · {event.env} · {event.sessionId.slice(0, 8)}
            </p>
          </div>
          {hasPayload && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 shrink-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
        {expanded && hasPayload && (
          <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto font-mono text-muted-foreground">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

interface AnalyticsDebugPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AnalyticsDebugPanel({ open, onClose }: AnalyticsDebugPanelProps) {
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!open) return;

    const updateEvents = () => {
      const ftsEvents = (window.__ftsEvents || []) as StoredEvent[];
      setEvents([...ftsEvents].reverse());
    };

    updateEvents();
    const interval = setInterval(updateEvents, 1000);
    return () => clearInterval(interval);
  }, [open, refreshKey]);

  if (!import.meta.env.DEV) {
    return null;
  }

  if (!open) {
    return null;
  }

  const handleClear = () => {
    window.__ftsEvents = [];
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Analytics (Dev)</h2>
          <p className="text-xs text-muted-foreground">Last session events</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleClear}>
            <Trash2 className="h-3 w-3 mr-1" />
            Clear
          </Button>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2 max-w-lg mx-auto">
          {events.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              No events logged yet
            </p>
          ) : (
            events.map((event, index) => (
              <EventCard key={`${event.name}-${event.ts}-${index}`} event={event} />
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t text-center">
        <p className="text-xs text-muted-foreground">
          {events.length} event{events.length !== 1 ? "s" : ""} logged this session
        </p>
      </div>
    </div>
  );
}
