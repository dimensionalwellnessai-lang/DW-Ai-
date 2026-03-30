/**
 * Accept Accountability Partner Invite
 * Handles the /accountability/accept-invite/:token deep-link.
 */

import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, CheckCircle2, XCircle, Link2 } from "lucide-react";
import { apiRequest, parseApiError } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface InviteInfo {
  invitedEmail: string;
  requesterEmail: string;
  requesterName: string | null;
  invitedAt: string | null;
}

export default function AcceptInvitePage() {
  const [, params] = useRoute("/accountability/accept-invite/:token");
  const token = params?.token ?? "";
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [outcome, setOutcome] = useState<"accepted" | "declined" | null>(null);

  // If the user is not logged in, redirect to login with a return URL
  useEffect(() => {
    if (!authLoading && !isAuthenticated && token) {
      navigate(`/login?redirect=/accountability/accept-invite/${token}`);
    }
  }, [authLoading, isAuthenticated, navigate, token]);

  // Look up the invite details
  const { data: invite, isLoading, isError } = useQuery<InviteInfo>({
    queryKey: [`/api/accountability/partner/invite/${token}`],
    enabled: !!token && isAuthenticated,
    retry: 1,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/accountability/partner/accept/${token}`);
      return res.json();
    },
    onSuccess: () => {
      setOutcome("accepted");
      toast({ title: "Partner linked!", description: "You're now accountability partners." });
    },
    onError: (err: Error) => {
      toast({
        title: "Could not accept invite",
        description: parseApiError(err) ?? "The invite may have expired.",
        variant: "destructive",
      });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/accountability/partner/decline/${token}`);
      return res.json();
    },
    onSuccess: () => {
      setOutcome("declined");
      toast({ title: "Invite declined" });
    },
    onError: (err: Error) => {
      toast({
        title: "Could not decline invite",
        description: parseApiError(err) ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  // ── Loading ────────────────────────────────────────────────────────────────
  if (authLoading || !isAuthenticated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Outcome screens ────────────────────────────────────────────────────────
  if (outcome === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">You're linked!</h2>
            <p className="text-muted-foreground">
              You and your partner are now accountability partners. Go to your dashboard to see
              your shared progress.
            </p>
            <Button onClick={() => navigate("/accountability")} className="w-full">
              <Link2 className="w-4 h-4 mr-2" />
              View Accountability Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (outcome === "declined") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <XCircle className="w-16 h-16 text-muted-foreground mx-auto" />
            <h2 className="text-2xl font-bold">Invite declined</h2>
            <p className="text-muted-foreground">
              The invite has been declined. You can always accept another invite later.
            </p>
            <Button variant="outline" onClick={() => navigate("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <XCircle className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-2xl font-bold">Invite not found</h2>
            <p className="text-muted-foreground">
              This invite link may have expired or already been used.
            </p>
            <Button variant="outline" onClick={() => navigate("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Invite confirmation ────────────────────────────────────────────────────
  const requesterDisplay = invite.requesterName ?? invite.requesterEmail;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>Accountability Partner Invite</CardTitle>
          <CardDescription>
            <strong>{requesterDisplay}</strong> has invited you to be their accountability
            partner on DW - Dimensional Wellness AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">From:</span>{" "}
              <span className="font-medium">{invite.requesterEmail}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Sent to:</span>{" "}
              <span className="font-medium">{invite.invitedEmail}</span>
            </p>
            {invite.invitedAt && (
              <p>
                <span className="text-muted-foreground">Sent:</span>{" "}
                <span>{new Date(invite.invitedAt).toLocaleDateString()}</span>
              </p>
            )}
          </div>

          <p className="text-sm text-muted-foreground text-center">
            As accountability partners, you'll be able to support each other's commitments and
            follow-through.
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => declineMutation.mutate()}
              disabled={declineMutation.isPending || acceptMutation.isPending}
            >
              {declineMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Decline"
              )}
            </Button>
            <Button
              className="flex-1"
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending || declineMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Accept
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
