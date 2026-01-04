import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "wouter";
import { ArrowLeft, Send, Heart, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FeedbackPage() {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      localStorage.setItem("dw_feedback_" + Date.now(), JSON.stringify({
        feedback: feedback.trim(),
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      }));
      
      setSubmitted(true);
      toast({
        title: "Thank you",
        description: "Your feedback means a lot to us.",
      });
    } catch {
      toast({
        title: "Couldn't save feedback",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 flex items-center justify-between border-b">
        <Link href="/">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Heart className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="font-display text-xl">
              {submitted ? "Thank you" : "Send Feedback"}
            </CardTitle>
            <CardDescription>
              {submitted 
                ? "Your thoughts help us make DW better for everyone."
                : "We're in early beta. Your honest feedback helps us improve."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Feel free to come back anytime with more thoughts.
                </p>
                <Link href="/">
                  <Button className="w-full" data-testid="button-return-home">
                    Return to DW
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="What's working? What's not? How do you feel using DW?"
                    className="min-h-[150px] resize-none"
                    data-testid="input-feedback"
                  />
                  <div className="text-xs text-muted-foreground">
                    Be honest. There are no wrong answers.
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={!feedback.trim() || isSubmitting}
                    data-testid="button-submit-feedback"
                  >
                    {isSubmitting ? (
                      "Sending..."
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Feedback
                      </>
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <a 
                  href="https://form.typeform.com/to/OqthU72n" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="outline" className="w-full" data-testid="link-typeform-feedback">
                    Open Detailed Feedback Form
                  </Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
