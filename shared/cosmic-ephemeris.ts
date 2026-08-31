export interface DateWindow {
  start: string;
  end: string;
}

export const MERCURY_RETROGRADE_WINDOWS: Record<number, DateWindow[]> = {
  2025: [
    { start: "2025-03-15T00:00:00Z", end: "2025-04-07T23:59:59Z" },
    { start: "2025-07-18T00:00:00Z", end: "2025-08-11T23:59:59Z" },
    { start: "2025-11-09T00:00:00Z", end: "2025-11-29T23:59:59Z" },
  ],
  2026: [
    { start: "2026-02-26T00:00:00Z", end: "2026-03-20T23:59:59Z" },
    { start: "2026-06-29T00:00:00Z", end: "2026-07-23T23:59:59Z" },
    { start: "2026-10-24T00:00:00Z", end: "2026-11-13T23:59:59Z" },
  ],
  2027: [
    { start: "2027-02-09T00:00:00Z", end: "2027-03-03T23:59:59Z" },
    { start: "2027-06-10T00:00:00Z", end: "2027-06-26T23:59:59Z" },
    { start: "2027-10-07T00:00:00Z", end: "2027-10-28T23:59:59Z" },
  ],
};

export function getMercuryRetrogradeWindows(year: number): DateWindow[] {
  return MERCURY_RETROGRADE_WINDOWS[year] ?? [];
}

export function isMercuryRetrogradeWindow(now = new Date()): boolean {
  const windows = getMercuryRetrogradeWindows(now.getFullYear());
  const timestamp = now.getTime();
  return windows.some(({ start, end }) => {
    const startTimestamp = new Date(start).getTime();
    const endTimestamp = new Date(end).getTime();
    return timestamp >= startTimestamp && timestamp <= endTimestamp;
  });
}
