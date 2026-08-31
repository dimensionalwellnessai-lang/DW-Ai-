import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePageMeta } from "@/hooks/use-page-meta";

interface DimensionAssessment {
  dimension: string;
  score: number;
  assessedAt?: string;
}

interface BlueprintResponse {
  actions?: Array<{ actionName?: string; dimensionTags?: string[] | null }>;
}

type ZoneId =
  | "physical"
  | "mental"
  | "spiritual"
  | "financial"
  | "relationships"
  | "career"
  | "learning"
  | "environment"
  | "creativity"
  | "fun"
  | "community"
  | "rest"
  | "identity";

const ZONES: Array<{ id: ZoneId; label: string; dimensionKey?: string }> = [
  { id: "physical", label: "Physical", dimensionKey: "physical" },
  { id: "mental", label: "Mental", dimensionKey: "mental" },
  { id: "spiritual", label: "Spiritual", dimensionKey: "spiritual" },
  { id: "financial", label: "Financial", dimensionKey: "financial" },
  { id: "relationships", label: "Relationships", dimensionKey: "social" },
  { id: "career", label: "Career", dimensionKey: "occupational" },
  { id: "learning", label: "Learning", dimensionKey: "intellectual" },
  { id: "environment", label: "Environment", dimensionKey: "environmental" },
  { id: "creativity", label: "Creativity" },
  { id: "fun", label: "Fun" },
  { id: "community", label: "Community" },
  { id: "rest", label: "Rest" },
  { id: "identity", label: "Identity" },
];

function zoneTrend(level: number) {
  if (level <= 2) return "Dim";
  if (level === 3) return "Flickering";
  if (level === 4) return "Bright";
  return "Radiant";
}

export default function LifeDimensionsPage() {
  usePageMeta("Zones Dashboard", "Read-only state of your 13 Zones, synced from your Blueprint data.");

  const assessments = useQuery<DimensionAssessment[]>({ queryKey: ["/api/life-dimension-assessments"] });
  const blueprint = useQuery<BlueprintResponse>({ queryKey: ["/api/blueprint"] });

  const zones = useMemo(() => {
    const rows = assessments.data ?? [];
    return ZONES.map((zone) => {
      const source = zone.dimensionKey
        ? rows.find((row) => row.dimension.toLowerCase() === zone.dimensionKey)
        : undefined;
      const level = source ? Math.max(1, Math.min(5, Math.round(source.score))) : 2;
      const lastAction =
        blueprint.data?.actions?.find((action) =>
          (action.dimensionTags ?? []).some((tag) => tag.toLowerCase() === (zone.dimensionKey ?? zone.id)),
        )?.actionName ?? undefined;
      return { ...zone, level, trend: zoneTrend(level), lastAction };
    });
  }, [assessments.data, blueprint.data]);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Zones Dashboard" />
      <div className="mx-auto max-w-4xl space-y-4 px-4 pb-24 pt-4">
        <Card>
          <CardHeader>
            <CardTitle>Zones overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This dashboard is read-only and reflects your Blueprint + assessment data.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-2">
          {zones.map((zone) => (
            <Card key={zone.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{zone.label}</p>
                  <Badge variant="outline">{zone.level}/5</Badge>
                </div>
                <p className="text-sm text-muted-foreground">State: {zone.trend}</p>
                {zone.lastAction && <p className="text-xs text-primary">Last reset protocol: {zone.lastAction}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
