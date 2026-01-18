import { useState, useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
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
import { trackNewDayOpen } from "@/lib/analytics";

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
import PrivacyTermsPage from "@/pages/privacy-terms";
import LifeSwitchboardPage from "@/pages/life-switchboard";
import SwitchTrainingPage from "@/pages/switch-training";
import SwitchboardIntakePage from "@/pages/switchboard-intake";
import FTSHomePage from "@/pages/fts-home";
import PlanPage from "@/pages/plan-page";
import MyProgressPage from "@/pages/my-progress";
import AdminAnalyticsPage from "@/pages/admin-analytics";
import MoodTrackerPage from "@/pages/mood-tracker";

function isProfileSetupComplete(): boolean {
  try {
    const data = localStorage.getItem("fts_guest_data");
    if (data) {
      const parsed = JSON.parse(data);
      return !!parsed.profileSetup?.completedAt;
    }
  } catch {}
  return false;
}

function isReturningUser(): boolean {
  try {
    // First check if setup was skipped - skipped users are NOT returning
    const data = localStorage.getItem("fts_guest_data");
    if (data) {
      const parsed = JSON.parse(data);
      const profile = parsed.profileSetup;
      // If skipped, never treat as returning
      if (profile?.skipped) return false;
      // If completed (not skipped), treat as returning
      if (profile?.completedAt) return true;
    }
    
    // Check explicit returning flag (set on setup completion)
    if (localStorage.getItem("fts:isReturning") === "1") return true;
    
    // Check if activated (took a meaningful action)
    if (localStorage.getItem("fts:activatedAt")) return true;
  } catch {}
  return false;
}

function wasSetupSkipped(): boolean {
  try {
    const data = localStorage.getItem("fts_guest_data");
    if (data) {
      const parsed = JSON.parse(data);
      return !!parsed.profileSetup?.skipped;
    }
  } catch {}
  return false;
}

function FirstRunGuard({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const setupComplete = isProfileSetupComplete();
  const returning = isReturningUser();
  
  // Not setup complete and not on welcome page -> go to welcome
  if (!setupComplete && location !== "/welcome") {
    return <Redirect to="/welcome" />;
  }
  
  // Setup complete, on welcome -> redirect based on returning status
  if (setupComplete && location === "/welcome") {
    // Returning users go to DW chat, first-timers go to Today
    return <Redirect to={returning ? "/chat" : "/"} />;
  }
  
  // Initial launch routing: if on root "/" and this is app startup
  // returning users should see chat, first-time see today
  // (handled by route definition - "/" is TodayHubPage)
  
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={TodayHubPage} />
      <Route path="/chat" component={AIWorkspace} />
      <Route path="/login" component={LoginPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/welcome" component={WelcomePage} />
      
      {isRouteEnabled("/life-dashboard") && <Route path="/life-dashboard" component={LifeDashboardPage} />}
      {isRouteEnabled("/switchboard") && <Route path="/switchboard" component={LifeSwitchboardPage} />}
      <Route path="/switch/:id" component={SwitchTrainingPage} />
      <Route path="/switchboard/intake" component={SwitchboardIntakePage} />
      <Route path="/home" component={FTSHomePage} />
      <Route path="/plan" component={PlanPage} />
      <Route path="/profile/progress" component={MyProgressPage} />
      <Route path="/admin/analytics" component={AdminAnalyticsPage} />
      <Route path="/mood-tracker" component={MoodTrackerPage} />

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
      <Route path="/privacy-terms" component={PrivacyTermsPage} />
      <Route path="/404" component={NotFound404Page} />
      
      <Route component={NotFound404Page} />
    </Switch>
  );
}

const PAGES_WITHOUT_BOTTOM_NAV = ["/login", "/welcome", "/reset-password", "/app-tour"];

function InitialRouteHandler({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [hasHandledInitial, setHasHandledInitial] = useState(false);
  
  useEffect(() => {
    if (hasHandledInitial) return;
    
    // Only handle initial routing on root path
    if (location !== "/") {
      setHasHandledInitial(true);
      return;
    }
    
    const setupComplete = isProfileSetupComplete();
    const returning = isReturningUser();
    
    // If setup complete and returning user, redirect to chat
    if (setupComplete && returning) {
      setLocation("/chat");
    }
    
    setHasHandledInitial(true);
  }, [location, hasHandledInitial, setLocation]);
  
  return <>{children}</>;
}

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
        <FirstRunGuard>
          <InitialRouteHandler>
            <Router />
          </InitialRouteHandler>
        </FirstRunGuard>
      </div>
      {showBottomNav && <BottomNav />}
    </>
  );
}

function App() {
  const { showSplash, handleSplashComplete } = useSplashScreen();
  const [termsAccepted, setTermsAccepted] = useState(hasAcceptedTerms);

  useEffect(() => {
    trackNewDayOpen();
  }, []);

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
