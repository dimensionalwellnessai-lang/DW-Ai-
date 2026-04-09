import { AccountabilityDashboard } from "@/components/accountability-dashboard";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function AccountabilityPage() {
  usePageMeta("Accountability", "Track your commitments and accountability partnerships.");
  return <AccountabilityDashboard />;
}
