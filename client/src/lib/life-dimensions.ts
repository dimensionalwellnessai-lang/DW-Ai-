/**
 * Legacy compatibility shim — Phase B deprecation.
 *
 * The old 8-dimension wellness model (LIFE_DIMENSIONS, ASSESSMENT_QUESTIONS)
 * has been superseded by the Life System pillar taxonomy in
 * shared/lifeSystemTaxonomy.ts. This file re-exports the canonical model
 * under the old surface so existing imports continue to compile while the
 * pages that used them are migrated.
 *
 * DO NOT add new code here. Import directly from @/../../shared/lifeSystemTaxonomy
 * or use the LEGACY_TO_PILLAR_MAP for reading old assessment rows.
 */
export {
  PILLARS as LIFE_DIMENSIONS,
  PILLAR_BY_ID,
  PILLARS_BY_LEVEL,
  LEGACY_TO_PILLAR_MAP,
  PILLAR_STATUSES,
  LEVEL_META,
  toneForLevel,
  isValidPillarId,
  type PillarDefinition as LifeDimension,
  type LifeSystemPillarId,
  type PillarStatus,
} from "../../../shared/lifeSystemTaxonomy";

/** @deprecated Use LEGACY_TO_PILLAR_MAP + pillar openingQuestion instead. */
export const ASSESSMENT_QUESTIONS: Record<string, string[]> = {};

/** @deprecated Use PILLAR_BY_ID from shared/lifeSystemTaxonomy. */
export function getDimensionById(id: string) {
  return PILLAR_BY_ID[id as import("../../../shared/lifeSystemTaxonomy").LifeSystemPillarId] ?? undefined;
}
