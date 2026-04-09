import { AccountabilitySettings } from "@/components/accountability-settings";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function AccountabilitySettingsPage() {
  usePageMeta("Accountability Settings", "Configure your accountability partners and check-in preferences.");
  return <AccountabilitySettings />;
}
