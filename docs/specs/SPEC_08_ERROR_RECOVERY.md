# SPEC 8 — ERROR, FAILURE & RECOVERY SPEC (FROZEN)

## Purpose

How the system behaves when things don't work matters more than when they do.

---

## Error Philosophy

Errors are treated as:
- neutral
- temporary
- non-personal

---

## Approved Error Language

- "Something glitched. Let's try that again."
- "That didn't land — no problem."
- "We can pause and come back."

---

## Disallowed Error Language

- "Something went wrong"
- "Invalid input"
- "Error 404"
- Anything technical or blaming

---

## Recovery Rule

After an error:
1. Acknowledge calmly
2. Offer retry
3. Offer skip

Never trap the user.
