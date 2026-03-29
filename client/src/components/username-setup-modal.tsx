import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Sparkles, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface UsernameSetupModalProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

type Availability = "unchecked" | "checking" | "available" | "taken" | "invalid";

export function UsernameSetupModal({ open, onClose, onComplete }: UsernameSetupModalProps) {
  const { user, refetch: refetchUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dwName, setDwName] = useState((user as any)?.systemName || (user as any)?.firstName || "");
  const [username, setUsername] = useState((user as any)?.username || "");
  const [availability, setAvailability] = useState<Availability>("unchecked");
  const [availabilityMsg, setAvailabilityMsg] = useState("");
  const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!username || username.length < 3) {
      setAvailability("unchecked");
      setAvailabilityMsg("");
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      setAvailability("invalid");
      setAvailabilityMsg("Only letters, numbers, _ . -");
      return;
    }
    setAvailability("checking");
    if (checkTimeout.current) clearTimeout(checkTimeout.current);
    checkTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        if (data.available) {
          setAvailability("available");
          setAvailabilityMsg("@" + username + " is available ✓");
        } else {
          setAvailability("taken");
          setAvailabilityMsg(data.reason || "Username already taken");
        }
      } catch {
        setAvailability("unchecked");
      }
    }, 500);
    return () => { if (checkTimeout.current) clearTimeout(checkTimeout.current); };
  }, [username]);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/users/set-username", { username, systemName: dwName }),
    onSuccess: async () => {
      toast({ title: "Profile updated", description: `Welcome, @${username}! DW will call you ${dwName || "friend"}.` });
      if (refetchUser) await refetchUser();
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      onComplete?.();
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Couldn't save", description: err?.message || "Please try again", variant: "destructive" });
    },
  });

  const canSave = dwName.trim().length > 0 && username.length >= 3 && (availability === "available" || (username === (user as any)?.username));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm" data-testid="modal-username-setup">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>Set up your identity</DialogTitle>
          </div>
          <DialogDescription>
            Tell DW what to call you, and choose a public username for community interactions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <div className="space-y-2">
            <Label htmlFor="dw-name">What should DW call you?</Label>
            <Input
              id="dw-name"
              placeholder="Your name or nickname"
              value={dwName}
              onChange={(e) => setDwName(e.target.value)}
              maxLength={40}
              data-testid="input-dw-name"
            />
            <p className="text-xs text-muted-foreground">This is private — only DW uses it.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Choose a username</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input
                id="username"
                className="pl-7"
                placeholder="yourhandle"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                maxLength={30}
                data-testid="input-username"
              />
              {availability === "checking" && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {availability === "available" && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
              {(availability === "taken" || availability === "invalid") && (
                <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
              )}
            </div>
            {availabilityMsg && (
              <p className={`text-xs ${availability === "available" ? "text-green-600" : "text-destructive"}`}>
                {availabilityMsg}
              </p>
            )}
            <p className="text-xs text-muted-foreground">Visible in community chats and posts. Letters, numbers, _ . - only.</p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" onClick={onClose} className="flex-1" data-testid="button-username-skip">
              Later
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!canSave || saveMutation.isPending}
              className="flex-1"
              data-testid="button-username-save"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
