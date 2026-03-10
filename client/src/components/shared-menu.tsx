import { Link } from "wouter";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { SwipeableDrawer } from "@/components/swipeable-drawer";
import { APP_VERSION } from "@/lib/routes";
import { useAuth } from "@/hooks/use-auth";
import {
  Zap,
  MessageCircle,
  Calendar,
  BookOpen,
  Target,
  CheckSquare,
  Dumbbell,
  Utensils,
  Heart,
  Feather,
  Sparkles,
  Wallet,
  Users,
  Search,
  Award,
  RefreshCw,
  Activity,
  BarChart3,
  FileText,
  Settings,
  Map,
  MessageSquare,
  Lock,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: any;
}

interface MenuSection {
  title: string;
  defaultOpen?: boolean;
  items: MenuItem[];
}

const QUICK_ACCESS: MenuItem[] = [
  { id: "command-center", label: "Life Command Center", path: "/command-center", icon: Zap },
  { id: "talk", label: "Talk to DW", path: "/talk", icon: MessageCircle },
  { id: "calendar", label: "Life Timeline", path: "/calendar", icon: Calendar },
];

const SECTIONS: MenuSection[] = [
  {
    title: "My Identity",
    defaultOpen: true,
    items: [
      { id: "life-blueprint", label: "Life Blueprint", path: "/life-blueprint", icon: BookOpen },
      { id: "goals", label: "My Goals", path: "/goals", icon: Target },
      { id: "habits", label: "My Habits", path: "/habits", icon: CheckSquare },
    ],
  },
  {
    title: "Body & Mind",
    defaultOpen: true,
    items: [
      { id: "workout", label: "Workout", path: "/workout", icon: Dumbbell },
      { id: "meal-prep", label: "Meal Prep", path: "/meal-prep", icon: Utensils },
      { id: "meditation", label: "Meditation", path: "/spiritual", icon: Heart },
      { id: "journal", label: "Journal", path: "/journal", icon: Feather },
    ],
  },
  {
    title: "Life Dimensions",
    items: [
      { id: "astrology", label: "Cosmic Insights", path: "/cosmic-insights", icon: Sparkles },
      { id: "cosmic", label: "Cosmic Hub", path: "/cosmic", icon: Sparkles },
      { id: "finances", label: "Finances", path: "/finances", icon: Wallet },
      { id: "community", label: "Community", path: "/community", icon: Users },
    ],
  },
  {
    title: "Explore & Systems",
    items: [
      { id: "browse", label: "Browse", path: "/browse", icon: Search },
      { id: "challenges", label: "Challenges", path: "/challenges", icon: Award },
      { id: "recovery", label: "Recovery", path: "/recovery", icon: RefreshCw },
      { id: "switchboard", label: "Switch Training", path: "/switchboard", icon: Activity },
      { id: "progress", label: "My Progress", path: "/profile/progress", icon: BarChart3 },
      { id: "routines", label: "Routines", path: "/routines", icon: FileText },
      { id: "tasks", label: "Tasks", path: "/tasks", icon: CheckSquare },
    ],
  },
  {
    title: "Settings & Support",
    items: [
      { id: "settings", label: "Settings", path: "/settings", icon: Settings },
      { id: "app-tour", label: "App Tour", path: "/app-tour", icon: Map },
      { id: "feedback", label: "Feedback", path: "/feedback", icon: MessageSquare },
      { id: "privacy", label: "Privacy & Terms", path: "/privacy-terms", icon: Lock },
    ],
  },
];

interface SharedMenuProps {
  open: boolean;
  onClose: () => void;
  elevated?: boolean;
}

function MenuItemRow({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const Icon = item.icon;
  return (
    <Link href={item.path}>
      <button
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 text-left transition-colors"
        onClick={onClose}
        data-testid={`menu-item-${item.id}`}
      >
        <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-foreground" />
        </div>
        <span className="text-sm font-medium text-foreground flex-1">{item.label}</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
      </button>
    </Link>
  );
}

function CollapsibleSection({
  section,
  onClose,
}: {
  section: MenuSection;
  onClose: () => void;
}) {
  const [isOpen, setIsOpen] = React.useState(section.defaultOpen ?? false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        data-testid={`menu-section-${section.title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {section.title}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="space-y-0.5 pb-1">
          {section.items.map((item) => (
            <MenuItemRow key={item.id} item={item} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SharedMenu({ open, onClose, elevated }: SharedMenuProps) {
  const { user, logout } = useAuth();

  return (
    <SwipeableDrawer
      open={open}
      onClose={onClose}
      title="Menu"
      elevated={elevated}
    >
      {user && (
        <div className="mb-3 pb-3 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-semibold text-primary">
                {user.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-medium truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto min-h-0 space-y-1">
        <div className="space-y-0.5 pb-2 border-b mb-2">
          {QUICK_ACCESS.map((item) => (
            <MenuItemRow key={item.id} item={item} onClose={onClose} />
          ))}
        </div>

        {SECTIONS.map((section) => (
          <CollapsibleSection key={section.title} section={section} onClose={onClose} />
        ))}
      </nav>

      <div className="pt-3 space-y-2 border-t mt-2">
        {user ? (
          <Button
            variant="outline"
            className="w-full"
            size="sm"
            onClick={async () => {
              await logout();
              onClose();
            }}
            data-testid="button-signout"
          >
            Logout
          </Button>
        ) : (
          <Link href="/login">
            <Button className="w-full" size="sm" data-testid="button-signup">
              Sign in / Sign up
            </Button>
          </Link>
        )}
      </div>
      <div className="pt-2 text-center">
        <p className="text-xs text-muted-foreground">v{APP_VERSION}</p>
      </div>
    </SwipeableDrawer>
  );
}
