#!/bin/bash
set -e
npm install
# Bootstrap any missing tables/columns the dev DB has drifted away from
# (drizzle-kit push prompts interactively for renames, which kills CI/post-merge).
npx tsx scripts/dev-db-bootstrap.ts
npx drizzle-kit push --force || true
