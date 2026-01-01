import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";

import { LoginPage } from "@/components/auth/login-page";
import { SwipeableLayout } from "@/components/swipeable-layout";
import { ChallengesPage } from "@/pages/challenges";
import { TalkItOutPage } from "@/pages/talk-it-out";
import { BlueprintPage } from "@/pages/blueprint";
import { BodyScanPage } from "@/pages/body-scan";
import { ProjectsPage } from "@/pages/projects";
import { SettingsPage } from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={SwipeableLayout} />
      <Route path="/challenges" component={ChallengesPage} />
      <Route path="/talk" component={TalkItOutPage} />
      <Route path="/blueprint" component={BlueprintPage} />
      <Route path="/body-scan" component={BodyScanPage} />
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
