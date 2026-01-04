import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { SplashScreen, useSplashScreen } from "@/components/splash-screen";
import { isRouteEnabled } from "@/routes/registry";
import { TutorialProvider } from "@/contexts/tutorial-context";
import { TutorialOverlay } from "@/components/tutorial-overlay";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";

import { LoginPage } from "@/components/auth/login-page";
import { AIWorkspace } from "@/components/ai-workspace";
import { ChallengesPage } from "@/pages/challenges";
import { TalkItOutPage } from "@/pages/talk-it-out";
import { CalendarPlansPage } from "@/pages/calendar-plans";
import BrowsePage from "@/pages/browse";
import RoutinesPage from "@/pages/routines";
import WorkoutPage from "@/pages/workout";
import { RecoveryPage } from "@/pages/recovery";
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
import AppTourPage from "@/pages/app-tour";
import JournalPage from "@/pages/journal";
import WeeklyCheckinPage from "@/pages/weekly-checkin";
import { TasksPage } from "@/pages/tasks";

import PlansPage from "@/pages/plans";
import PlanBuilderPage from "@/pages/plan-builder";
import ScheduleReviewPage from "@/pages/schedule-review";
import ImportPage from "@/pages/import";
import ExportPage from "@/pages/export";
import CalendarMonthPage from "@/pages/calendar-month";
import CalendarSchedulePage from "@/pages/calendar-schedule";
import DevRoutesPage from "@/pages/dev-routes";
import NotFound404Page from "@/pages/not-found-404";
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
      {isRouteEnabled("/calendar/month") && <Route path="/calendar/month" component={CalendarMonthPage} />}
      {isRouteEnabled("/calendar/schedule") && <Route path="/calendar/schedule" component={CalendarSchedulePage} />}
      {isRouteEnabled("/daily-schedule") && <Route path="/daily-schedule" component={DailySchedulePage} />}
      {isRouteEnabled("/workout") && <Route path="/workout" component={WorkoutPage} />}
      {isRouteEnabled("/recovery") && <Route path="/recovery" component={RecoveryPage} />}
      {isRouteEnabled("/spiritual") && <Route path="/spiritual" component={SpiritualPage} />}
      {isRouteEnabled("/astrology") && <Route path="/astrology" component={AstrologyPage} />}
      {isRouteEnabled("/browse") && <Route path="/browse" component={BrowsePage} />}
      
      {isRouteEnabled("/talk") && <Route path="/talk" component={TalkItOutPage} />}
      {isRouteEnabled("/challenges") && <Route path="/challenges" component={ChallengesPage} />}
      {isRouteEnabled("/routines") && <Route path="/routines" component={RoutinesPage} />}
      {isRouteEnabled("/meal-prep") && <Route path="/meal-prep" component={MealPrepPage} />}
      {isRouteEnabled("/finances") && <Route path="/finances" component={FinancesPage} />}
      {isRouteEnabled("/feedback") && <Route path="/feedback" component={FeedbackPage} />}
      {isRouteEnabled("/weekly-checkin") && <Route path="/weekly-checkin" component={WeeklyCheckinPage} />}
      {isRouteEnabled("/journal") && <Route path="/journal" component={JournalPage} />}
      {isRouteEnabled("/settings") && <Route path="/settings" component={SettingsPage} />}
      {isRouteEnabled("/app-tour") && <Route path="/app-tour" component={AppTourPage} />}
      
      {isRouteEnabled("/plans") && <Route path="/plans" component={PlansPage} />}
      {isRouteEnabled("/plan-builder") && <Route path="/plan-builder" component={PlanBuilderPage} />}
      <Route path="/schedule-review/:draftId" component={ScheduleReviewPage} />
      {isRouteEnabled("/tasks") && <Route path="/tasks" component={TasksPage} />}
      {isRouteEnabled("/import") && <Route path="/import" component={ImportPage} />}
      <Route path="/export/:planId" component={ExportPage} />
      
      <Route path="/dev/routes" component={DevRoutesPage} />
      <Route path="/404" component={NotFound404Page} />
      
      <Route component={NotFound404Page} />
    </Switch>
  );
}

function App() {
  const { showSplash, handleSplashComplete } = useSplashScreen();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <TutorialProvider>
            {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
            {!showSplash && (
              <>
                <Toaster />
                <TutorialOverlay />
                <PWAInstallPrompt />
                <Router />
              </>
            )}
          </TutorialProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
