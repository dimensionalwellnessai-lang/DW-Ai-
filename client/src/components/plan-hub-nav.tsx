import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { isFeatureEnabled } from "@/config/featureFlags";

/**
 * PlanHubNav — shared segmented sub-navigation that turns the family of
 * overlapping plan pages into tabs of a single "My Plan" hub.
 *
 * Rendered directly under the PageHeader on:
 *   /my-plan, /plans, /elevation-plan, /action-center
 *
 * Active tab is derived from the current location (including sub-paths and
 * query params). Feature-flag-gated destinations hide their tabs when the
 * corresponding flag is disabled, matching how each page reads its flag.
 */

interface HubTab {
  id: string;
  label: string;
  /** Base path used for navigation. */
  to: string;
  /** Returns true when the current location should highlight this tab. */
  isActive: (pathname: string, search: string) => boolean;
  /** When false, the tab is hidden. */
  enabled: boolean;
}

export function PlanHubNav() {
  const [location, setLocation] = useLocation();

  // wouter's `location` is the pathname only; read query params separately.
  const search = typeof window !== "undefined" ? window.location.search : "";

  const elevationEnabled = isFeatureEnabled("ELEVATION_PLAN");
  const followupsEnabled = isFeatureEnabled("DW_INSIGHT_JOURNAL");

  const tabs: HubTab[] = [
    {
      id: "this-week",
      label: "This Week",
      to: "/my-plan",
      isActive: (p) => p === "/my-plan",
      enabled: true,
    },
    {
      id: "plans",
      label: "Plans",
      to: "/plans",
      isActive: (p) => p === "/plans" || p.startsWith("/plans/"),
      enabled: true,
    },
    {
      id: "elevation",
      label: "Elevation",
      to: "/elevation-plan",
      isActive: (p) => p === "/elevation-plan",
      enabled: elevationEnabled,
    },
    {
      id: "follow-ups",
      label: "Follow-ups",
      to: "/action-center",
      isActive: (p) => p === "/action-center",
      enabled: followupsEnabled,
    },
  ];

  const visibleTabs = tabs.filter((t) => t.enabled);

  return (
    <div className="px-4 pt-3" data-testid="plan-hub-nav">
      <div className="inline-flex w-full items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground overflow-x-auto">
        {visibleTabs.map((tab) => {
          const active = tab.isActive(location, search);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setLocation(tab.to)}
              data-testid={`plan-hub-tab-${tab.id}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
