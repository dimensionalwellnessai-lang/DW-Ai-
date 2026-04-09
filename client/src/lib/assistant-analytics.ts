import { apiRequest } from "@/lib/queryClient";

export interface AssistantActionLog {
  platform?: string;
  source: string;
  action: string;
  parameters?: Record<string, string>;
  success: boolean;
  durationMs?: number;
}

export async function logAssistantAction(log: AssistantActionLog): Promise<void> {
  try {
    const platform = (() => {
      if (typeof window === "undefined") return "web";
      const cap = (window as any).Capacitor;
      if (!cap) return "web";
      return cap.getPlatform?.() ?? "native";
    })();
    await apiRequest("POST", "/api/assistant/log", {
      ...log,
      platform: log.platform ?? platform,
      parametersJson: JSON.stringify(log.parameters ?? {}),
    });
  } catch {
    // analytics failures are silent
  }
}
