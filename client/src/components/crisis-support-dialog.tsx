import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Phone, MessageCircle, ExternalLink, ArrowRight, Shield } from "lucide-react";
import { CRISIS_RESOURCES } from "@/lib/crisis-detection";

type CrisisStep = "confirm" | "support" | "continue" | "resume";

interface CrisisSupportDialogProps {
  open: boolean;
  onClose: () => void;
  onResume: (addMessage?: string, sendToAI?: boolean) => void;
  userMessage: string;
}

export function CrisisSupportDialog({ open, onClose, onResume, userMessage }: CrisisSupportDialogProps) {
  const [step, setStep] = useState<CrisisStep>("confirm");
  const [confirmedContinue, setConfirmedContinue] = useState(false);

  const handleYesAtRisk = () => {
    setStep("support");
  };

  const handleNoJustExpressing = () => {
    setStep("resume");
  };

  const handleContinueChatting = () => {
    if (!confirmedContinue) {
      setConfirmedContinue(true);
      return;
    }
    onResume("I understand you'd like to continue chatting. I'm here to help you feel grounded. Let's take this one moment at a time. What feels most present for you right now?");
    resetAndClose();
  };

  const handleResumeNormal = () => {
    onResume(undefined, true);
    resetAndClose();
  };

  const resetAndClose = () => {
    setStep("confirm");
    setConfirmedContinue(false);
    onClose();
  };

  const handleClose = () => {
    resetAndClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {step === "confirm" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-amber-500/10">
                  <Shield className="h-5 w-5 text-amber-500" />
                </div>
                <DialogTitle className="text-lg">Safety Check-In</DialogTitle>
              </div>
              <DialogDescription className="text-base leading-relaxed">
                I want to check in with you for safety.
                <br /><br />
                When you said that, did you mean you're feeling at risk of harming yourself right now?
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 pt-4">
              <Button 
                onClick={handleYesAtRisk}
                className="w-full justify-start gap-3"
                variant="outline"
                data-testid="button-yes-at-risk"
              >
                <Heart className="h-4 w-4" />
                Yes, I'm at risk
              </Button>
              <Button 
                onClick={handleNoJustExpressing}
                className="w-full justify-start gap-3"
                variant="outline"
                data-testid="button-no-expressing"
              >
                <MessageCircle className="h-4 w-4" />
                No, I'm just expressing feelings
              </Button>
            </div>
          </>
        )}

        {step === "support" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-pink-500/10">
                  <Heart className="h-5 w-5 text-pink-500" />
                </div>
                <DialogTitle className="text-lg">You Deserve Real Support</DialogTitle>
              </div>
              <DialogDescription className="text-base leading-relaxed">
                I'm really glad you said something. You took an important step.
                <br /><br />
                I can't provide emergency help, but you deserve real support right now from people trained for this.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <Card className="border-2 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{CRISIS_RESOURCES.US.name}</p>
                      <p className="text-sm text-muted-foreground mb-2">{CRISIS_RESOURCES.US.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <a href={`tel:${CRISIS_RESOURCES.US.phone}`}>
                          <Button size="sm" data-testid="button-call-988">
                            <Phone className="h-3 w-3 mr-1" />
                            Call {CRISIS_RESOURCES.US.phone}
                          </Button>
                        </a>
                        <a href={`sms:${CRISIS_RESOURCES.US.text}`}>
                          <Button size="sm" variant="outline" data-testid="button-text-988">
                            <MessageCircle className="h-3 w-3 mr-1" />
                            Text {CRISIS_RESOURCES.US.text}
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <a 
                href={CRISIS_RESOURCES.international.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="hover-elevate cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Outside the U.S.?</p>
                      <p className="text-xs text-muted-foreground">Find support in your country</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </a>
            </div>

            <div className="pt-4 border-t mt-4">
              <p className="text-sm text-muted-foreground mb-3">
                If you'd like, we can continue chatting for grounding support only.
              </p>
              <Button 
                onClick={handleContinueChatting}
                variant="ghost"
                className="w-full"
                data-testid="button-continue-grounding"
              >
                {confirmedContinue ? (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Confirm: Continue for Grounding
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Continue Chatting for Grounding
                  </>
                )}
              </Button>
              {confirmedContinue && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Tap again to confirm you understand this is grounding support, not crisis care.
                </p>
              )}
            </div>
          </>
        )}

        {step === "resume" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-green-500/10">
                  <Heart className="h-5 w-5 text-green-500" />
                </div>
                <DialogTitle className="text-lg">Thank You for Clarifying</DialogTitle>
              </div>
              <DialogDescription className="text-base leading-relaxed">
                I appreciate you letting me know. It's okay to express hard feelings here.
                <br /><br />
                We can keep talking, and I'll stay focused on support and reflection.
              </DialogDescription>
            </DialogHeader>
            <div className="pt-4">
              <Button 
                onClick={handleResumeNormal}
                className="w-full"
                data-testid="button-resume-chat"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Continue Conversation
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
