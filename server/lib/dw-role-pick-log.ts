/**
 * Fire-and-forget telemetry for the DW Adaptive Role Picker.
 *
 * Every chat / smart / realtime turn calls `logDwRolePick` after deciding
 * which lane to apply. Writes are awaited inside a void IIFE so the caller
 * never blocks; failures are logged but never surface to the user.
 */
import { createHash } from "crypto";
import { storage } from "../storage";
import type { DWMode } from "@shared/dw-persona";
import type {
  DWRolePickSurface,
  DWRolePickSource,
} from "@shared/schema";

export interface LogPickArgs {
  userId: string;
  surface: DWRolePickSurface;
  message: string;
  mode: DWMode;
  source: DWRolePickSource;
  confidence: number;
  reason?: string | null;
  locked: boolean;
  applied: boolean;
}

function hashMessage(message: string): string {
  return createHash("sha256").update(message).digest("hex").slice(0, 16);
}

export function logDwRolePick(args: LogPickArgs): void {
  void (async () => {
    try {
      const inserted = await storage.recordDwRolePick({
        userId: args.userId,
        surface: args.surface,
        mode: args.mode,
        source: args.source,
        // numeric column is stored as a string by drizzle; clamp + format.
        confidence: Math.max(0, Math.min(1, args.confidence)).toFixed(3) as unknown as string,
        reason: args.reason ?? null,
        locked: args.locked,
        applied: args.applied,
        messageHash: hashMessage(args.message),
        messageLength: args.message.length,
      });
      // If this turn was locked AND it differs from the immediately previous
      // pick on this surface for the same user, mark that previous pick as
      // overridden so the admin summary reflects "user disagreed".
      if (args.locked) {
        await storage.markPriorPickOverridden(
          args.userId,
          args.surface,
          inserted.createdAt ?? new Date(),
          args.mode,
        );
      }
    } catch (err) {
      console.warn("[dw-role-pick-log] write failed", (err as Error).message);
    }
  })();
}
