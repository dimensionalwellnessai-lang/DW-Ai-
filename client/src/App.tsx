import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { SplashScreen, useSplashScreen } from "@/components/splash-screen";
import { isRouteEnabled } from "@/lib/routes";

import { LoginPage } from "@/components/auth/login-page";
import { AIWorkspace } from "@/components/ai-workspace";
import { ChallengesPage } from "@/pages/challenges";
import { TalkItOutPage } from "@/pages/talk-it-out";
import { CalendarPlansPage } from "@/pages/calendar-plans";
import BrowsePage from "@/pages/browse";
import RoutinesPage from "@/pages/routines";
import WorkoutPage from "@/pages/workout";
import MealPrepPage from "@/pages/meal-prep";
import FinancesPage from "@/pages/finances";
import SpiritualPage from "@/pages/spiritual";
import LifeDashboardPage from "@/pages/life-dashboard";
import { SettingsPage } from "@/pages/settings";
import DailySchedulePage from "@/pages/daily-schedule";
import FeedbackPage from "@/pages/feedback";
import AstrologyPage from "@/pages/astrology";
import WelcomePage from "@/pages/welcome";
import ResetPasswordPage from "@/pages/reset-password";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AIWorkspace} />
      <Route path="/login" component={LoginPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/welcome" component={WelcomePage} />
      
      {isRouteEnabled("/life-dashboard") && <Route path="/life-dashboard" component={LifeDashboardPage} />}
      {isRouteEnabled("/calendar") && <Route path="/calendar" component={CalendarPlansPage} />}
      {isRouteEnabled("/daily-schedule") && <Route path="/daily-schedule" component={DailySchedulePage} />}
      {isRouteEnabled("/workout") && <Route path="/workout" component={WorkoutPage} />}
      {isRouteEnabled("/spiritual") && <Route path="/spiritual" component={SpiritualPage} />}
      {isRouteEnabled("/astrology") && <Route path="/astrology" component={AstrologyPage} />}
      {isRouteEnabled("/browse") && <Route path="/browse" component={BrowsePage} />}
      
      {isRouteEnabled("/talk") && <Route path="/talk" component={TalkItOutPage} />}
      {isRouteEnabled("/challenges") && <Route path="/challenges" component={ChallengesPage} />}
      {isRouteEnabled("/routines") && <Route path="/routines" component={RoutinesPage} />}
      {isRouteEnabled("/meal-prep") && <Route path="/meal-prep" component={MealPrepPage} />}
      {isRouteEnabled("/finances") && <Route path="/finances" component={FinancesPage} />}
      {isRouteEnabled("/feedback") && <Route path="/feedback" component={FeedbackPage} />}
      {isRouteEnabled("/settings") && <Route path="/settings" component={SettingsPage} />}
      
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
