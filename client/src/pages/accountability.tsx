import { AccountabilityDashboard } from "@/components/accountability-dashboard";
import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function AccountabilityPage() {
  usePageMeta("Accountability", "Track your commitments and accountability partnerships.");
  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Accountability" />
      <div className="flex-1 overflow-auto">
        <AccountabilityDashboard />
      </div>
    </div>
  );
}
