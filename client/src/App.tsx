import { useState, useEffect, lazy, Suspense, Component, type ErrorInfo, type ReactNode } from "react";
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

import { FirstTimeAgreement, hasAcceptedTerms } from "@/components/first-time-agreement";
import { trackNewDayOpen } from "@/lib/analytics";
import { apiRequest } from "@/lib/queryClient";
import { isDemoMode, exitDemoMode } from "@/lib/demo-mode";
import { deepLinkService } from "@/lib/deep-link-service";
import { isOnboardingComplete, AUTH_ONBOARDING_PAGES } from "@/lib/onboarding";
import { computeLifecycleState } from "@/lib/lifecycle";
import { InteractiveTourProvider, useInteractiveTour } from "@/components/interactive-tour-context";
import { InteractiveTour } from "@/components/interactive-tour";
import { ReminderBanner } from "@/components/reminder-banner";
import { UsernameSetupModal } from "@/components/username-setup-modal";
import { useAuth } from "@/hooks/use-auth";
import { hydrateLanguageFromServer } from "@/lib/i18n";
import { AccountabilityCheckIn } from "@/components/accountability-check-in";
import { WhatsNewModal } from "@/components/whats-new-modal";

// ── Page-level ErrorBoundary ──────────────────────────────────────────────────
// Catches rendering exceptions inside any page component and shows a calm
// recovery screen instead of a blank white crash.
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PageErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Non-fatal: log for debugging; avoid exposing stack to the user
    console.error("[ErrorBoundary] Uncaught render error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center gap-4">
          <p className="text-lg font-semibold text-foreground">Something went wrong</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            DW ran into an unexpected issue. Tap below to reload — your data is safe.
          </p>
          <button
            className="mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = "/";
            }}
          >
            Return home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Lazy-loaded page components ───────────────────────────────────────────────
// All page-level components are loaded on demand to minimize the initial JS
// bundle. The Suspense boundary in AppContent shows a lightweight fallback
// while each page chunk is fetched the first time.

