import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles } from "lucide-react";

const TERMS_OF_USE = `
Terms of Use & Disclaimer

Last updated: January 2026

1. Purpose of Service

Flip the Switch ("A Dimensional Wellness AI") is a wellness support tool designed to help users reflect on their wellbeing, organize their daily routines, and explore personal growth. The service provides AI-assisted guidance, tracking features, and educational content.

2. Not a Medical Service

IMPORTANT: Flip the Switch is NOT a medical device, healthcare provider, or mental health treatment service. The content, features, and AI responses provided through this platform:

- Are for informational and self-reflection purposes only
- Do not constitute medical advice, diagnosis, or treatment
- Should not be used as a substitute for professional medical advice
- Are not intended to treat, cure, or prevent any medical or psychological condition

3. Seek Professional Help

If you are experiencing a mental health crisis, medical emergency, or have concerns about your physical or mental health, please:

- Contact your healthcare provider
- Call emergency services (911 in the US)
- Reach out to a crisis helpline

4. User Responsibility

By using this service, you acknowledge that:

- You are responsible for your own health decisions
- You will consult qualified professionals for medical or mental health concerns
- The AI responses are generated content and may not always be accurate
- You use this service at your own discretion and risk

5. Privacy & Data

We respect your privacy. Your conversations and personal data are stored securely and are not shared with third parties for marketing purposes. See our Privacy Policy for details.

6. Acceptance

By continuing, you confirm that you have read, understood, and agree to these terms.
`;

const STORAGE_KEY = "fts_terms_accepted";

export function hasAcceptedTerms(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setTermsAccepted(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // localStorage not available
  }
}

interface FirstTimeAgreementProps {
  onAccept: () => void;
}

export function FirstTimeAgreement({ onAccept }: FirstTimeAgreementProps) {
  const [agreed, setAgreed] = useState(false);

  const handleAccept = () => {
    setTermsAccepted();
    onAccept();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-semibold">Welcome to Flip the Switch</h1>
          <p className="text-muted-foreground">
            Before we begin, please review our terms
          </p>
        </div>

        <div className="bg-card border rounded-lg">
          <ScrollArea className="h-64 p-4">
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans">
              {TERMS_OF_USE}
            </pre>
          </ScrollArea>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="agree-terms"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              data-testid="checkbox-first-time-terms"
            />
            <label htmlFor="agree-terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
              I have read and agree to the Terms of Use and understand this is not a medical service
            </label>
          </div>

          <Button
            onClick={handleAccept}
            disabled={!agreed}
            className="w-full"
            data-testid="button-accept-terms"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
