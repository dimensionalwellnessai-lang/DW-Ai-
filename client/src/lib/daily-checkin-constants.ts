/**
 * Shared constants for daily check-in forms (Home card + Talk modal).
 */

export const DAILY_CHECKIN_MOOD_OPTIONS: { score: number; label: string }[] = [
  { score: 1, label: "1 – Very low" },
  { score: 2, label: "2 – Low" },
  { score: 3, label: "3 – Okay" },
  { score: 4, label: "4 – Good" },
  { score: 5, label: "5 – Great" },
];

export const DAILY_CHECKIN_CONSTRAINT_OPTIONS: string[] = [
  "Time",
  "Energy",
  "Focus",
  "Motivation",
  "Stress",
  "Physical discomfort",
  "Social / environment",
  "Nothing major",
  "Other",
];
