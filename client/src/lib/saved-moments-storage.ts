/**
 * Saved Moments storage layer — guest localStorage implementation.
 *
 * Models:
 *   MomentCategory  — user-owned category (preset or custom)
 *   SavedMoment     — a captured message or exchange from a conversation
 *
 * Guest limits:
 *   maxCategories: 8
 *   maxMoments: 30
 *
 * Auth users: stored via the same localStorage for v1; a clear TODO marks where
 * server-side persistence would be added in a future iteration.
 */

// ─── Storage keys ─────────────────────────────────────────────────────────────

const CATEGORIES_KEY = "dw_moment_categories";
const MOMENTS_KEY = "dw_saved_moments";

// ─── Limits ───────────────────────────────────────────────────────────────────

export const GUEST_MAX_CATEGORIES = 8;
export const GUEST_MAX_MOMENTS = 30;

// ─── Types ────────────────────────────────────────────────────────────────────

export type MomentKind = "single_message" | "exchange";

export interface MomentSource {
  conversationId?: string;
  messageIndex?: number;
  messageId?: string;
  kind: MomentKind;
  /** Roles captured, e.g. ["user"] or ["user", "assistant"] */
  roles: string[];
}

export interface SavedMoment {
  id: string;
  createdAt: number;
  updatedAt: number;
  categoryId: string;
  title: string;
  excerpt: string;
  source: MomentSource;
  /** Optional: "Talk" | "Chat" */
  sourceLabel?: string;
}

export interface MomentCategory {
  id: string;
  name: string;
  createdAt: number;
  isPreset: boolean;
}

// ─── Preset categories ────────────────────────────────────────────────────────

export const PRESET_CATEGORIES: MomentCategory[] = [
  { id: "preset-journal",       name: "Journal",       createdAt: 0, isPreset: true },
  { id: "preset-insights",      name: "Insights",      createdAt: 0, isPreset: true },
  { id: "preset-planning",      name: "Planning",      createdAt: 0, isPreset: true },
  { id: "preset-motivation",    name: "Motivation",    createdAt: 0, isPreset: true },
  { id: "preset-goals",         name: "Goals",         createdAt: 0, isPreset: true },
];

/** Map from detectIntent() result → preset category id */
export const INTENT_TO_CATEGORY: Record<string, string> = {
  journal:          "preset-journal",
  exploration:      "preset-insights",
  planning:         "preset-planning",
  problem_solving:  "preset-planning",
  general_chat:     "preset-journal",
  research:         "preset-insights",
  update_check:     "preset-insights",
};

// ─── Category helpers ─────────────────────────────────────────────────────────

export function getCategories(): MomentCategory[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    const custom: MomentCategory[] = raw ? JSON.parse(raw) : [];
    // Merge presets first, then custom
    const customIds = new Set(custom.map((c) => c.id));
    const presets = PRESET_CATEGORIES.filter((p) => !customIds.has(p.id));
    return [...presets, ...custom];
  } catch {
    return [...PRESET_CATEGORIES];
  }
}

function getCustomCategories(): MomentCategory[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomCategories(categories: MomentCategory[]): void {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

export function createCategory(name: string): { ok: true; category: MomentCategory } | { ok: false; error: string } {
  const all = getCategories();
  if (all.length >= GUEST_MAX_CATEGORIES) {
    return { ok: false, error: `You've reached the limit of ${GUEST_MAX_CATEGORIES} categories. Delete one to add a new one.` };
  }
  const existing = all.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
  if (existing) {
    return { ok: false, error: "A category with that name already exists." };
  }
  const category: MomentCategory = {
    id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    createdAt: Date.now(),
    isPreset: false,
  };
  const custom = getCustomCategories();
  custom.push(category);
  saveCustomCategories(custom);
  return { ok: true, category };
}

export function renameCategory(id: string, newName: string): { ok: true } | { ok: false; error: string } {
  const custom = getCustomCategories();
  const idx = custom.findIndex((c) => c.id === id);
  // Preset categories can be "renamed" by inserting a custom override
  const all = getCategories();
  const preset = PRESET_CATEGORIES.find((p) => p.id === id);
  if (preset) {
    const overrideIdx = custom.findIndex((c) => c.id === id);
    if (overrideIdx >= 0) {
      custom[overrideIdx] = { ...custom[overrideIdx], name: newName.trim() };
    } else {
      custom.push({ ...preset, name: newName.trim(), isPreset: false });
    }
    saveCustomCategories(custom);
    return { ok: true };
  }
  if (idx < 0) return { ok: false, error: "Category not found." };
  const duplicate = all.find((c) => c.id !== id && c.name.toLowerCase() === newName.trim().toLowerCase());
  if (duplicate) return { ok: false, error: "A category with that name already exists." };
  custom[idx] = { ...custom[idx], name: newName.trim() };
  saveCustomCategories(custom);
  return { ok: true };
}

export function deleteCategory(id: string): void {
  const custom = getCustomCategories();
  saveCustomCategories(custom.filter((c) => c.id !== id));
  // Also delete all moments in this category
  const moments = getMoments().filter((m) => m.categoryId !== id);
  localStorage.setItem(MOMENTS_KEY, JSON.stringify(moments));
}

// ─── Moment helpers ───────────────────────────────────────────────────────────

export function getMoments(): SavedMoment[] {
  try {
    const raw = localStorage.getItem(MOMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getMomentsByCategory(categoryId: string): SavedMoment[] {
  return getMoments().filter((m) => m.categoryId === categoryId);
}

export function saveMoment(
  input: Omit<SavedMoment, "id" | "createdAt" | "updatedAt">
): { ok: true; moment: SavedMoment } | { ok: false; error: string } {
  const moments = getMoments();
  if (moments.length >= GUEST_MAX_MOMENTS) {
    return {
      ok: false,
      error: `You've reached the limit of ${GUEST_MAX_MOMENTS} saved moments. Delete an older one to save more.`,
    };
  }
  const now = Date.now();
  const moment: SavedMoment = {
    id: `moment-${now}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  moments.push(moment);
  localStorage.setItem(MOMENTS_KEY, JSON.stringify(moments));
  return { ok: true, moment };
}

export function deleteMoment(id: string): void {
  const moments = getMoments().filter((m) => m.id !== id);
  localStorage.setItem(MOMENTS_KEY, JSON.stringify(moments));
}

export function updateMoment(id: string, patch: Partial<Pick<SavedMoment, "title" | "categoryId">>): void {
  const moments = getMoments().map((m) =>
    m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m
  );
  localStorage.setItem(MOMENTS_KEY, JSON.stringify(moments));
}

/** Build a short title from the first 6–10 words of text */
export function buildDefaultTitle(text: string): string {
  const words = text.trim().split(/\s+/).slice(0, 8);
  const joined = words.join(" ");
  return joined.length < text.trim().length ? `${joined}…` : joined;
}

/** Build a short excerpt (first 200 chars) */
export function buildExcerpt(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > 200 ? `${trimmed.slice(0, 197)}…` : trimmed;
}
