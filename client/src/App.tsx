import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { SplashScreen, useSplashScreen } from "@/components/splash-screen";

import { LoginPage } from "@/components/auth/login-page";
import { AIWorkspace } from "@/components/ai-workspace";
import { ChallengesPage } from "@/pages/challenges";
import { TalkItOutPage } from "@/pages/talk-it-out";
import { CalendarPlansPage } from "@/pages/calendar-plans";
import BrowsePage from "@/pages/browse";
import { BlueprintPage } from "@/pages/blueprint";
import { BodyScanPage } from "@/pages/body-scan";
import RoutinesPage from "@/pages/routines";
import WorkoutPage from "@/pages/workout";
import MealPrepPage from "@/pages/meal-prep";
import FinancesPage from "@/pages/finances";
import SpiritualPage from "@/pages/spiritual";
import LifeDashboardPage from "@/pages/life-dashboard";
import CommunityPage from "@/pages/community";
import { ProjectsPage } from "@/pages/projects";
import { SettingsPage } from "@/pages/settings";
import SystemsHubPage from "@/pages/systems-hub";
import DailySchedulePage from "@/pages/daily-schedule";
import FeedbackPage from "@/pages/feedback";
import AstrologyPage from "@/pages/astrology";
import WelcomePage from "@/pages/welcome";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AIWorkspace} />
      <Route path="/browse" component={BrowsePage} />
      <Route path="/challenges" component={ChallengesPage} />
      <Route path="/talk" component={TalkItOutPage} />
      <Route path="/calendar" component={CalendarPlansPage} />
      <Route path="/blueprint" component={BlueprintPage} />
      <Route path="/body-scan" component={BodyScanPage} />
      <Route path="/routines" component={RoutinesPage} />
      <Route path="/workout" component={WorkoutPage} />
      <Route path="/meal-prep" component={MealPrepPage} />
      <Route path="/finances" component={FinancesPage} />
      <Route path="/spiritual" component={SpiritualPage} />
      <Route path="/life-dashboard" component={LifeDashboardPage} />
      <Route path="/community" component={CommunityPage} />
      <Route path="/projects" component={ProjectsPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/systems" component={SystemsHubPage} />
      <Route path="/daily-schedule" component={DailySchedulePage} />
      <Route path="/feedback" component={FeedbackPage} />
      <Route path="/astrology" component={AstrologyPage} />
      <Route path="/welcome" component={WelcomePage} />
      <Route path="/login" component={LoginPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { showSplash, handleSplashComplete } = useSplashScreen();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
          {!showSplash && (
            <>
              <Toaster />
              <Router />
            </>
          )}
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
