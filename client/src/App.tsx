import { useState } from "react";
import { Switch, Route, useLocation } from "wouter";
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
import { SyncTray } from "@/components/sync-tray";
import { BottomNav } from "@/components/bottom-nav";
import { FirstTimeAgreement, hasAcceptedTerms } from "@/components/first-time-agreement";

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
import ShoppingListPage from "@/pages/shopping-list";
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
import SystemsHubPage from "@/pages/systems-hub";
import CommunityPage from "@/pages/community";
import { BlueprintPage } from "@/pages/blueprint";
import TrainingSystemPage from "@/pages/systems/training";
import WakeUpSystemPage from "@/pages/systems/wake-up";
import WindDownSystemPage from "@/pages/systems/wind-down";
import DevRoutesPage from "@/pages/dev-routes";
import NotFound404Page from "@/pages/not-found-404";
import TodayHubPage from "@/pages/today-hub";

function Router() {
  return (
    <Switch>
      <Route path="/" component={TodayHubPage} />
      <Route path="/chat" component={AIWorkspace} />
      <Route path="/login" component={LoginPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/welcome" component={WelcomePage} />
      
      {isRouteEnabled("/life-dashboard") && <Route path="/life-dashboard" component={LifeDashboardPage} />}

      {/* Put specific calendar routes BEFORE /calendar so they actually render */}
      {isRouteEnabled("/calendar/month") && <Route path="/calendar/month" component={CalendarMonthPage} />}
      {isRouteEnabled("/calendar/schedule") && <Route path="/calendar/schedule" component={CalendarSchedulePage} />}

      {isRouteEnabled("/calendar") && <Route path="/calendar" component={CalendarPlansPage} />}
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
      {isRouteEnabled("/shopping-list") && <Route path="/shopping-list" component={ShoppingListPage} />}
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
      
      {isRouteEnabled("/systems") && <Route path="/systems" component={SystemsHubPage} />}
      {isRouteEnabled("/systems/training") && <Route path="/systems/training" component={TrainingSystemPage} />}
      {isRouteEnabled("/systems/wake-up") && <Route path="/systems/wake-up" component={WakeUpSystemPage} />}
      {isRouteEnabled("/systems/wind-down") && <Route path="/systems/wind-down" component={WindDownSystemPage} />}
      {isRouteEnabled("/community") && <Route path="/community" component={CommunityPage} />}
      {isRouteEnabled("/blueprint") && <Route path="/blueprint" component={BlueprintPage} />}
      
      <Route path="/dev/routes" component={DevRoutesPage} />
      <Route path="/404" component={NotFound404Page} />
      
      <Route component={NotFound404Page} />
    </Switch>
  );
}

const PAGES_WITHOUT_BOTTOM_NAV = ["/login", "/welcome", "/reset-password", "/app-tour"];

function AppContent() {
  const [location] = useLocation();
  const showBottomNav = !PAGES_WITHOUT_BOTTOM_NAV.some(path => location.startsWith(path));

  return (
    <>
      <Toaster />
      <TutorialOverlay />
      <PWAInstallPrompt />
      <SyncTray />
      <div className={showBottomNav ? "pb-20" : ""}>
        <Router />
      </div>
      {showBottomNav && <BottomNav />}
    </>
  );
}

function App() {
  const { showSplash, handleSplashComplete } = useSplashScreen();
  const [termsAccepted, setTermsAccepted] = useState(hasAcceptedTerms);

  const onSplashComplete = () => {
    handleSplashComplete();
  };

  const needsTerms = !showSplash && !termsAccepted;
  const showApp = !showSplash && termsAccepted;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <TutorialProvider>
            {showSplash && <SplashScreen onComplete={onSplashComplete} />}
            {needsTerms && (
              <FirstTimeAgreement onAccept={() => setTermsAccepted(true)} />
            )}
            {showApp && <AppContent />}
          </TutorialProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
