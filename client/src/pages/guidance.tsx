/**
 * Guidance — the reflective and educational layer of DW.
 *
 * Spec 13 structure:
 *   Recommended    — curated content based on context
 *   Explore        — browse all available content
 *   Conversations  — AI coaching conversations
 *   Zodiac Guidance — western + Chinese zodiac reflections
 *   Reflections    — journaling and mood check-ins
 *   Patterns       — insight trends and pattern recognition
 *
 * Route: /guidance
 */

import { Link } from "wouter";
import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Telescope,
  MessageCircle,
  Star,
  BookOpen,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

// ─── Section definitions ──────────────────────────────────────────────────────

interface GuidanceSectionDef {
  id: string;
  label: string;
  description: string;
  icon: typeof Sparkles;
  iconColor: string;
  href: string;
  badge?: string;
}

const SECTIONS: GuidanceSectionDef[] = [
  {
    id: "recommended",
    label: "Recommended",
    description: "Content and prompts tailored to your current focus and energy.",
    icon: Sparkles,
    iconColor: "text-primary",
    href: "/browse",
  },
  {
    id: "explore",
    label: "Explore",
    description: "Browse all guidance, routines, and learning paths available to you.",
    icon: Telescope,
    iconColor: "text-sky-500",
    href: "/browse",
  },
  {
    id: "conversations",
    label: "Conversations",
    description: "Saved learning threads and coaching conversations worth keeping.",
    icon: MessageCircle,
    iconColor: "text-emerald-500",
    href: "/guidance/conversations",
  },
  {
    id: "zodiac-guidance",
    label: "Zodiac Guidance",
    description:
      "Western horoscope + Chinese zodiac as a secondary reflective lens — timing and self-awareness.",
    icon: Star,
    iconColor: "text-violet-500",
    href: "/cosmic",
    badge: "Reflective",
  },
  {
    id: "reflections",
    label: "Reflections",
    description: "Journal entries, mood logs, and guided reflection prompts.",
    icon: BookOpen,
    iconColor: "text-rose-500",
    href: "/journal",
  },
  {
    id: "patterns",
    label: "Patterns",
    description: "Trends and insights inferred from your history and habits.",
    icon: TrendingUp,
    iconColor: "text-amber-500",
    href: "/insights",
  },
];

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ section }: { section: GuidanceSectionDef }) {
  const Icon = section.icon;
  return (
    <Link href={section.href}>
      <Card
        className="cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.98]"
        data-testid={`guidance-section-${section.id}`}
      >
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-muted">
            <Icon className={cn("h-5 w-5", section.iconColor)} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{section.label}</p>
              {section.badge && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  {section.badge}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {section.description}
            </p>
          </div>
          <ChevronRight className="flex-shrink-0 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GuidancePage() {
  usePageMeta(
    "Guidance",
    "Your reflective and educational layer — recommendations, exploration, conversations, and insights.",
  );

  return (
    <div className="pb-28">
      <PageHeader title="Guidance" showBack={false} />

      <div className="px-4 space-y-5">
        {/* Intro line */}
        <div className="flex items-center gap-2 pt-1">
          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Reflective support, learning, and honest conversation — on your terms.
          </p>
        </div>

        {/* Section cards */}
        <div className="space-y-3">
          {SECTIONS.map((section) => (
            <SectionCard key={section.id} section={section} />
          ))}
        </div>
      </div>
    </div>
  );
}
