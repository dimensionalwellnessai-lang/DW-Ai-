import { apiRequest } from "./queryClient";
import type { TriggerEvent, TriggerOutcome } from "@shared/schema";
import type { LifeSystemPillarId } from "@shared/lifeSystemTaxonomy";

export interface AggregatedStandard {
  text: string;
  sourcePillarId: LifeSystemPillarId | "user";
  sourceLabel: string;
  kind: "non_negotiable" | "trigger_standard" | "commandment";
}

export interface TriggerEventListResponse {
  events: TriggerEvent[];
  week: { total: number; noProof: number };
}

export interface CreateTriggerInput {
  feeling: string;
  assumption?: string | null;
  hadProof?: boolean | null;
  rootNote?: string | null;
  reframe?: string | null;
  responseChoice?: string | null;
  pauseMinutes?: number | null;
  outcome?: TriggerOutcome | null;
}

export async function createTriggerEvent(input: CreateTriggerInput): Promise<TriggerEvent> {
  const res = await apiRequest("POST", "/api/trigger-events", input);
  return await res.json();
}

export async function fetchStandards(): Promise<AggregatedStandard[]> {
  const res = await apiRequest("GET", "/api/trigger-events/standards");
  const json = (await res.json()) as { standards: AggregatedStandard[] };
  return json.standards;
}
