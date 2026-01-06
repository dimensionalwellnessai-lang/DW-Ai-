import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "./theme-toggle";
import {
  Sparkles,
  Target,
  Calendar,
  Heart,
  Brain,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Insights",
    description: "Personalized recommendations based on your unique life patterns and wellness goals.",
  },
  {
    icon: Target,
    title: "Goal Alignment",
    description: "Smart goals that connect to multiple wellness dimensions for holistic growth.",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "Time blocks designed around your peak motivation hours and available time.",
  },
  {
    icon: Heart,
    title: "Mood & Energy Tracking",
    description: "Daily check-ins that help you understand patterns and optimize your routines.",
  },
  {
    icon: TrendingUp,
    title: "Progress Visualization",
    description: "Beautiful charts showing your journey towards a balanced, fulfilling life.",
  },
  {
    icon: CheckCircle2,
    title: "Habit Building",
    description: "Micro-routines and habit stacks tailored to fit seamlessly into your day.",
  },
];

const steps = [
  {
    number: "01",
    title: "Share Your Life",
    description: "Tell us about your responsibilities, priorities, and available time.",
  },
  {
    number: "02",
    title: "Define Your Focus",
    description: "Choose what matters most: energy, sleep, focus, purpose, or connection.",
  },
  {
    number: "03",
    title: "Get Your System",
    description: "AI creates a personalized life system with schedules, goals, and habits.",
  },
  {
    number: "04",
    title: "Grow Daily",
    description: "Check in, track progress, and refine your system as you evolve.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-chart-1" />
            <span className="font-semibold text-lg" data-testid="text-brand-name">Wellness Lifestyle AI</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" data-testid="link-login">Log In</Button>
            </Link>
            <Link href="/login">
              <Button data-testid="link-get-started">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-1/10 via-transparent to-chart-2/10" />
          <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6" data-testid="text-hero-title">
              Build a life system that supports
              <span className="block text-chart-1"> the real you</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-10 font-serif" data-testid="text-hero-subtitle">
              Not just the ideal you. AI-powered wellness guidance that fits your real responsibilities, available time, and unique goals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
              <Link href="/login">
                <Button size="lg" className="rounded-full px-8 text-lg" data-testid="button-hero-cta">
                  Start Your Journey
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="rounded-full px-8 text-lg" data-testid="button-learn-more">
                Learn More
              </Button>
            </div>
            <p className="mt-8 text-sm text-muted-foreground" data-testid="text-trust-indicator">
              Join thousands building better lives with personalized AI guidance
            </p>
          </div>
        </section>

        <section className="py-20 bg-card/50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-semibold mb-4" data-testid="text-features-title">
                Everything you need to thrive
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                A complete wellness ecosystem designed to help you build sustainable habits and achieve meaningful goals.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="hover-elevate" data-testid={`card-feature-${index}`}>
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-md bg-chart-1/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-chart-1" />
                    </div>
                    <h3 className="text-xl font-medium mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-semibold mb-4" data-testid="text-how-it-works-title">
                How it works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Four simple steps to transform your daily life into a balanced wellness journey.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="relative" data-testid={`step-${index}`}>
                  <div className="text-6xl font-bold text-chart-1/20 mb-4">{step.number}</div>
                  <h3 className="text-xl font-medium mb-2">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 right-0 translate-x-1/2">
                      <ArrowRight className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-chart-1 text-primary-foreground">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4" data-testid="text-cta-title">
              Ready to build your life system?
            </h2>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto font-serif">
              Start with a simple conversation about your life. In minutes, you'll have a personalized wellness plan.
            </p>
            <Link href="/welcome">
              <Button size="lg" variant="secondary" className="rounded-full px-8 text-lg" data-testid="button-cta-start">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-chart-1" />
                <span className="font-semibold">Wellness Lifestyle AI</span>
              </div>
              <p className="text-muted-foreground max-w-sm">
                AI-powered wellness guidance that adapts to your real life. Build sustainable habits and achieve meaningful goals.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li className="hover-elevate cursor-pointer">Features</li>
                <li className="hover-elevate cursor-pointer">Pricing</li>
                <li className="hover-elevate cursor-pointer">FAQ</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li className="hover-elevate cursor-pointer">About</li>
                <li className="hover-elevate cursor-pointer">Privacy</li>
                <li className="hover-elevate cursor-pointer">Terms</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p data-testid="text-copyright">&copy; {new Date().getFullYear()} Wellness Lifestyle AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
