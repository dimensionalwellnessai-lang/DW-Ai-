// Client-side helpers for the Life System (3-level pillar model).
// Re-exports the shared taxonomy so client code has a single import surface.
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type {
  LifeSystemPillar,
  LifeSystemProject,
  LifeSystemDocument,
} from "@shared/schema";
import type { LifeSystemPillarId, PillarDefinition } from "@shared/lifeSystemTaxonomy";
import { PILLARS, PILLAR_BY_ID, LEVEL_META } from "@shared/lifeSystemTaxonomy";
import type { PillarContent } from "@shared/lifeSystemContent";

export {
  PILLARS,
  PILLAR_BY_ID,
  LEVEL_META,
  type LifeSystemPillarId,
  type PillarDefinition,
};

export interface LifeSystemState {
  pillars: LifeSystemPillar[];
  projects: LifeSystemProject[];
}

export function useLifeSystem() {
  return useQuery<LifeSystemState>({
    queryKey: ["/api/life-system/pillars"],
  });
}

export function useLifeSystemDocument() {
  return useQuery<{ document: LifeSystemDocument | null }>({
    queryKey: ["/api/life-system/document"],
  });
}

export async function adoptStarterTemplate(reset = false): Promise<LifeSystemState> {
  const res = await apiRequest("POST", "/api/life-system/adopt-starter", { reset });
  return await res.json();
}

export async function generateLifeSystemDocument(): Promise<LifeSystemDocument> {
  const res = await apiRequest("POST", "/api/life-system/document/generate", {});
  const data = await res.json();
  return data.document;
}

export async function upsertPillar(
  pillarId: LifeSystemPillarId,
  patch: { enabled?: boolean; content?: PillarContent },
): Promise<LifeSystemPillar> {
  const res = await apiRequest("PATCH", `/api/life-system/pillars/${pillarId}`, patch);
  return await res.json();
}

export async function createProject(input: {
  name: string;
  description?: string;
  currentFocus?: string;
  status?: "vision" | "active" | "paused" | "done";
}): Promise<LifeSystemProject> {
  const res = await apiRequest("POST", "/api/life-system/projects", input);
  return await res.json();
}

export async function updateProject(
  id: string,
  patch: {
    name?: string;
    description?: string;
    currentFocus?: string;
    weeklyCadence?: string;
    nextAction?: string;
    status?: "vision" | "active" | "paused" | "done";
  },
): Promise<LifeSystemProject> {
  const res = await apiRequest("PATCH", `/api/life-system/projects/${id}`, patch);
  return await res.json();
}

export async function deleteProject(id: string): Promise<void> {
  await apiRequest("DELETE", `/api/life-system/projects/${id}`);
}

/** Get the pillar row for a definition; returns undefined if not yet saved. */
export function findPillarRow(state: LifeSystemState | undefined, id: LifeSystemPillarId) {
  return state?.pillars.find(p => p.pillarId === id);
}

export function getPillarUserVoice(
  state: LifeSystemState | undefined,
  id: LifeSystemPillarId,
): string {
  const row = findPillarRow(state, id);
  const c = (row?.content ?? {}) as PillarContent;
  return c.userVoice ?? "";
}
