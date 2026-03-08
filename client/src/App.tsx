import { useState, useEffect, lazy, Suspense } from "react";
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
import { SyncTray } from "@/components/sync-tray";
import { BottomNav } from "@/components/bottom-nav";
import { FloatingAIWidget } from "@/components/floating-ai-widget";
import { DWAvatarOverlay } from "@/components/dw-avatar-overlay";
import { FirstTimeAgreement, hasAcceptedTerms } from "@/components/first-time-agreement";
import { trackNewDayOpen } from "@/lib/analytics";
import { isDemoMode, exitDemoMode } from "@/lib/demo-mode";
import { isOnboardingComplete, AUTH_ONBOARDING_PAGES } from "@/lib/onboarding";
import { InteractiveTourProvider, useInteractiveTour } from "@/components/interactive-tour";
import { ReminderBanner } from "@/components/reminder-banner";

// ── Lazy-loaded page components ───────────────────────────────────────────────
// All page-level components are loaded on demand to minimize the initial JS
// bundle. The Suspense boundary in AppContent shows a lightweight fallback
// while each page chunk is fetched the first time.

const LoginPage = lazy(() =>
  import("@/components/auth/login-page").then((m) => ({ default: m.LoginPage }))
);
const InteractiveTour = lazy(() =>
  import("@/components/interactive-tour").then((m) => ({ default: m.InteractiveTour }))
);
const AIWorkspace = lazy(() =>
  import("@/components/ai-workspace").then((m) => ({ default: m.AIWorkspace }))
);
const ChallengesPage = lazy(() =>
  import("@/pages/challenges").then((m) => ({ default: m.ChallengesPage }))
);
const TalkItOutPage = lazy(() =>
  import("@/pages/talk-it-out").then((m) => ({ default: m.TalkItOutPage }))
);
const CalendarPlansPage = lazy(() =>
  import("@/pages/calendar-plans").then((m) => ({ default: m.CalendarPlansPage }))
);
const BrowsePage = lazy(() => import("@/pages/browse"));
const RoutinesPage = lazy(() => import("@/pages/routines"));
const WorkoutPage = lazy(() => import("@/pages/workout"));
const RecoveryPage = lazy(() =>
  import("@/pages/recovery").then((m) => ({ default: m.RecoveryPage }))
);
const MealPrepPage = lazy(() => import("@/pages/meal-prep"));
const ShoppingListPage = lazy(() => import("@/pages/shopping-list"));
const CookSessionPage = lazy(() => import("@/pages/cook-session"));
const FinancesPage = lazy(() => import("@/pages/finances"));
const SpiritualPage = lazy(() => import("@/pages/spiritual"));
const LifeDashboardPage = lazy(() => import("@/pages/life-dashboard"));
const SettingsPage = lazy(() =>
  import("@/pages/settings").then((m) => ({ default: m.SettingsPage }))
);
const DailySchedulePage = lazy(() => import("@/pages/daily-schedule"));
const WeekSchedulePage = lazy(() => import("@/pages/week-schedule"));
const FeedbackPage = lazy(() => import("@/pages/feedback"));
const AstrologyPage = lazy(() => import("@/pages/astrology"));
const WelcomePage = lazy(() => import("@/pages/welcome"));
const VoiceOnboardingPage = lazy(() => import("@/pages/voice-onboarding"));
const SubscriptionPage = lazy(() => import("@/pages/subscription"));
const EnhancedOnboardingPage = lazy(() => import("@/pages/enhanced-onboarding"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const AppTourPage = lazy(() => import("@/pages/app-tour"));
const JournalPage = lazy(() => import("@/pages/journal"));
const WeeklyCheckinPage = lazy(() => import("@/pages/weekly-checkin"));
const TasksPage = lazy(() =>
  import("@/pages/tasks").then((m) => ({ default: m.TasksPage }))
);
const AccountDeletePage = lazy(() => import("@/pages/account-delete"));
const PlansPage = lazy(() => import("@/pages/plans"));
const PlanBuilderPage = lazy(() => import("@/pages/plan-builder"));
const ElevationPlanPage = lazy(() => import("@/pages/elevation-plan"));
const ScheduleReviewPage = lazy(() => import("@/pages/schedule-review"));
const ImportPage = lazy(() => import("@/pages/import"));
const ExportPage = lazy(() => import("@/pages/export"));
const CalendarMonthPage = lazy(() => import("@/pages/calendar-month"));
const CalendarSchedulePage = lazy(() => import("@/pages/calendar-schedule"));
const SystemsHubPage = lazy(() => import("@/pages/systems-hub"));
const CommunityPage = lazy(() => import("@/pages/community"));
const BlueprintPage = lazy(() =>
  import("@/pages/blueprint").then((m) => ({ default: m.BlueprintPage }))
);
const TrainingSystemPage = lazy(() => import("@/pages/systems/training"));
const WakeUpSystemPage = lazy(() => import("@/pages/systems/wake-up"));
const WindDownSystemPage = lazy(() => import("@/pages/systems/wind-down"));
const DevRoutesPage = lazy(() => import("@/pages/dev-routes"));
const NotFound404Page = lazy(() => import("@/pages/not-found-404"));
const TodayHubPage = lazy(() => import("@/pages/today-hub"));
const PrivacyTermsPage = lazy(() => import("@/pages/privacy-terms"));
const LifeSwitchboardPage = lazy(() => import("@/pages/life-switchboard"));
const SwitchTrainingPage = lazy(() => import("@/pages/switch-training"));
const SwitchboardIntakePage = lazy(() => import("@/pages/switchboard-intake"));
const DWHomePage = lazy(() => import("@/pages/dw-home"));
const PlanPage = lazy(() => import("@/pages/plan-page"));
const MyProgressPage = lazy(() => import("@/pages/my-progress"));
const AdminAnalyticsPage = lazy(() => import("@/pages/admin-analytics"));
const MoodTrackerPage = lazy(() => import("@/pages/mood-tracker"));
const HomeCommandCenter = lazy(() => import("@/features/home/home-command-center"));
const LifeBlueprintPage = lazy(() => import("@/pages/life-blueprint"));
const LifeBlueprintV2Page = lazy(() => import("@/pages/life-blueprint-v2"));
const InsightsDashboard = lazy(() => import("@/pages/insights"));
const WellnessPreferencesPage = lazy(() => import("@/pages/wellness-preferences"));
const ValuesRulesProfilePage = lazy(() => import("@/pages/values-rules-profile"));
const DwLearnsPage = lazy(() =>
  import("@/pages/dw-learns").then((m) => ({ default: m.DwLearnsPage }))
);
const TrackingPage = lazy(() => import("@/pages/tracking"));
const GoalsPage = lazy(() => import("@/pages/goals"));
const HabitsPage = lazy(() => import("@/pages/habits"));
const AccountabilityPage = lazy(() => import("@/pages/accountability"));
const AccountabilitySettingsPage = lazy(() => import("@/pages/accountability-settings"));
const SupportReportPage = lazy(() => import("@/pages/support-report"));
const ExpandMyWeekPage = lazy(() => import("@/pages/expand-my-week"));
const PaywallPage = lazy(() => import("@/pages/paywall"));
const CosmicHubPage = lazy(() => import("@/pages/cosmic"));
const ActionCenterPage = lazy(() => import("@/pages/action-center"));

function isReturningUser(): boolean {
  try {
    // First check if setup was skipped - skipped users are NOT returning
    const data = localStorage.getItem("dw_guest_data");
    if (data) {
      const parsed = JSON.parse(data);
      const profile = parsed.profileSetup;
      // If skipped, never treat as returning
      if (profile?.skipped) return false;
      // If completed (not skipped), treat as returning
      if (profile?.completedAt) return true;
    }
    
    // Check explicit returning flag (set on setup completion)
    if (localStorage.getItem("dw:isReturning") === "1") return true;
    
    // Check if activated (took a meaningful action)
    if (localStorage.getItem("dw:activatedAt")) return true;
  } catch {}
  return false;
}

function wasSetupSkipped(): boolean {
  try {
    const data = localStorage.getItem("dw_guest_data");
    if (data) {
      const parsed = JSON.parse(data);
      return !!parsed.profileSetup?.skipped;
    }
  } catch {}
  return false;
}

// ---------------------------------------------------------------------------
// Route-level helpers
// ---------------------------------------------------------------------------

function FirstRunGuard({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const setupComplete = isOnboardingComplete();
  
  // /paywall is accessible after onboarding redirect — don't gate it (allow query params too)
  if (location.startsWith("/paywall")) {
    return <>{children}</>;
  }
  
  // Not setup complete and not on welcome page -> go to welcome
  if (!setupComplete && location !== "/welcome") {
    return <Redirect to="/welcome" />;
  }
  
  // Setup complete, on welcome -> go to /home
  if (setupComplete && location === "/welcome") {
    return <Redirect to="/home" />;
  }
  
  return <>{children}</>;
}

const LAST_ROUTE_KEY = "dw:lastRoute";

function getLastRoute(): string | null {
  try {
    const v = localStorage.getItem(LAST_ROUTE_KEY);
    if (!v || v === "/") return null;
    if (AUTH_ONBOARDING_PAGES.some((p) => v === p || v.startsWith(p + "/"))) return null;
    return v;
  } catch {
    return null;
  }
}

function HomeRedirect() {
  if (!isOnboardingComplete()) return <Redirect to="/welcome" />;
  const last = getLastRoute();
  return <Redirect to={last ?? "/home"} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/chat" component={AIWorkspace} />
      <Route path="/talk" component={TalkItOutPage} />
      <Route path="/today" component={TodayHubPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/account/delete" component={AccountDeletePage} />
      <Route path="/welcome" component={WelcomePage} />
      <Route path="/voice-onboarding" component={VoiceOnboardingPage} />
      <Route path="/paywall" component={PaywallPage} />
      <Route path="/subscription" component={SubscriptionPage} />
      <Route path="/enhanced-onboarding" component={EnhancedOnboardingPage} />
      
      {isRouteEnabled("/life-dashboard") && <Route path="/life-dashboard" component={LifeDashboardPage} />}
      {isRouteEnabled("/switchboard") && <Route path="/switchboard" component={LifeSwitchboardPage} />}
      <Route path="/switch/:id" component={SwitchTrainingPage} />
      <Route path="/switchboard/intake" component={SwitchboardIntakePage} />
      <Route path="/home" component={DWHomePage} />
      <Route path="/command-center" component={HomeCommandCenter} />
      <Route path="/life-blueprint" component={LifeBlueprintPage} />
      <Route path="/life-blueprint-v2" component={LifeBlueprintV2Page} />
      <Route path="/insights" component={InsightsDashboard} />
      <Route path="/wellness-preferences" component={WellnessPreferencesPage} />
      <Route path="/values-rules-profile" component={ValuesRulesProfilePage} />
      <Route path="/dw-learns" component={DwLearnsPage} />
      <Route path="/tracking" component={TrackingPage} />
      <Route path="/goals" component={GoalsPage} />
      <Route path="/habits" component={HabitsPage} />
      <Route path="/accountability" component={AccountabilityPage} />
      <Route path="/accountability/settings" component={AccountabilitySettingsPage} />
      <Route path="/plan" component={PlanPage} />
      <Route path="/profile/progress" component={MyProgressPage} />
      <Route path="/admin/analytics" component={AdminAnalyticsPage} />
      <Route path="/mood-tracker" component={MoodTrackerPage} />

      {/* Put specific calendar routes BEFORE /calendar so they actually render */}
      {isRouteEnabled("/calendar/month") && <Route path="/calendar/month" component={CalendarMonthPage} />}
      {isRouteEnabled("/calendar/schedule") && <Route path="/calendar/schedule" component={CalendarSchedulePage} />}

      {isRouteEnabled("/calendar") && <Route path="/calendar" component={CalendarPlansPage} />}
      {isRouteEnabled("/daily-schedule") && <Route path="/daily-schedule" component={DailySchedulePage} />}
      {isRouteEnabled("/week-schedule") && <Route path="/week-schedule" component={WeekSchedulePage} />}
      {isRouteEnabled("/workout") && <Route path="/workout" component={WorkoutPage} />}
      {isRouteEnabled("/recovery") && <Route path="/recovery" component={RecoveryPage} />}
      {isRouteEnabled("/spiritual") && <Route path="/spiritual" component={SpiritualPage} />}
      {isRouteEnabled("/astrology") && <Route path="/astrology" component={AstrologyPage} />}
      <Route path="/cosmic" component={CosmicHubPage} />
      {isRouteEnabled("/browse") && <Route path="/browse" component={BrowsePage} />}
      
      {isRouteEnabled("/challenges") && <Route path="/challenges" component={ChallengesPage} />}
      {isRouteEnabled("/routines") && <Route path="/routines" component={RoutinesPage} />}
      {isRouteEnabled("/meal-prep") && <Route path="/meal-prep" component={MealPrepPage} />}
      {isRouteEnabled("/shopping-list") && <Route path="/shopping-list" component={ShoppingListPage} />}
      {isRouteEnabled("/cook-session") && <Route path="/cook-session" component={CookSessionPage} />}
      {isRouteEnabled("/finances") && <Route path="/finances" component={FinancesPage} />}
      {isRouteEnabled("/feedback") && <Route path="/feedback" component={FeedbackPage} />}
      {isRouteEnabled("/weekly-checkin") && <Route path="/weekly-checkin" component={WeeklyCheckinPage} />}
      {isRouteEnabled("/journal") && <Route path="/journal" component={JournalPage} />}
      {isRouteEnabled("/action-center") && <Route path="/action-center" component={ActionCenterPage} />}
      {isRouteEnabled("/settings") && <Route path="/settings" component={SettingsPage} />}
      {isRouteEnabled("/support/report") && <Route path="/support/report" component={SupportReportPage} />}
      {isRouteEnabled("/app-tour") && <Route path="/app-tour" component={AppTourPage} />}
      
      {isRouteEnabled("/plans") && <Route path="/plans" component={PlansPage} />}
      {isRouteEnabled("/plan-builder") && <Route path="/plan-builder" component={PlanBuilderPage} />}
      {isRouteEnabled("/elevation-plan") && <Route path="/elevation-plan" component={ElevationPlanPage} />}
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
      {isRouteEnabled("/expand-my-week") && <Route path="/expand-my-week" component={ExpandMyWeekPage} />}
      
      <Route path="/dev/routes" component={DevRoutesPage} />
      <Route path="/privacy-terms" component={PrivacyTermsPage} />
      <Route path="/support/report" component={SupportReportPage} />
      <Route path="/404" component={NotFound404Page} />
      
      <Route component={NotFound404Page} />
    </Switch>
  );
}

function InitialRouteHandler({ children }: { children: React.ReactNode }) {
  // App now always launches to DW chat at "/" - no special routing needed
  return <>{children}</>;
}

/** Minimal full-screen loading indicator shown while a lazy page chunk is downloading. */
function PageLoadingFallback() {
  return (
    <div
      className="flex items-center justify-center min-h-screen"
      aria-label="Loading page"
      role="status"
    >
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/** Non-intrusive banner shown at the top of the app shell when Demo Mode is active. */
function DemoModeBanner({ onExit }: { onExit: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="demo-mode-banner"
      className="flex items-center justify-between gap-2 px-4 py-1.5 bg-primary/10 border-b border-primary/20 text-xs font-medium text-primary"
    >
      <span>🧪 Demo Mode — sample data only, no account required</span>
      <button
        onClick={onExit}
        className="shrink-0 underline hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        aria-label="Exit Demo Mode"
        data-testid="button-exit-demo"
      >
        Exit Demo
      </button>
    </div>
  );
}

function AppContent() {
  const [location, setLocation] = useLocation();
  const [demoActive, setDemoActive] = useState(() => isDemoMode());
  const showBottomNav = !AUTH_ONBOARDING_PAGES.some(path => location.startsWith(path));
  const { isOpen, completeTour, skipTour, startTourIfPending } = useInteractiveTour();

  // Keep demoActive in sync on every navigation. The banner needs to appear when demo
  // is activated from the Login page or Settings (same-document localStorage writes),
  // and disappear when demo is exited. A per-navigation read is the lightest approach
  // because storage events only fire for cross-document writes (other tabs/iframes).
  useEffect(() => {
    setDemoActive(isDemoMode());
  }, [location]);

  // Persist last visited route so the app can resume there on next open.
  useEffect(() => {
    const isAuthPage = AUTH_ONBOARDING_PAGES.some(
      (p) => location === p || location.startsWith(p + "/"),
    );
    // Persist navigated routes for onboarding-complete users so the app can
    // resume where they left off. The app uses onboarding-gated (not server-
    // auth-gated) access for core features, so isOnboardingComplete() is the
    // correct gate here — both authenticated and guest users who finished
    // onboarding should benefit from route restoration.
    if (!isAuthPage && location !== "/" && isOnboardingComplete()) {
      try { localStorage.setItem(LAST_ROUTE_KEY, location); } catch { /* ignore */ }
    }
  }, [location]);

  // Start interactive tour if triggered from another page (e.g. app-tour page)
  useEffect(() => {
    startTourIfPending();
  }, [location]);

  const handleExitDemo = () => {
    exitDemoMode();
    setDemoActive(false);
    setLocation("/login");
  };

  return (
    <div className="app-shell">
      {demoActive && <DemoModeBanner onExit={handleExitDemo} />}
      <Toaster />
      <TutorialOverlay />
      <SyncTray />
      <FloatingAIWidget />
      <DWAvatarOverlay />
      <ReminderBanner />
      <Suspense fallback={null}>
        <InteractiveTour
          open={isOpen}
          onComplete={completeTour}
          onSkip={skipTour}
        />
      </Suspense>
      <div className="app-content" style={showBottomNav ? { paddingBottom: 'var(--bottom-nav-total-height, 88px)' } : undefined}>
        <FirstRunGuard>
          <InitialRouteHandler>
            <Suspense fallback={<PageLoadingFallback />}>
              <Router />
            </Suspense>
          </InitialRouteHandler>
        </FirstRunGuard>
      </div>
      {showBottomNav && <BottomNav />}
    </div>
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
          <InteractiveTourProvider>
            <TutorialProvider>
              {showSplash && <SplashScreen onComplete={onSplashComplete} />}
              {needsTerms && (
                <FirstTimeAgreement onAccept={() => setTermsAccepted(true)} />
              )}
              {showApp && <AppContent />}
            </TutorialProvider>
          </InteractiveTourProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