const LoginPage = lazy(() =>
  import("@/components/auth/login-page").then((m) => ({ default: m.LoginPage })),
);
const TalkItOutPage = lazy(() =>
  import("@/pages/talk-it-out").then((m) => ({ default: m.TalkItOutPage })),
);
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const AccountDeletePage = lazy(() => import("@/pages/account-delete"));
const SubscriptionPage = lazy(() => import("@/pages/subscription"));
const CheckoutPage = lazy(() => import("@/pages/checkout"));
const EnhancedOnboardingPage = lazy(() => import("@/pages/enhanced-onboarding"));
const VoiceOnboardingPage = lazy(() => import("@/pages/voice-onboarding"));
const RoleMapPage = lazy(() => import("@/pages/role-map"));
const CommunityPage = lazy(() => import("@/pages/community"));
const GroupChallengesPage = lazy(() => import("@/pages/group-challenges"));
const MyLevelPage = lazy(() => import("@/pages/my-level"));
const CalendarPlansPage = lazy(() =>
  import("@/pages/calendar-plans").then((m) => ({ default: m.CalendarPlansPage })),
);
const DailySchedulePage = lazy(() => import("@/pages/daily-schedule"));
const WeekSchedulePage = lazy(() => import("@/pages/week-schedule"));
const WorkoutPage = lazy(() => import("@/pages/workout"));
const MyPlanPage = lazy(() => import("@/pages/my-plan"));
const WorkoutAnalyticsPage = lazy(() => import("@/pages/workout-analytics"));
const HealthDataPage = lazy(() => import("@/pages/health-data"));
const WearableManagerPage = lazy(() => import("@/pages/wearable-manager"));
const RecoveryPage = lazy(() =>
  import("@/pages/recovery").then((m) => ({ default: m.RecoveryPage })),
);
const SpiritualPage = lazy(() => import("@/pages/spiritual"));
const AstrologyPage = lazy(() => import("@/pages/astrology"));
const FeedPage = lazy(() => import("@/pages/feed"));
const EnergyTransmutationPage = lazy(() => import("@/pages/energy-transmutation"));
const ChallengesPage = lazy(() =>
  import("@/pages/challenges").then((m) => ({ default: m.ChallengesPage })),
);
const RoutinesPage = lazy(() => import("@/pages/routines"));
const RoutineTemplateDetailPage = lazy(() => import("@/pages/routine-template-detail"));
const RoutineDetailPage = lazy(() => import("@/pages/routine-detail"));
const MealPrepPage = lazy(() => import("@/pages/meal-prep"));
const ShoppingListPage = lazy(() => import("@/pages/shopping-list"));
const CookSessionPage = lazy(() => import("@/pages/cook-session"));
const FinancesPage = lazy(() => import("@/pages/finances"));
const FeedbackPage = lazy(() => import("@/pages/feedback"));
const WeeklyCheckinPage = lazy(() => import("@/pages/weekly-checkin"));
const JournalPage = lazy(() => import("@/pages/journal"));
const SettingsPage = lazy(() =>
  import("@/pages/settings").then((m) => ({ default: m.SettingsPage })),
);
const AppTourPage = lazy(() => import("@/pages/app-tour"));
const ToursHubPage = lazy(() => import("@/pages/tours-hub"));
import { TasksPage } from "@/pages/tasks";
import PlansPage from "@/pages/plans";
import ProjectsPage from "@/pages/projects";
import PlanDetailPage from "@/pages/plan-detail";
import PlanBuilderPage from "@/pages/plan-builder";
import ElevationPlanPage from "@/pages/elevation-plan";
import PlanHistoryPage from "@/pages/plan-history";
import WeeklyReviewPage from "@/pages/weekly-review";
import ScheduleReviewPage from "@/pages/schedule-review";
import ImportPage from "@/pages/import";
import ImportsPage from "@/pages/imports";
import ImportsNewPage from "@/pages/imports-new";
import LifeSystemImportPage from "@/pages/life-system-import";
import ExportPage from "@/pages/export";
import CalendarMonthPage from "@/pages/calendar-month";
import CalendarSchedulePage from "@/pages/calendar-schedule";
import { BlueprintPage } from "@/pages/blueprint";
import TrainingSystemPage from "@/pages/systems/training";
import WakeUpSystemPage from "@/pages/systems/wake-up";
import WindDownSystemPage from "@/pages/systems/wind-down";
import DevRoutesPage from "@/pages/dev-routes";
import NotFound404Page from "@/pages/not-found-404";
import PrivacyTermsPage from "@/pages/privacy-terms";
import SwitchTrainingPage from "@/pages/switch-training";
import SwitchboardIntakePage from "@/pages/switchboard-intake";
const SharedAttentionPage = lazy(() => import("@/pages/shared-attention"));
const DimensionOverviewPage = lazy(() => import("@/pages/dimension-overview"));
import PlanPage from "@/pages/plan-page";
import MyProgressPage from "@/pages/my-progress";
import AdminAnalyticsPage from "@/pages/admin-analytics";
import MoodTrackerPage from "@/pages/mood-tracker";
import HomeCommandCenter from "@/features/home/home-command-center";
import LifeBlueprintV2Page from "@/pages/life-blueprint-v2";
import InsightsDashboard from "@/pages/insights";
import WellnessPreferencesPage from "@/pages/wellness-preferences";
import ValuesRulesProfilePage from "@/pages/values-rules-profile";
import { DwLearnsPage } from "@/pages/dw-learns";
import TrackingPage from "@/pages/tracking";
import GoalsPage from "@/pages/goals";
import HabitsPage from "@/pages/habits";
import AccountabilityPage from "@/pages/accountability";
import AccountabilitySettingsPage from "@/pages/accountability-settings";
import AcceptInvitePage from "@/pages/accept-invite";
import SupportReportPage from "@/pages/support-report";
import ExpandMyWeekPage from "@/pages/expand-my-week";
import PaywallPage from "@/pages/paywall";
import CosmicHubPage from "@/pages/cosmic";
import ActionCenterPage from "@/pages/action-center";
import VoiceModePage from "@/pages/voice-mode";
import DayStartPage from "@/pages/day-start";
const LibraryPage = lazy(() => import("@/pages/library"));
const RelationshipsPage = lazy(() => import("@/pages/relationships"));
const LifeSystemPage = lazy(() => import("@/pages/life-system"));
const LifeSystemDocumentPage = lazy(() => import("@/pages/life-system-document"));
const LifeSystemPillarDetailPage = lazy(() => import("@/pages/life-system-pillar-detail"));
const LifeSystemProjectDetailPage = lazy(() => import("@/pages/life-system-project-detail"));
const LifeSystemOnboardingPage = lazy(() => import("@/pages/life-system-onboarding"));
// Spec 13 primary section hub pages
const MyLifePage = lazy(() => import("@/pages/my-life"));
const GuidancePage = lazy(() => import("@/pages/guidance"));
const GuidanceConversationsPage = lazy(() => import("@/pages/guidance-conversations"));
const ToolsPage = lazy(() => import("@/pages/tools"));
const WelcomeBackPage = lazy(() => import("@/pages/welcome-back"));

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
  if (location.startsWith("/paywall") || location.startsWith("/upgrade")) {
    return <>{children}</>;
  }
  
  // Spec 13: conversational onboarding is the primary flow at /voice-onboarding.
  // /onboarding (life-system wizard) is kept as an alternative; /enhanced-onboarding now redirects to /voice-onboarding.
  const onboardingRoutes = ["/onboarding", "/enhanced-onboarding", "/voice-onboarding"];
  const isOnOnboardingRoute = onboardingRoutes.includes(location);

  if (!setupComplete && !isOnOnboardingRoute) {
    return <Redirect to="/voice-onboarding" />;
  }

  // Setup complete, on any onboarding page -> go to /command-center.
  // Exceptions (completed users may stay on /voice-onboarding):
  //  - ?review=1  : re-open the summary to review saved suggestions from My Life.
  //  - ?resume=1  : a skipper returns to finish setting up their Life Blueprint.
  //  - ?refresh=1 : an established user runs a full "life refresh" conversation.
  const onboardingReentryMode =
    location === "/voice-onboarding" && typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const isOnboardingReentry =
    onboardingReentryMode !== null &&
    (onboardingReentryMode.get("review") === "1" ||
      onboardingReentryMode.get("resume") === "1" ||
      onboardingReentryMode.get("refresh") === "1");
  if (setupComplete && isOnOnboardingRoute && !isOnboardingReentry) {
    return <Redirect to="/command-center" />;
  }
  
  return <>{children}</>;
}

