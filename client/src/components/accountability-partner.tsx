/**
 * Accountability Partner
 * Invite, accept, display partner status, and unlink an accountability partner.
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Users,
  UserPlus,
  Mail,
  Link2,
  Link2Off,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Loader2,
} from "lucide-react";
import { apiRequest, queryClient, parseApiError } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AccountabilityPartner as PartnerRecord } from "@shared/schema";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActivePartnership {
  partner: PartnerRecord;
  partnerEmail: string;
  partnerName: string | null;
  role: "requester" | "recipient";
}

interface PartnerData {
  active: ActivePartnership | null;
  pending: PartnerRecord[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AccountabilityPartner() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Fetch current partnership state
  const { data, isLoading, isError } = useQuery<PartnerData>({
    queryKey: ["/api/accountability/partner"],
    retry: 1,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/accountability/partner"] });

  // Send invite
  const inviteMutation = useMutation({
    mutationFn: async (inviteEmail: string) => {
      const res = await apiRequest("POST", "/api/accountability/partner/invite", {
        email: inviteEmail,
      });
      return res.json();
    },
    onSuccess: (data, inviteEmail) => {
      invalidate();
      setEmail("");
      setShowInviteForm(false);
      if (data?.emailSent) {
        toast({
          title: "Invite sent!",
          description: `We emailed an invite to ${inviteEmail}. The link is also shown below.`,
        });
      } else {
        toast({
          title: "Invite link created",
          description: `We couldn't email ${inviteEmail} right now, so share the invite link below with them directly.`,
        });
      }
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to send invite",
        description: parseApiError(err) ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Unlink active partner
  const unlinkMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/accountability/partner");
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Partner unlinked", description: "Your accountability partnership has ended." });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to unlink",
        description: parseApiError(err) ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Cancel a pending invite
  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      await apiRequest("DELETE", `/api/accountability/partner/invite/${inviteId}`);
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Invite cancelled" });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to cancel invite",
        description: parseApiError(err) ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    inviteMutation.mutate(email.trim());
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/accountability/accept-invite/${token}`;
    navigator.clipboard.writeText(link).then(
      () => {
        toast({ title: "Link copied!", description: "Share this link with your partner." });
      },
      () => {
        toast({
          title: "Could not copy link",
          description: `Copy this link manually: ${link}`,
          variant: "destructive",
        });
      }
    );
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Accountability Partner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-3 py-6 text-center text-muted-foreground">
            <XCircle className="w-10 h-10 text-destructive" />
            <p>Could not load partner info. Please try again later.</p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["/api/accountability/partner"] })
            }
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const active = data?.active ?? null;
  const pending = data?.pending ?? [];

  // ── Active Partnership ────────────────────────────────────────────────────
  if (active) {
    const display = active.partnerName ?? active.partnerEmail;
    const linkedDate = active.partner.acceptedAt
      ? new Date(active.partner.acceptedAt).toLocaleDateString()
      : "Unknown";

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Accountability Partner
            </CardTitle>
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Linked
            </Badge>
          </div>
          <CardDescription>You and your partner are keeping each other on track.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Partner info */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{display}</p>
              {active.partnerName && (
                <p className="text-sm text-muted-foreground truncate">{active.partnerEmail}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                <Link2 className="w-3 h-3 inline mr-1" />
                Linked since {linkedDate}
              </p>
            </div>
          </div>

          <Separator />

          {/* Unlink */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                disabled={unlinkMutation.isPending}
              >
                {unlinkMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Link2Off className="w-4 h-4 mr-2" />
                )}
                Unlink Partner
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unlink Accountability Partner?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will end your accountability partnership with{" "}
                  <strong>{display}</strong>. You can always invite someone new later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => unlinkMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Unlink
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    );
  }

  // ── No Active Partnership ─────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Accountability Partner
        </CardTitle>
        <CardDescription>
          Invite someone you trust to be your accountability partner. They'll share in your
          commitment journey.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Empty state */}
        {pending.length === 0 && !showInviteForm && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">No partner yet</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Sharing your goals with an accountability partner can significantly boost
                follow-through.
              </p>
            </div>
            <Button onClick={() => setShowInviteForm(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite a Partner
            </Button>
          </div>
        )}

        {/* Invite form — only shown when there are no pending invites yet */}
        {showInviteForm && pending.length === 0 && (
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="partner-email">Partner's email address</Label>
              <div className="flex gap-2">
                <Input
                  id="partner-email"
                  type="email"
                  placeholder="partner@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={inviteMutation.isPending || !email.trim()}
                >
                  {inviteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">Send Invite</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                We'll create an invite link you can share with them directly.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setShowInviteForm(false); setEmail(""); }}
            >
              Cancel
            </Button>
          </form>
        )}

        {/* Pending invites */}
        {pending.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Pending Invites
              </h4>
              {!showInviteForm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInviteForm(true)}
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  New Invite
                </Button>
              )}
            </div>

            {pending.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{invite.invitedEmail}</p>
                  <p className="text-xs text-muted-foreground">
                    Sent{" "}
                    {invite.invitedAt
                      ? new Date(invite.invitedAt).toLocaleDateString()
                      : "recently"}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyInviteLink(invite.inviteToken)}
                    title="Copy invite link"
                    aria-label="Copy invite link"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={cancelInviteMutation.isPending}
                    onClick={() => cancelInviteMutation.mutate(invite.id)}
                    title="Cancel invite"
                    aria-label="Cancel invite"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {showInviteForm && (
              <>
                <Separator />
                <form onSubmit={handleInviteSubmit} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="partner-email-2">Invite another partner</Label>
                    <div className="flex gap-2">
                      <Input
                        id="partner-email-2"
                        type="email"
                        placeholder="partner@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                        className="flex-1"
                      />
                      <Button type="submit" disabled={inviteMutation.isPending || !email.trim()}>
                        {inviteMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowInviteForm(false); setEmail(""); }}
                  >
                    Cancel
                  </Button>
                </form>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
