#!/bin/bash
set -e
npm install
# Bootstrap is the SOLE dev migration entry point. It replays every SQL file
# in `migrations/` via `runMigrations()` and drops legacy orphan tables, so
# `drizzle-kit push` is redundant here and only adds noise (and interactive
# rename prompts on every future schema removal we forget to add to
# ORPHAN_TABLES). Keep this script non-interactive.
npx tsx scripts/dev-db-bootstrap.ts
