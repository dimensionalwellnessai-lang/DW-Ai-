---
name: Resend email configuration
description: How outbound email creds resolve and the pitfalls that broke password resets
---

# Resend email wiring

`server/email.ts` resolves credentials in this order: `RESEND_API_KEY` env → Replit Resend
connector. The from-address prefers `RESEND_FROM_EMAIL` in both paths (gmail addresses are
rejected → shared `onboarding@resend.dev` fallback, which can only email the Resend account
owner's own address).

**Why:** Password resets silently failed for all users because the connector's key was a
test-mode key limited to the owner's inbox; later the key wasn't linked to the verified
domain. Working setup: user verified `send.dimensionalwellnessai.com` on Resend, and a
Full-access key is stored as the `RESEND_API_KEY` secret with
`RESEND_FROM_EMAIL=no-reply@send.dimensionalwellnessai.com` (shared env). Updating the key
inside the Replit Resend connection did NOT take effect; the direct secret did.

**How to apply:** when email "isn't arriving", check deployment logs for `[email] Resend API
error` lines first — the forgot-password endpoint returns success even when the send fails.
Test quickly via a tsx script calling `sendPasswordResetEmail`. Production picks up env/secret
changes only after republish.
