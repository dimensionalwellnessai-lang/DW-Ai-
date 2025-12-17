import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { LandingPage } from "@/components/landing-page";
import { LoginPage } from "@/components/auth/login-page";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { GoalsPage } from "@/components/dashboard/goals-page";
import { HabitsPage } from "@/components/dashboard/habits-page";
import { SchedulePage } from "@/components/dashboard/schedule-page";
import { CheckInPage } from "@/components/dashboard/checkin-page";
import { ProgressPage } from "@/components/dashboard/progress-page";
import { InsightsPage } from "@/components/dashboard/insights-page";
import NotFound from "@/pages/not-found";

function DashboardRoutes() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/dashboard" component={DashboardHome} />
        <Route path="/dashboard/goals" component={GoalsPage} />
        <Route path="/dashboard/habits" component={HabitsPage} />
        <Route path="/dashboard/schedule" component={SchedulePage} />
        <Route path="/dashboard/checkin" component={CheckInPage} />
        <Route path="/dashboard/progress" component={ProgressPage} />
        <Route path="/dashboard/insights" component={InsightsPage} />
        <Route component={DashboardHome} />
      </Switch>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/onboarding" component={OnboardingFlow} />
      <Route path="/dashboard/:rest*" component={DashboardRoutes} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
