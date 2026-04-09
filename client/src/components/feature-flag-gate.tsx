import type { FeatureFlags } from "@/config/featureFlags";
import { isFeatureEnabled } from "@/config/featureFlags";

interface FeatureFlagGateProps {
  flag: keyof FeatureFlags;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureFlagGate({ flag, children, fallback = null }: FeatureFlagGateProps) {
  if (!isFeatureEnabled(flag)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
