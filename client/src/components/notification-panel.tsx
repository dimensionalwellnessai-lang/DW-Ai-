import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, X, Sparkles, CheckCheck, Trash2, ChevronRight, AlertCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  dw_affirmation: { icon: <Sparkles className="h-4 w-4" />, color: "text-violet-500", label: "DW Insight" },
  dw_insight: { icon: <Sparkles className="h-4 w-4" />, color: "text-violet-500", label: "DW Insight" },
  accountability: { icon: <CheckCheck className="h-4 w-4" />, color: "text-green-500", label: "Accountability" },
  friend_request: { icon: <Users className="h-4 w-4" />, color: "text-blue-500", label: "Friend Request" },
  community_reply: { icon: <Users className="h-4 w-4" />, color: "text-indigo-500", label: "Community" },
  system: { icon: <AlertCircle className="h-4 w-4" />, color: "text-muted-foreground", label: "System" },
};

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  actionUrl?: string;
  created_at?: string;
}

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user && open,
    refetchInterval: open ? 15000 : false,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/api/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/notifications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const unread = notifications.filter((n) => !n.read).length;

  function handleNotifClick(n: Notification) {
    if (!n.read) markReadMutation.mutate(n.id);
    if (n.actionUrl) {
      setLocation(n.actionUrl);
      onClose();
    }
  }

  function formatTime(dateStr?: string) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full max-w-sm p-0 flex flex-col" data-testid="panel-notifications">
        <SheetHeader className="px-4 py-3 border-b border-border/40 flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Notifications
            </SheetTitle>
            {unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-muted-foreground"
                onClick={() => markAllReadMutation.mutate()}
                data-testid="button-mark-all-read"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
          {unread > 0 && (
            <p className="text-xs text-muted-foreground">{unread} unread</p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="h-6 w-6 text-primary/60" />
              </div>
              <p className="font-medium">All caught up</p>
              <p className="text-sm text-muted-foreground">DW will send affirmations, insights, and reminders here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {notifications.map((notif) => {
                const meta = TYPE_META[notif.type] ?? TYPE_META.system;
                return (
                  <div
                    key={notif.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors relative",
                      !notif.read && "bg-primary/5"
                    )}
                    onClick={() => handleNotifClick(notif)}
                    data-testid={`notif-item-${notif.id}`}
                  >
                    {!notif.read && (
                      <span className="absolute top-4 right-10 w-2 h-2 rounded-full bg-primary" />
                    )}
                    <div className={cn("mt-0.5 shrink-0", meta.color)}>{meta.icon}</div>
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
                        <span className="text-xs text-muted-foreground/60">{formatTime(notif.created_at)}</span>
                      </div>
                      <p className="text-sm font-medium leading-snug">{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 opacity-40 hover:opacity-100 self-start"
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(notif.id); }}
                      data-testid={`button-delete-notif-${notif.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function NotificationBell() {
  const { user } = useAuth();
  const [panelOpen, setPanelOpen] = useState(false);

  const { data } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/count"],
    enabled: !!user,
    refetchInterval: 60000,
  });

  const count = data?.count ?? 0;

  if (!user) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setPanelOpen(true)}
        data-testid="button-notification-bell"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-foreground" />
        {count > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Button>
      <NotificationPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}
