import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, ArrowLeft, Loader2, Mail, TestTube } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { getGuestData, clearGuestData, getGuestMessageCount } from "@/lib/guest-storage";
import { initializeDemoMode, DEMO_CREDENTIALS } from "@/lib/demo-mode";
import { BRAND } from "@/config/brand";

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

By creating an account, you confirm that you have read, understood, and agree to these terms.
`;


export function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loginData, setLoginData] = useState({ email: "", password: "", rememberMe: false });
  const [registerData, setRegisterData] = useState({ email: "", password: "", confirmPassword: "" });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailSent, setForgotEmailSent] = useState(false);
  const [showDemoInfo, setShowDemoInfo] = useState(false);
  
  const guestMessageCount = getGuestMessageCount();

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; rememberMe?: boolean }) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Login failed");
      }
      return res.json() as Promise<{ user: { onboardingCompleted: boolean } }>;
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(["/api/auth/me"], { user: data.user });
      queryClient.invalidateQueries();
      toast({ title: "Welcome back!" });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email });
      return res.json();
    },
    onSuccess: () => {
      setForgotEmailSent(true);
    },
    onError: () => {
      toast({
        title: "That didn't go through.",
        description: "You can try again, or come back later.",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Registration failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      const guestData = getGuestData();
      const messageCount = guestData?.conversations.reduce((sum, conv) => sum + conv.messages.length, 0) || 0;
      if (messageCount > 0) {
        toast({ 
          title: "Account created!", 
          description: `Your ${messageCount} messages have been saved to your account.` 
        });
        clearGuestData();
      } else {
        toast({ title: "Account created successfully!" });
      }
      setLocation("/welcome");
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ 
      email: loginData.email, 
      password: loginData.password,
      rememberMe: loginData.rememberMe 
    });
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    forgotPasswordMutation.mutate(forgotEmail);
  };

  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotEmail("");
    setForgotEmailSent(false);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }
    if (registerData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    registerMutation.mutate({
      email: registerData.email,
      password: registerData.password,
    });
  };

  const handleDemoMode = () => {
    initializeDemoMode();
    toast({
      title: "Demo Mode Activated",
      description: "Exploring the app with pre-populated wellness data",
    });
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <header className="p-4 sm:p-6 flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" data-testid="link-back-home">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Chat
          </Button>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md sm:max-w-lg">
          <CardHeader className="text-center space-y-4">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                </div>
                <span className="font-display font-bold text-2xl sm:text-3xl tracking-tight">{BRAND.appName}</span>
              </div>
              <span className="text-xs text-muted-foreground tracking-wide uppercase">{BRAND.descriptor}</span>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-display">Welcome</CardTitle>
            <CardDescription className="font-body text-sm sm:text-base">
              {guestMessageCount > 0 
                ? `Sign up to save your ${guestMessageCount} messages and sync across devices`
                : "Sign in to your account or create a new one"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Demo Mode Banner for Reviewers - Enhanced for iPad visibility */}
            <div className="p-4 sm:p-5 bg-primary/10 border-2 border-primary/30 rounded-xl space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <TestTube className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                <h3 className="font-semibold text-sm sm:text-base">App Reviewers & Testers</h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Explore the full app with pre-populated wellness data - no account needed!
              </p>
              <div className="flex gap-2 sm:gap-3">
                <Button 
                  variant="outline" 
                  size="default"
                  onClick={handleDemoMode}
                  className="flex-1 h-10 sm:h-11 text-sm sm:text-base font-semibold"
                  data-testid="button-demo-mode"
                >
                  <TestTube className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Try Demo Mode
                </Button>
                <Button 
                  variant="ghost" 
                  size="default"
                  onClick={() => setShowDemoInfo(true)}
                  className="h-10 sm:h-11"
                  data-testid="button-demo-info"
                >
                  Info
                </Button>
              </div>
            </div>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-11 sm:h-12">
                <TabsTrigger value="login" data-testid="tab-login" className="text-sm sm:text-base">Log In</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register" className="text-sm sm:text-base">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm sm:text-base">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      placeholder="Enter your email"
                      required
                      className="h-10 sm:h-11 text-base"
                      data-testid="input-login-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-sm sm:text-base">Password</Label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(loginData.email);
                          setShowForgotPassword(true);
                        }}
                        className="text-xs sm:text-sm text-primary hover:underline min-h-[44px] flex items-center"
                        data-testid="link-forgot-password"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      placeholder="Enter your password"
                      required
                      className="h-10 sm:h-11 text-base"
                      data-testid="input-login-password"
                    />
                  </div>
                  <div className="flex items-center gap-2 min-h-[44px]">
                    <Checkbox
                      id="remember-me"
                      checked={loginData.rememberMe}
                      onCheckedChange={(checked) => setLoginData({ ...loginData, rememberMe: checked === true })}
                      className="h-5 w-5"
                      data-testid="checkbox-remember-me"
                    />
                    <label htmlFor="remember-me" className="text-sm sm:text-base text-muted-foreground cursor-pointer">
                      Remember me on this device
                    </label>
                  </div>
                  <Button
                    type="submit"
                    className="w-full rounded-full h-11 sm:h-12 text-base font-semibold"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? "Logging in..." : "Log In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-6">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-sm sm:text-base">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      placeholder="Enter your email"
                      required
                      className="h-10 sm:h-11 text-base"
                      data-testid="input-register-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-sm sm:text-base">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      placeholder="Choose a password (min 6 characters)"
                      required
                      className="h-10 sm:h-11 text-base"
                      data-testid="input-register-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm" className="text-sm sm:text-base">Confirm Password</Label>
                    <Input
                      id="register-confirm"
                      type="password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      placeholder="Confirm your password"
                      required
                      className="h-10 sm:h-11 text-base"
                      data-testid="input-register-confirm"
                    />
                  </div>
                  <div className="flex items-start gap-2 min-h-[44px]">
                    <Checkbox
                      id="terms"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                      className="h-5 w-5 mt-0.5"
                      data-testid="checkbox-terms"
                    />
                    <label htmlFor="terms" className="text-sm sm:text-base text-muted-foreground leading-tight cursor-pointer">
                      I agree to the{" "}
                      <button 
                        type="button"
                        onClick={() => setShowTerms(true)}
                        className="text-primary underline hover:no-underline min-h-[44px] inline-flex items-center"
                        data-testid="link-terms"
                      >
                        Terms of Use
                      </button>
                      {" "}and understand this is a wellness support tool, not a medical service.
                    </label>
                  </div>
                  <Button
                    type="submit"
                    className="w-full rounded-full h-11 sm:h-12 text-base font-semibold"
                    disabled={registerMutation.isPending || !agreedToTerms}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
      
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Terms of Use</DialogTitle>
            <DialogDescription>
              Please read our terms and disclaimer
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[50vh]">
            <div className="text-sm whitespace-pre-wrap break-words pr-4">
              {TERMS_OF_USE}
            </div>
          </ScrollArea>
          <Button onClick={() => setShowTerms(false)} data-testid="button-close-terms">
            Close
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showDemoInfo} onOpenChange={setShowDemoInfo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Demo Mode Information</DialogTitle>
            <DialogDescription>
              For app reviewers and testers
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">What's Included</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Pre-filled wellness conversations</li>
                <li>Sample goals, habits, and routines</li>
                <li>Mood tracking data (7 days)</li>
                <li>Calendar events and schedules</li>
                <li>Wellness insights and recommendations</li>
                <li>Complete profile configurations</li>
              </ul>
            </div>
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
              <h4 className="font-semibold text-sm mb-2">Demo Credentials</h4>
              <div className="space-y-1 text-xs font-mono">
                <p className="text-muted-foreground">Email:</p>
                <p className="font-semibold select-all">{DEMO_CREDENTIALS.username}</p>
                <p className="text-muted-foreground mt-2">Password:</p>
                <p className="font-semibold select-all">{DEMO_CREDENTIALS.password}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-3 italic">
                Note: Demo mode uses local storage only - no server authentication required
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowDemoInfo(false)} data-testid="button-close-demo-info">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showForgotPassword} onOpenChange={(open) => !open && closeForgotPassword()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              {forgotEmailSent 
                ? "Check your email for reset instructions" 
                : "Enter your email address and we'll send you a link to reset your password."}
            </DialogDescription>
          </DialogHeader>
          {forgotEmailSent ? (
            <div className="py-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                If an account exists for <span className="font-medium text-foreground">{forgotEmail}</span>, you'll receive an email with instructions to reset your password.
              </p>
              <Button onClick={closeForgotPassword} className="w-full" data-testid="button-close-forgot">
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  data-testid="input-forgot-email"
                />
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={forgotPasswordMutation.isPending}
                  data-testid="button-send-reset"
                >
                  {forgotPasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeForgotPassword}
                  data-testid="button-cancel-forgot"
                >
                  Cancel
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
