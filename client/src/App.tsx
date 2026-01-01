import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";

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
import { ProjectsPage } from "@/pages/projects";
import { SettingsPage } from "@/pages/settings";
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
      <Route path="/projects" component={ProjectsPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/login" component={LoginPage} />
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