const LAST_ROUTE_KEY = "dw:lastRoute";

// Routes that should never be restored as the startup destination
const EXCLUDED_RESTORE_ROUTES = ["/cosmic", "/astrology"];

function getLastRoute(): string | null {
  try {
    const v = localStorage.getItem(LAST_ROUTE_KEY);
    if (!v || v === "/") return null;
    const path = v.split(/[?#]/, 1)[0];
    if (AUTH_ONBOARDING_PAGES.some((p) => path === p || path.startsWith(p + "/"))) return null;
    if (EXCLUDED_RESTORE_ROUTES.some((p) => path === p || path.startsWith(p + "/"))) return null;
    return v;
  } catch {
    return null;
  }
}

function HomeRedirect() {
  const { user } = useAuth();

  if (!isOnboardingComplete()) return <Redirect to="/voice-onboarding" />;

  // Lifecycle routing: long-away users go to welcome-back screen
  if (user) {
    const state = computeLifecycleState(
      !!user.onboardingCompleted,
      user.lastActiveAt,
    );
    if (state === "long_away") {
      return <Redirect to="/welcome-back" />;
    }
  }

  const last = getLastRoute();
  return <Redirect to={last ?? "/command-center"} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      {/* /chat is the legacy URL — /talk is now the canonical chat surface
          (bottom-nav, paste-detection, contextual hooks all live there). */}
      <Route path="/chat"><Redirect to="/talk" /></Route>
      <Route path="/talk" component={TalkItOutPage} />
      <Route path="/today"><Redirect to="/command-center" /></Route>
      <Route path="/login" component={LoginPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/account/delete" component={AccountDeletePage} />
      <Route path="/welcome"><Redirect to="/voice-onboarding" /></Route>
      <Route path="/voice-onboarding" component={VoiceOnboardingPage} />
      <Route path="/welcome-back" component={WelcomeBackPage} />
      <Route path="/role-map" component={RoleMapPage} />
      <Route path="/community" component={CommunityPage} />
      <Route path="/community/b/:slug" component={CommunityPage} />
      <Route path="/community/p/:id" component={CommunityPage} />
      <Route path="/my-level" component={MyLevelPage} />
      <Route path="/group-challenges" component={GroupChallengesPage} />
      <Route path="/group-challenges/:id" component={GroupChallengesPage} />
      <Route path="/paywall" component={PaywallPage} />
      <Route path="/upgrade" component={PaywallPage} />
      <Route path="/subscription" component={SubscriptionPage} />
      <Route path="/checkout" component={CheckoutPage} />
      {/* Keep /enhanced-onboarding for back-compat; primary onboarding is now conversational */}
      <Route path="/enhanced-onboarding"><Redirect to="/voice-onboarding" /></Route>
      <Route path="/onboarding" component={LifeSystemOnboardingPage} />
      <Route path="/life-system/document" component={LifeSystemDocumentPage} />
      <Route path="/life-system/pillar/:id" component={LifeSystemPillarDetailPage} />
      <Route path="/life-system/project/:id" component={LifeSystemProjectDetailPage} />
      {/* The life-system overview page is now the canonical "Life Blueprint".
          Keep /life-system as a redirect so existing bookmarks, lastRoute
          values, and inbound links keep working. */}
      <Route path="/life-system"><Redirect to="/life-blueprint" /></Route>

      {/* /life-dashboard and /life-dimensions were duplicate life-overview
          surfaces. Their highest-value content (goals/habits/routines
          summary) now lives on the canonical /life-blueprint page, so both
          redirect there. */}
      <Route path="/life-dashboard"><Redirect to="/life-blueprint" /></Route>
      <Route path="/life-dimensions"><Redirect to="/life-blueprint" /></Route>
      {/* Sub-routes stay live: they're still linked from active surfaces and
          must keep working. Only the bare /switchboard parent redirects. */}
      <Route path="/switchboard/intake" component={SwitchboardIntakePage} />
      <Route path="/switchboard"><Redirect to="/life-blueprint" /></Route>
      <Route path="/switch/:id" component={SwitchTrainingPage} />
      <Route path="/dimension/:id" component={DimensionOverviewPage} />
      <Route path="/body"><Redirect to="/habits" /></Route>
      <Route path="/home"><Redirect to="/command-center" /></Route>
      {/* Spec 13 primary section hub pages */}
      <Route path="/my-life" component={MyLifePage} />
      <Route path="/guidance" component={GuidancePage} />
      <Route path="/guidance/conversations" component={GuidanceConversationsPage} />
      <Route path="/tools" component={ToolsPage} />
      <Route path="/profile"><Redirect to="/profile/progress" /></Route>
      <Route path="/command-center" component={HomeCommandCenter} />
      <Route path="/life-system-import" component={LifeSystemImportPage} />
      {/* /life-blueprint is now the Life System overview (Core / Expression /
          Creation pillars + the orbit). The previous life-blueprint-v2
          content (life-dimensions assessments) lives at the dimensions
          subroute so its functionality isn't lost. NOTE for wouter: the
          more-specific path MUST come first or it would be shadowed by
          the parent. */}
      <Route path="/life-blueprint/dimensions" component={LifeBlueprintV2Page} />
      <Route path="/life-blueprint" component={LifeSystemPage} />
      <Route path="/life-blueprint-v2"><Redirect to="/life-blueprint/dimensions" /></Route>
      <Route path="/insights" component={InsightsDashboard} />
      <Route path="/wellness-preferences" component={WellnessPreferencesPage} />
      <Route path="/values-rules-profile" component={ValuesRulesProfilePage} />
      <Route path="/dw-learns" component={DwLearnsPage} />
      <Route path="/tracking" component={TrackingPage} />
      <Route path="/goals" component={GoalsPage} />
      <Route path="/habits" component={HabitsPage} />
      <Route path="/accountability" component={AccountabilityPage} />
      <Route path="/accountability/settings" component={AccountabilitySettingsPage} />
      <Route path="/accountability/accept-invite/:token" component={AcceptInvitePage} />
      <Route path="/plan"><Redirect to="/my-plan" /></Route>
      <Route path="/profile/progress" component={MyProgressPage} />
      <Route path="/admin/analytics" component={AdminAnalyticsPage} />
      <Route path="/mood-tracker" component={MoodTrackerPage} />
      <Route path="/voice" component={VoiceModePage} />
      <Route path="/day/start" component={DayStartPage} />

      {/* Calendar routes — specific paths before the catch-all */}
      {isRouteEnabled("/calendar") && <Route path="/calendar/manage" component={CalendarPlansPage} />}
      {isRouteEnabled("/calendar/schedule") && <Route path="/calendar/schedule" component={CalendarSchedulePage} />}

      {isRouteEnabled("/calendar") && <Route path="/calendar" component={CalendarMonthPage} />}
      {isRouteEnabled("/daily-schedule") && <Route path="/daily-schedule" component={DailySchedulePage} />}
      {isRouteEnabled("/week-schedule") && <Route path="/week-schedule" component={WeekSchedulePage} />}
      {isRouteEnabled("/workout") && <Route path="/workout" component={WorkoutPage} />}
      <Route path="/my-plan" component={MyPlanPage} />
      <Route path="/workout/analytics" component={WorkoutAnalyticsPage} />
      <Route path="/health-data" component={HealthDataPage} />
      <Route path="/wearable-manager" component={WearableManagerPage} />
      {isRouteEnabled("/recovery") && <Route path="/recovery" component={RecoveryPage} />}
      {isRouteEnabled("/spiritual") && <Route path="/spiritual" component={SpiritualPage} />}
      {isRouteEnabled("/cosmic-insights") && <Route path="/cosmic-insights" component={AstrologyPage} />}
      <Route path="/astrology"><Redirect to="/cosmic-insights" /></Route>
      <Route path="/cosmic" component={CosmicHubPage} />
      <Route path="/feed" component={FeedPage} />
      <Route path="/browse"><Redirect to="/feed" /></Route>
      {isRouteEnabled("/energy-transmutation") && <Route path="/energy-transmutation" component={EnergyTransmutationPage} />}
      {isRouteEnabled("/library") && <Route path="/library" component={LibraryPage} />}
      {isRouteEnabled("/relationships") && <Route path="/relationships" component={RelationshipsPage} />}
      
      {isRouteEnabled("/challenges") && <Route path="/challenges" component={ChallengesPage} />}
      {/* Routine sub-routes must come before /routines so wouter matches them first */}
      {isRouteEnabled("/routines") && <Route path="/routines/templates/:templateId" component={RoutineTemplateDetailPage} />}
      {isRouteEnabled("/routines") && <Route path="/routines/:id" component={RoutineDetailPage} />}
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
      {/* /support/report — single declaration further below; the gated alias was duplicate. */}
      {isRouteEnabled("/app-tour") && <Route path="/app-tour" component={AppTourPage} />}
      <Route path="/tours-hub" component={ToursHubPage} />
      
      {isRouteEnabled("/plans") && <Route path="/plans" component={PlansPage} />}
      {isRouteEnabled("/plans") && <Route path="/plans/:planId" component={PlanDetailPage} />}
      <Route path="/projects" component={ProjectsPage} />
      <Route path="/plan-builder"><Redirect to="/plans" /></Route>
      {isRouteEnabled("/elevation-plan") && <Route path="/elevation-plan" component={ElevationPlanPage} />}
      <Route path="/plan-history"><Redirect to="/elevation-plan?tab=history" /></Route>
      {isRouteEnabled("/weekly-review") && <Route path="/weekly-review" component={WeeklyReviewPage} />}
      <Route path="/schedule-review/:draftId" component={ScheduleReviewPage} />
      {isRouteEnabled("/tasks") && <Route path="/tasks" component={TasksPage} />}
      {isRouteEnabled("/import") && <Route path="/import" component={ImportPage} />}
      <Route path="/imports/new" component={ImportsNewPage} />
      <Route path="/imports" component={ImportsPage} />
      <Route path="/export/:planId" component={ExportPage} />
      
      {/* Bare /systems is a dormant duplicate of the life-overview hub → redirect
          to the canonical Life Blueprint. The /systems/* detail pages stay live. */}
      <Route path="/systems"><Redirect to="/life-blueprint" /></Route>
      {isRouteEnabled("/systems/training") && <Route path="/systems/training" component={TrainingSystemPage} />}
      {isRouteEnabled("/systems/wake-up") && <Route path="/systems/wake-up" component={WakeUpSystemPage} />}
      {isRouteEnabled("/systems/wind-down") && <Route path="/systems/wind-down" component={WindDownSystemPage} />}
      {isRouteEnabled("/blueprint") && <Route path="/blueprint" component={BlueprintPage} />}
      {isRouteEnabled("/expand-my-week") && <Route path="/expand-my-week" component={ExpandMyWeekPage} />}
      
      <Route path="/dev/routes" component={DevRoutesPage} />
      {isRouteEnabled("/shared-attention") && <Route path="/shared-attention" component={SharedAttentionPage} />}
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
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Loading…</span>
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
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
  const { user } = useAuth();
  const [usernameModalOpen, setUsernameModalOpen] = useState(false);

  // Initialize deep link service and connect it to wouter navigation
  useEffect(() => {
    deepLinkService.setNavigator(setLocation);
    deepLinkService.initialize();
  }, [setLocation]);

  // Hydrate the i18n language override from the server-persisted user
  // preference on auth load, so a user who picked a language on another
  // device sees the right strings on first paint instead of an
  // English-then-flash. No-op when the server has nothing stored or the
  // local override already matches.
  useEffect(() => {
    if (!user) return;
    hydrateLanguageFromServer(user.language);
  }, [user]);

  // Trigger DW daily affirmation once per session
  useEffect(() => {
    if (!user) return;
    const key = "dw_daily_affirmation_" + new Date().toISOString().split("T")[0];
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    apiRequest("POST", "/api/notifications/dw-daily").catch(() => {});
  }, [user]);

  // Start the accountability reminder scheduler for signed-in users.
  // Plans pre-task and post-task local notifications for today's tasks and
  // calendar events, respecting the user's quiet hours and preferences.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let stop: (() => void) | undefined;
    void import("@/lib/accountability-scheduler").then((m) => {
      if (cancelled) return;
      stop = m.startAccountabilityScheduler();
    });
    return () => {
      cancelled = true;
      if (stop) stop();
    };
  }, [user]);

  // Prompt username setup for logged-in users without a username
  // Show when they navigate to social-facing pages
  useEffect(() => {
    if (!user) return;
    const hasUsername = !!(user as any).username;
    if (hasUsername) return;
    const socialPaths = ["/browse", "/feed"];
    const isSocialPage = socialPaths.some(p => location.startsWith(p));
    if (!isSocialPage) return;
    const shownKey = "dw_username_prompt_shown";
    if (sessionStorage.getItem(shownKey)) return;
    sessionStorage.setItem(shownKey, "1");
    const timer = setTimeout(() => setUsernameModalOpen(true), 800);
    return () => clearTimeout(timer);
  }, [user, location]);

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

  // Start interactive tour only when the user first arrives at home after onboarding
  useEffect(() => {
    if (location === "/command-center") {
      startTourIfPending();
    }
  }, [location]);

  const handleExitDemo = () => {
    exitDemoMode();
    setDemoActive(false);
    setLocation("/login");
  };

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-to-main">Skip to main content</a>
      {demoActive && <DemoModeBanner onExit={handleExitDemo} />}
      <Toaster />
      <TutorialOverlay />
      <SyncTray />
      <FloatingAIWidget />
      <ReminderBanner />
      <WhatsNewModal />
      <AccountabilityCheckIn />
      <UsernameSetupModal
        open={usernameModalOpen}
        onClose={() => setUsernameModalOpen(false)}
      />
      <Suspense fallback={null}>
        <InteractiveTour
          open={isOpen}
          onComplete={completeTour}
          onSkip={skipTour}
        />
      </Suspense>
      <main id="main-content" className="app-content" style={showBottomNav ? { paddingBottom: 'var(--bottom-nav-total-height, 88px)' } : undefined}>
        <FirstRunGuard>
          <InitialRouteHandler>
            <PageErrorBoundary>
              <Suspense fallback={<PageLoadingFallback />}>
                <Router />
              </Suspense>
            </PageErrorBoundary>
          </InitialRouteHandler>
        </FirstRunGuard>
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
}

function App() {
  const { showSplash, wasInactivityTimeout, handleSplashComplete } = useSplashScreen();
  const [termsAccepted, setTermsAccepted] = useState(hasAcceptedTerms);

  useEffect(() => {
    trackNewDayOpen();
  }, []);

  const onSplashComplete = () => {
    if (wasInactivityTimeout) {
      try { localStorage.removeItem(LAST_ROUTE_KEY); } catch {}
      window.history.replaceState(null, "", "/");
    }
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
