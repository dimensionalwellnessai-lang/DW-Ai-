/**
 * Tools — suggested and pinned tools based on active paths, projects,
 * current friction points, and preferred support style.
 *
 * Spec 13: "Populates suggested and pinned tools based on active
 * paths/projects, current friction points, and preferred support style."
 *
 * Route: /tools
 */

import { Link } from "wouter";
import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckSquare,
  Activity,
  Dumbbell,
  Utensils,
  BookOpen,
  Wallet,
  Users,
  UploadCloud,
  FileText,
  Sparkles,
  ChevronRight,
  Wrench,
} from "lucide-react";

// ─── Tool definitions ─────────────────────────────────────────────────────────

interface ToolDef {
  id: string;
  label: string;
  description: string;
  icon: typeof Wrench;
  iconColor: string;
  href: string;
  category: "daily" | "planning" | "reflection" | "import";
}

const TOOLS: ToolDef[] = [
  // Daily practice
  {
    id: "habits",
    label: "Habits",
    description: "Track and build the small actions that compound over time.",
    icon: CheckSquare,
    iconColor: "text-emerald-500",
    href: "/habits",
    category: "daily",
  },
  {
    id: "tracking",
    label: "Tracking",
    description: "Log mood, energy, and progress across your life dimensions.",
    icon: Activity,
    iconColor: "text-blue-500",
    href: "/tracking",
    category: "daily",
  },
  {
    id: "workout",
    label: "Movement",
    description: "Workouts, training logs, and recovery guidance.",
    icon: Dumbbell,
    iconColor: "text-orange-500",
    href: "/workout",
    category: "daily",
  },
  {
    id: "meal-prep",
    label: "Nourishment",
    description: "Meal planning, containers, and nutrition support.",
    icon: Utensils,
    iconColor: "text-teal-500",
    href: "/meal-prep",
    category: "daily",
  },
  // Planning
  {
    id: "plans",
    label: "Plans",
    description: "Build and manage structured sequences for your goals.",
    icon: FileText,
    iconColor: "text-violet-500",
    href: "/plans",
    category: "planning",
  },
  {
    id: "finances",
    label: "Finances",
    description: "Budget, spending awareness, and financial clarity.",
    icon: Wallet,
    iconColor: "text-amber-500",
    href: "/finances",
    category: "planning",
  },
  {
    id: "accountability",
    label: "Accountability",
    description: "Partner check-ins and shared commitments.",
    icon: Users,
    iconColor: "text-rose-500",
    href: "/accountability",
    category: "planning",
  },
  // Reflection
  {
    id: "journal",
    label: "Journal",
    description: "Capture thoughts, reflections, and daily observations.",
    icon: BookOpen,
    iconColor: "text-indigo-500",
    href: "/journal",
    category: "reflection",
  },
  // Import / data
  {
    id: "imports",
    label: "Import & Connect",
    description: "Bring in conversations, documents, and data from other tools.",
    icon: UploadCloud,
    iconColor: "text-sky-500",
    href: "/imports",
    category: "import",
  },
];

const CATEGORY_LABELS: Record<ToolDef["category"], string> = {
  daily: "Daily Practice",
  planning: "Planning & Structure",
  reflection: "Reflection",
  import: "Import & Connect",
};

// ─── Tool card ────────────────────────────────────────────────────────────────

function ToolCard({ tool }: { tool: ToolDef }) {
  const Icon = tool.icon;
  return (
    <Link href={tool.href}>
      <Card
        className="cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.98]"
        data-testid={`tools-section-${tool.id}`}
      >
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-muted">
            <Icon className={cn("h-5 w-5", tool.iconColor)} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{tool.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {tool.description}
            </p>
          </div>
          <ChevronRight className="flex-shrink-0 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Category group ───────────────────────────────────────────────────────────

function CategoryGroup({
  category,
  tools,
}: {
  category: ToolDef["category"];
  tools: ToolDef[];
}) {
  return (
    <section>
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
        {CATEGORY_LABELS[category]}
      </h2>
      <div className="space-y-2.5">
        {tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ToolsPage() {
  usePageMeta(
    "Tools",
    "Habits, tracking, planning, journaling, and other tools to support your life system.",
  );

  const categories: ToolDef["category"][] = ["daily", "planning", "reflection", "import"];

  return (
    <div className="pb-28">
      <PageHeader title="Tools" showBack={false} />

      <div className="px-4 space-y-6">
        {/* Intro line */}
        <div className="flex items-center gap-2 pt-1">
          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            The tools that support your paths, systems, and daily practice.
          </p>
        </div>

        {/* Grouped tool cards */}
        {categories.map((cat) => {
          const tools = TOOLS.filter((t) => t.category === cat);
          if (tools.length === 0) return null;
          return <CategoryGroup key={cat} category={cat} tools={tools} />;
        })}
      </div>
    </div>
  );
}
