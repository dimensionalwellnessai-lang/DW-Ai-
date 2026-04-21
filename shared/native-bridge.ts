/**
 * Native bridge contract for the future iOS shell (Capacitor / native plugin).
 *
 * The web app is the source of truth, but Apple Health and Screen Time can
 * only be read from inside an iOS app. The iOS shell injects an object that
 * matches `WearableNativeBridge` onto `window`. The web client probes for it
 * and, when present, prefers native pulls over the user-driven export upload.
 *
 * No JS implementation is shipped with the web build. The follow-up native
 * task will provide a Capacitor plugin (or WKScriptMessageHandler bridge)
 * that fulfils this interface and POSTs the resulting payloads to:
 *   - POST /api/wearables/apple-health/import   (multipart `file` = export.xml)
 *   - POST /api/wearables/screen-time/import    (JSON `{ days: [...] }`)
 */

export interface AppleHealthExportRequest {
  /** Limit pulled samples to this number of trailing days. Default: 30. */
  trailingDays?: number;
  /** HealthKit identifiers the shell should request permission for. */
  identifiers?: string[];
}

export interface AppleHealthExportResult {
  /** Base64 of the generated export.xml content. */
  xmlBase64: string;
  /** Optional summary returned by the native side for telemetry. */
  recordCount?: number;
}

export interface ScreenTimeDay {
  /** ISO calendar date (YYYY-MM-DD). */
  dateKey: string;
  totalMinutes: number;
  byCategory?: Record<string, number>;
  byApp?: Record<string, number>;
}

export interface ScreenTimePullRequest {
  /** Limit pulled days to this trailing window. Default: 14. */
  trailingDays?: number;
}

export interface ScreenTimePullResult {
  days: ScreenTimeDay[];
}

export interface WearableNativeBridge {
  /** Returns true if the host app can satisfy the requested capability. */
  isAvailable(capability: "apple_health" | "screen_time"): Promise<boolean>;
  /** Triggers HealthKit auth + export pipeline. */
  pullAppleHealth(req?: AppleHealthExportRequest): Promise<AppleHealthExportResult>;
  /** Triggers the FamilyControls / DeviceActivity pipeline. */
  pullScreenTime(req?: ScreenTimePullRequest): Promise<ScreenTimePullResult>;
}

declare global {
  interface Window {
    /** Injected by the iOS shell at startup. */
    DWNativeWearables?: WearableNativeBridge;
  }
}

export {};
