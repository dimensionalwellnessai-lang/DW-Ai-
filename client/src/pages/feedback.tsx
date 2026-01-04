import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Send, Heart, CheckCircle, HelpCircle, Frown, Zap, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { apiRequest } from "@/lib/queryClient";

const FEEDBACK_CATEGORIES = [
  { id: "confusion", label: "Confused about something", icon: HelpCircle },
  { id: "friction", label: "Something felt hard to use", icon: Frown },
  { id: "emotional_load", label: "Felt heavy or overwhelming", icon: Zap },
  { id: "clarity", label: "Needs clearer explanation", icon: Eye },
] as const;

type FeedbackCategory = typeof FEEDBACK_CATEGORIES[number]["id"];

export default function FeedbackPage() {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState("");
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const feedbackData = {
        category: category || "general",
        message: feedback.trim(),
        pageContext: window.location.pathname,
        metadata: { userAgent: navigator.userAgent },
      };
      
      try {
        await apiRequest("POST", "/api/feedback", feedbackData);
      } catch {
        localStorage.setItem("fts_feedback_" + Date.now(), JSON.stringify({
          ...feedbackData,
          timestamp: new Date().toISOString(),
        }));
      }
      
      setSubmitted(true);
      toast({
        title: "Noted.",
        description: "Your feedback means a lot.",
      });
    } catch {
      toast({
        title: "That didn't save.",
        description: "You can try again, or come back later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader title="Feedback" backPath="/" />

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
                ? "Your thoughts help us make Flip the Switch better for everyone."
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
                    Return Home
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">What best describes your feedback?</p>
                    <div className="flex flex-wrap gap-2">
                      {FEEDBACK_CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        const isSelected = category === cat.id;
                        return (
                          <Badge
                            key={cat.id}
                            variant={isSelected ? "default" : "outline"}
                            className={`cursor-pointer transition-colors ${isSelected ? "" : "text-muted-foreground"}`}
                            onClick={() => setCategory(isSelected ? null : cat.id)}
                            data-testid={`badge-category-${cat.id}`}
                          >
                            <Icon className="h-3 w-3 mr-1" />
                            {cat.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="What's working? What's not? How do you feel using Flip the Switch?"
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
