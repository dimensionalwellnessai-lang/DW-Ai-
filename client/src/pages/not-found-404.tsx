import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, MessageCircleHeart, ArrowLeft, MapPin } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function NotFound404Page() {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <MapPin className="w-8 h-8 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-display font-semibold">Page Not Found</h1>
            <p className="text-muted-foreground">
              The page you're looking for doesn't exist or has been moved.
            </p>
            {location !== "/" && (
              <p className="text-sm text-muted-foreground/70 font-mono">
                {location}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Link href="/">
              <Button className="w-full gap-2" data-testid="button-go-home">
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </Link>
            
            <Link href="/feedback">
              <Button variant="outline" className="w-full gap-2" data-testid="button-report-issue">
                <MessageCircleHeart className="w-4 h-4" />
                Report an Issue
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">
            If this keeps happening, please let us know so we can fix it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
