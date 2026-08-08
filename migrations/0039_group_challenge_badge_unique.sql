-- Migration 0039: DB-level guard so a finisher can never earn the same
-- group-challenge completion badge twice.
--
-- The check-in handler already prevents the double-award race via a
-- conditional UPDATE on group_challenge_participants.completed_at, but
-- nothing at the persistence layer stopped a future code path from
-- inserting a duplicate achievements row for the same (user, challenge).
--
-- Guard: a partial unique index on achievements over
-- (user_id, achievement_type, metadata->>'challengeId'), scoped to
-- group_challenge rows that carry a challengeId.

-- Remove any pre-existing duplicates first (keep the earliest unlock).
DELETE FROM achievements a
USING achievements b
WHERE a.achievement_type = 'group_challenge'
  AND b.achievement_type = 'group_challenge'
  AND a.user_id = b.user_id
  AND a.metadata->>'challengeId' IS NOT NULL
  AND a.metadata->>'challengeId' = b.metadata->>'challengeId'
  AND (b.unlocked_at, b.id) < (a.unlocked_at, a.id);

CREATE UNIQUE INDEX IF NOT EXISTS achievements_group_challenge_unique_idx
  ON achievements (user_id, achievement_type, (metadata->>'challengeId'))
  WHERE achievement_type = 'group_challenge'
    AND metadata->>'challengeId' IS NOT NULL;
