import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";

import { LoginPage } from "@/components/auth/login-page";
import { AIWorkspace } from "@/components/ai-workspace";

import { ModulesHome } from "@/pages/modules-home";
import { SchedulePage } from "@/components/dashboard/schedule-page";
import { GoalsPage } from "@/components/dashboard/goals-page";
import { CheckInPage } from "@/components/dashboard/checkin-page";

import { MealsPage } from "@/pages/meals";
import { MeditationPage } from "@/pages/meditation";
import { RoutinesPage } from "@/pages/routines";
import { BlueprintPage } from "@/pages/blueprint";
import { ProjectsPage } from "@/pages/projects";
import { TasksPage } from "@/pages/tasks";
import { WorkoutsPage } from "@/pages/workouts";
import { InsightsPage } from "@/pages/insights";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ModulesHome} />
      
      <Route path="/assistant" component={AIWorkspace} />
      
      <Route path="/calendar" component={SchedulePage} />
      <Route path="/tasks" component={TasksPage} />
      <Route path="/goals" component={GoalsPage} />
      <Route path="/routines" component={RoutinesPage} />
      <Route path="/meals" component={MealsPage} />
      <Route path="/meditation" component={MeditationPage} />
      <Route path="/workouts" component={WorkoutsPage} />
      <Route path="/insights" component={InsightsPage} />
      
      <Route path="/projects" component={ProjectsPage} />
      <Route path="/blueprint" component={BlueprintPage} />
      <Route path="/checkin" component={CheckInPage} />
      
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
