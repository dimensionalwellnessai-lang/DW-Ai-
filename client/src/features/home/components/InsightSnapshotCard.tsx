/**
 * InsightSnapshotCard – shows the most recent DW-generated insight as a reading card.
 * Uses ReadingCard for a premium, consistent display.
 * Empty state: prompts the user to start a conversation.
 */

import { ReadingCard, type ReadingCardData } from "./ReadingCard";
import type { HomeSummary } from "../types";

interface InsightSnapshotCardProps {
  summary: Pick<HomeSummary, "latestInsight">;
}

export function InsightSnapshotCard({ summary }: InsightSnapshotCardProps) {
  const { latestInsight } = summary;

  const readingData: ReadingCardData | null = latestInsight
    ? {
        id: latestInsight.id,
        headline: latestInsight.title,
        summary: latestInsight.summary,
        category: latestInsight.category || undefined,
      }
    : null;

  return <ReadingCard data={readingData} compact />;
}
