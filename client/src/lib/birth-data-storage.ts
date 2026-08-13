/**
 * Owner-scoped localStorage persistence for cosmic birth details.
 *
 * Birth details are sensitive personal data, and `localStorage` is shared by
 * every account that uses this browser. To prevent one user's cached birth
 * details from leaking into another account, each stored record is tagged
 * with the id of the account that owns it (`ownerId: null` for guests).
 * Reads only return a record when the requested owner matches.
 *
 * Legacy records written before owner tagging (a bare BirthData object) are
 * treated as guest-owned: guests can still see them, but authenticated
 * accounts never inherit them automatically.
 */

export interface BirthData {
  birthDate: string;
  birthTime?: string;
  birthPlace?: string;
  houseSystem?: string;
  zodiacSystem?: string;
}

interface StoredBirthData {
  /** Account id that saved the record, or null when saved as a guest. */
  ownerId: string | null;
  data: BirthData;
}

export const BIRTH_CHART_KEY = "dw_birth_chart";

function parseRaw(): StoredBirthData | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(BIRTH_CHART_KEY);
  } catch {
    return null; // storage unavailable (private mode, etc.)
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    // New wrapped format
    if ("ownerId" in parsed && "data" in parsed) {
      const data = (parsed as StoredBirthData).data;
      if (!data?.birthDate) return null;
      return {
        ownerId: typeof parsed.ownerId === "string" ? parsed.ownerId : null,
        data,
      };
    }
    // Legacy bare BirthData → guest-owned
    if (typeof (parsed as BirthData).birthDate === "string") {
      return { ownerId: null, data: parsed as BirthData };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns the stored birth details only if they belong to `ownerId`
 * (pass `null` for guests). Records owned by anyone else are ignored.
 */
export function loadBirthDataFor<T extends BirthData = BirthData>(ownerId: string | null): T | null {
  const stored = parseRaw();
  if (!stored) return null;
  return stored.ownerId === ownerId ? (stored.data as T) : null;
}

/** Saves birth details tagged with the owning account (null for guests). */
export function saveBirthDataFor<T extends BirthData>(data: T, ownerId: string | null): void {
  try {
    localStorage.setItem(
      BIRTH_CHART_KEY,
      JSON.stringify({ ownerId, data } satisfies StoredBirthData),
    );
  } catch {
    // Storage may be unavailable (quota exceeded, private mode)
  }
}
