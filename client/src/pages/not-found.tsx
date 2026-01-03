import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Sparkles, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { APP_VERSION } from "@/lib/routes";

export default function NotFound() {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <header className="p-6 flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" data-testid="link-back-home">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <CardTitle className="text-xl">This page isn't here yet</CardTitle>
            <CardDescription className="mt-2">
              We couldn't find what you were looking for. That's okay — let's get you back on track.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/">
              <Button className="w-full" data-testid="button-go-home">
                <Home className="mr-2 h-4 w-4" />
                Go to Home
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground">
              If you keep seeing this, try refreshing or heading back to the main page.
            </p>
          </CardContent>
        </Card>
      </main>

      <footer className="p-4 text-center">
        <p className="text-xs text-muted-foreground">
          FTS v{APP_VERSION}
        </p>
      </footer>
    </div>
  );
}
