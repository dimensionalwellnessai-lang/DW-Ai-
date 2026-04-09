/**
 * Dimension Overview Page
 *
 * Generic page rendered at `/dimension/:id` that uses DimensionOverviewTemplate
 * to display a standardised view for any of the 8 life dimensions.
 *
 * The route is registered in App.tsx as:
 *   <Route path="/dimension/:id" component={DimensionOverviewPage} />
 */

import { useRoute } from "wouter";
import { DimensionOverviewTemplate } from "@/components/DimensionOverviewTemplate";
import type { SwitchId } from "@/lib/switch-storage";
import { usePageMeta } from "@/hooks/use-page-meta";

const VALID_DIMENSION_IDS: SwitchId[] = [
  "body",
  "mind",
  "time",
  "purpose",
  "money",
  "relationships",
  "environment",
  "identity",
];

function isValidDimensionId(id: string): id is SwitchId {
  return VALID_DIMENSION_IDS.includes(id as SwitchId);
}

export default function DimensionOverviewPage() {
  usePageMeta("Dimension Overview", "Explore and assess your wellness dimensions.");
  const [, params] = useRoute("/dimension/:id");
  const id = params?.id ?? "";

  if (!isValidDimensionId(id)) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div>
          <p className="text-lg font-medium text-foreground mb-2">Dimension not found</p>
          <p className="text-sm text-muted-foreground">
            "{id}" is not a recognised life dimension.
          </p>
        </div>
      </div>
    );
  }

  return <DimensionOverviewTemplate dimensionId={id} />;
}
