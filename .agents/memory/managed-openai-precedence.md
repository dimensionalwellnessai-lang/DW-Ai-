---
name: Managed OpenAI precedence
description: Credential precedence and audio capability differences between direct OpenAI and Replit-managed OpenAI.
---

When both credential sets exist in the runtime, prefer the complete `AI_INTEGRATIONS_OPENAI_BASE_URL` + `AI_INTEGRATIONS_OPENAI_API_KEY` pair over `OPENAI_API_KEY`.

**Why:** A stale direct key can remain injected into a running process even when secret management reports it absent. Direct-key-first selection silently routes requests to a depleted OpenAI account while valid managed credentials are available.

**How to apply:** Keep provider selection consistent across every AI client. The managed endpoint supports chat and `gpt-4o-mini-transcribe`; it does not support the legacy `whisper-1` model or the current `/audio/speech` call. Preserve uploaded audio filenames/extensions because the managed transcription endpoint validates the actual format.