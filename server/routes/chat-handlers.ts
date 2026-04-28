/**
 * Express handlers for /api/chat and /api/chat/smart.
 *
 * Extracted from `server/routes.ts` so that:
 *   1. The chat endpoints are independently testable (mounted onto a fresh
 *      Express app in `server/__tests__/chat-handlers.test.ts`) without
 *      pulling in the entire 13k-line routes module + OAuth + rate limiter
 *      side effects.
 *   2. Both surfaces share the same DW adaptive-role glue (see
 *      `resolveAdaptiveDWMode` in `../lib/dw-role-picker`).
 *
 * Behaviour and response shape are unchanged from the previous inline
 * definitions — the corresponding `app.post(...)` calls in `routes.ts`
 * now just bind these handlers.
 */

import type { Request, Response } from "express";

import { storage } from "../storage";
import {
  generateChatResponse,
  detectIntentAndRespond,
  enforceOneQuestion,
  getAiConfigStatus,
} from "../openai";
import { detectTriggerSuggestion } from "./trigger-detection";
import { buildPersonSuggestion } from "./relationships";
import { safeGetWearablesYesterday } from "./wearables";
import {
  CONTEXT_SYSTEM_OVERRIDES,
  DW_MAX_MESSAGE_CONTENT_LENGTH,
  extractCategoryData,
  extractSyncableItems,
} from "./_shared";
import { getUserContextSnapshot, toUserLifeContext } from "../lib/user-context";
import { resolveAdaptiveDWMode } from "../lib/dw-role-picker";
import { logDwRolePick } from "../lib/dw-role-pick-log";

/** POST /api/chat — classic single-shot DW chat with tool use. */
export async function chatHandler(req: Request, res: Response) {
  // Computed up here so it survives the AI-unavailable fallback path
  // below — the trigger detector is a pure function on `message` and
  // must never be gated behind a working OpenAI key. (E.g. when the
  // user types "i think she's cheating", we still owe them the reset
  // offer even if the LLM is down.)
  const triggerSuggestion = detectTriggerSuggestion(req.body?.message);

  try {
    const { message, conversationHistory, context, modeLock, previousMode } = req.body;

    // Validate message content
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }
    if (message.length > DW_MAX_MESSAGE_CONTENT_LENGTH) {
      return res.status(400).json({ error: `Message is too long (max ${DW_MAX_MESSAGE_CONTENT_LENGTH} characters)` });
    }

    const userId = req.session.userId!;

    const snapshot = await getUserContextSnapshot(userId);
    const userContext = toUserLifeContext(snapshot, { category: context });

    // Adaptive role: pick the right DW lane unless the client locked one.
    // Hysteresis against `previousMode` is handled inside the resolver.
    const dwModeResult = await resolveAdaptiveDWMode({
      message,
      snapshot,
      modeLock,
      previousMode,
    });

    logDwRolePick({
      userId,
      surface: "chat",
      message,
      ...dwModeResult.logFields,
    });

    const rawResponse = await generateChatResponse(
      message,
      conversationHistory || [],
      userContext,
      dwModeResult.modeAddendum,
    );

    const response = typeof rawResponse === "string" ? rawResponse : rawResponse.content;
    const toolCalls = typeof rawResponse === "object" && "toolCalls" in rawResponse ? rawResponse.toolCalls : [];

    const actionsTaken: string[] = [];
    for (const toolCall of toolCalls) {
      try {
        switch (toolCall.name) {
          case "create_schedule_block":
            await storage.createScheduleBlock({
              userId,
              title: toolCall.arguments.title,
              startTime: toolCall.arguments.startTime,
              endTime: toolCall.arguments.endTime,
              dayOfWeek: toolCall.arguments.dayOfWeek,
              category: toolCall.arguments.category || "personal",
            });
            actionsTaken.push(`Added "${toolCall.arguments.title}" to your schedule`);
            break;
          case "log_mood":
            await storage.createMoodLog({
              userId,
              energyLevel: toolCall.arguments.energyLevel,
              moodLevel: toolCall.arguments.moodLevel,
              clarityLevel: toolCall.arguments.clarityLevel,
              notes: toolCall.arguments.notes,
            });
            actionsTaken.push(`Logged your mood (energy: ${toolCall.arguments.energyLevel}/5, mood: ${toolCall.arguments.moodLevel}/5)`);
            break;
          case "create_goal":
            await storage.createGoal({
              userId,
              title: toolCall.arguments.title,
              description: toolCall.arguments.description,
              wellnessDimension: toolCall.arguments.wellnessDimension,
              isActive: true,
            });
            actionsTaken.push(`Created goal: "${toolCall.arguments.title}"`);
            break;
          case "create_habit":
            await storage.createHabit({
              userId,
              title: toolCall.arguments.title,
              description: toolCall.arguments.description,
              frequency: toolCall.arguments.frequency,
              reminderTime: toolCall.arguments.reminderTime,
              isActive: true,
            });
            actionsTaken.push(`Created habit: "${toolCall.arguments.title}"`);
            break;
        }
      } catch (err) {
        console.error(`Failed to execute tool ${toolCall.name}:`, err);
      }
    }

    let updatedCategories: string[] = [];

    const extractedData = extractCategoryData(message, response, context);

    for (const item of extractedData) {
      try {
        await storage.createCategoryEntry({
          userId,
          category: item.category,
          title: item.title,
          content: item.content,
          date: item.date,
          metadata: item.metadata,
        });
        if (!updatedCategories.includes(item.category)) {
          updatedCategories.push(item.category);
        }
      } catch (err) {
        console.error("Failed to create category entry:", err);
      }
    }

    const syncableItems = extractSyncableItems(message, response);
    let syncSessionId: string | undefined;

    if (syncableItems.length > 0) {
      try {
        let session = await storage.getActiveSyncSession(userId);

        if (!session) {
          session = await storage.createSyncSession({
            userId,
            status: "processing",
            totalItems: syncableItems.length,
            sourceType: "chat",
          });
        }
        syncSessionId = session.id;

        const syncItems = syncableItems.map(item => ({
          sessionId: session!.id,
          itemType: item.itemType,
          title: item.title,
          description: item.description,
          startTime: item.startTime ? item.startTime.toISOString() : undefined,
          endTime: item.endTime ? item.endTime.toISOString() : undefined,
          recurrencePattern: item.recurrencePattern,
          recurrenceGroupKey: item.recurrenceGroupKey,
          dimensionTags: item.dimensionTags,
          rawExtraction: item.rawExtraction,
          status: "pending" as const,
        }));

        await storage.createSyncItems(syncItems as any);

        const currentItems = await storage.getSyncItems(session.id);
        await storage.updateSyncSession(session.id, {
          status: "awaiting_review",
          totalItems: currentItems.length,
          processedItems: currentItems.length,
        });
      } catch (err) {
        console.error("Failed to create sync items:", err);
      }
    }

    const personSuggestion = req.session.userId ? await buildPersonSuggestion(req.session.userId, message) : null;
    const personMention = personSuggestion ? { personId: personSuggestion.personId, name: personSuggestion.name } : null;
    const mergedSuggestion = triggerSuggestion
      ? (personMention ? { ...triggerSuggestion, person: personMention } : triggerSuggestion)
      : (personMention ? { type: "person" as const, person: personMention } : null);
    return res.json({
      response: enforceOneQuestion(response),
      updatedCategories,
      syncSessionId,
      actionsTaken,
      ...(mergedSuggestion ? { suggestion: mergedSuggestion } : {}),
      ...(personSuggestion ? { personSuggestion } : {}),
      dwMode: dwModeResult.dwMode,
    });
  } catch (error: any) {
    const errMsg: string = error?.message || String(error);
    // Graceful degradation: show a human-readable message instead of crashing.
    // Even on this fallback we still attach the trigger suggestion if the
    // user's message asked for emotional regulation — they shouldn't lose
    // the reset offer just because the LLM is down.
    if (errMsg.includes("DW_AI_UNAVAILABLE")) {
      return res.json({
        response: "I'm here — just had a brief moment of interrupted thinking. Send that again and I'll pick right up.",
        updatedCategories: [],
        actionsTaken: [],
        ...(triggerSuggestion ? { suggestion: triggerSuggestion } : {}),
      });
    }
    const errStatus: number = typeof error?.status === "number" ? error.status : 500;
    console.error("Chat error:", errStatus, errMsg);
    return res.status(errStatus >= 400 && errStatus < 600 ? errStatus : 500).json({
      error: errMsg,
      status: errStatus,
    });
  }
}

/** POST /api/chat/smart — intent-aware DW chat with tool execution. */
export async function smartChatHandler(req: Request, res: Response) {
  // Pure-function detector — must survive every fallback path below so a
  // user who types "i think she's cheating" still gets the trigger reset
  // offer even if the LLM is unavailable. See chatHandler for the same
  // pattern.
  const triggerSuggestion = detectTriggerSuggestion(req.body?.message);

  try {
    const { message, conversationHistory, context, userProfile: clientProfile, lifeSystemContext, energyContext, documentIds, cosmicConsent, modeLock, previousMode } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }
    if (message.length > DW_MAX_MESSAGE_CONTENT_LENGTH) {
      return res.status(400).json({ error: `Message is too long (max ${DW_MAX_MESSAGE_CONTENT_LENGTH} characters)` });
    }

    const aiConfig = getAiConfigStatus();
    if (!aiConfig.configured) {
      return res.json({
        response: "I'm having a small moment on my end — nothing to worry about. Take a breath, and whenever you're ready, share what's on your mind. I'm not going anywhere.",
        actionsTaken: [],
        ...(triggerSuggestion ? { suggestion: triggerSuggestion } : {}),
      });
    }

    const userId = req.session.userId!;

    let documentContext = "";
    if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
      const docs = await Promise.all(
        documentIds.map((id: string) => storage.getImportedDocument(id))
      );
      const validDocs = docs.filter(d => d && d.userId === userId);
      if (validDocs.length > 0) {
        documentContext = "\n\n[ATTACHED DOCUMENTS]\n" + validDocs.map(d =>
          `--- ${d!.fileName} ---\n${d!.rawText?.slice(0, 3000) || "(no content)"}\n---`
        ).join("\n");
      }
    }

    const enhancedMessage = documentContext
      ? `${message}\n${documentContext}`
      : message;

    const snapshot = await getUserContextSnapshot(userId);
    const userContext = {
      ...toUserLifeContext(snapshot, {
        category: context,
        energyContext: energyContext || undefined,
        lifeSystem: lifeSystemContext || undefined,
      }),
      profile: clientProfile || null,
      cosmicConsent: cosmicConsent && typeof cosmicConsent === "object"
        ? {
            useAstrologyInGuidance: Boolean(cosmicConsent.useAstrologyInGuidance),
            useNumerologyInGuidance: Boolean(cosmicConsent.useNumerologyInGuidance),
          }
        : snapshot.spirit.cosmicConsent,
    };

    // Strip any non-standard roles (e.g. 'insight') that OpenAI rejects
    const safeHistory = (conversationHistory || []).filter(
      (m: any) => m && typeof m.content === "string" && ["user", "assistant"].includes(m.role)
    );

    // Adaptive role: pick the right DW lane unless the client locked one.
    const dwModeResult = await resolveAdaptiveDWMode({
      message,
      snapshot,
      modeLock,
      previousMode,
    });

    logDwRolePick({
      userId,
      surface: "smart",
      message,
      ...dwModeResult.logFields,
    });
    const ctxOverride =
      typeof context === "string" && Object.prototype.hasOwnProperty.call(CONTEXT_SYSTEM_OVERRIDES, context)
        ? CONTEXT_SYSTEM_OVERRIDES[context]
        : undefined;
    const composedOverride = [dwModeResult.modeAddendum, ctxOverride]
      .filter(Boolean)
      .join("\n\n");

    const wearablesYesterdayForChat = await safeGetWearablesYesterday(req.session.userId!);
    const result = await detectIntentAndRespond(
      enhancedMessage,
      safeHistory,
      userContext,
      composedOverride || undefined,
      wearablesYesterdayForChat,
    );

    // Execute tool calls if any
    const actionsTaken: string[] = [];
    let navigationAction: { path: string; reason: string } | null = null;
    if (result.toolCalls && result.toolCalls.length > 0) {
      for (const toolCall of result.toolCalls) {
        try {
          // Parse arguments if they're a string (defensive)
          const args = typeof toolCall.arguments === "string"
            ? JSON.parse(toolCall.arguments)
            : toolCall.arguments;

          if (!args || typeof args !== "object") {
            console.error(`Invalid tool arguments for ${toolCall.name}:`, toolCall.arguments);
            continue;
          }

          switch (toolCall.name) {
            case "create_schedule_block":
              if (args.title && args.startTime && args.endTime) {
                await storage.createScheduleBlock({
                  userId,
                  title: args.title,
                  startTime: args.startTime,
                  endTime: args.endTime,
                  dayOfWeek: args.dayOfWeek ?? new Date().getDay(),
                  category: args.category || "personal",
                });
                actionsTaken.push(`Added "${args.title}" to your schedule`);
              }
              break;
            case "log_mood":
              if (args.energyLevel && args.moodLevel) {
                await storage.createMoodLog({
                  userId,
                  energyLevel: args.energyLevel,
                  moodLevel: args.moodLevel,
                  clarityLevel: args.clarityLevel,
                  notes: args.notes,
                });
                actionsTaken.push(`Logged your mood (energy: ${args.energyLevel}/5, mood: ${args.moodLevel}/5)`);
              }
              break;
            case "create_goal":
              if (args.title) {
                await storage.createGoal({
                  userId,
                  title: args.title,
                  description: args.description,
                  wellnessDimension: args.wellnessDimension,
                  isActive: true,
                });
                actionsTaken.push(`Created goal: "${args.title}"`);
              }
              break;
            case "create_habit":
              if (args.title) {
                await storage.createHabit({
                  userId,
                  title: args.title,
                  description: args.description,
                  frequency: args.frequency || "daily",
                  reminderTime: args.reminderTime,
                  isActive: true,
                });
                actionsTaken.push(`Created habit: "${args.title}"`);
              }
              break;
            case "create_workout_plan":
              actionsTaken.push(`Generated workout plan based on your preferences`);
              break;
            case "navigate_to":
              if (args.path) {
                navigationAction = { path: args.path, reason: args.reason || "" };
                actionsTaken.push(`Opening ${args.path}${args.reason ? ": " + args.reason : ""}`);
              }
              break;
            case "create_journal_entry":
              if (args.content) {
                const entryTitle = args.content.slice(0, 60) + (args.content.length > 60 ? "…" : "");
                await storage.createDwJournalEntry({
                  userId,
                  title: entryTitle,
                  story: args.content,
                  tags: args.tags || [],
                });
                actionsTaken.push(`Saved journal entry`);
              }
              break;
            case "log_habit_completion":
              if (args.habitId && args.habitTitle) {
                const existingLog = await storage.getTodaysHabitLog(args.habitId);
                if (!existingLog) {
                  await storage.createHabitLog({
                    habitId: args.habitId,
                    userId,
                    notes: args.notes,
                  });
                }
                actionsTaken.push(`Marked "${args.habitTitle}" as complete for today`);
              }
              break;
            case "create_reminder":
              if (args.title && args.reminderTime) {
                await storage.createReminder({
                  userId,
                  type: "custom",
                  title: args.title,
                  body: args.notes,
                  scheduledAt: new Date(args.reminderTime),
                  status: "scheduled",
                });
                actionsTaken.push(`Set reminder: "${args.title}"`);
              }
              break;
            case "create_routine":
              if (args.name) {
                await storage.createRoutine({
                  userId,
                  name: args.name,
                  mode: args.mode || "custom",
                  isActive: true,
                });
                actionsTaken.push(`Created routine: "${args.name}"`);
              }
              break;
            case "update_goal_progress":
              if (args.goalId && typeof args.progress === "number") {
                await storage.updateGoal(args.goalId, {
                  progress: args.progress,
                });
                actionsTaken.push(`Updated progress on "${args.goalTitle}" to ${args.progress}%`);
              }
              break;
          }
        } catch (err) {
          console.error(`Failed to execute tool ${toolCall.name}:`, err);
        }
      }
    }

    const syncableItems = extractSyncableItems(message, result.response || "");
    let syncSessionId: string | undefined;

    if (syncableItems.length > 0) {
      try {
        let session = await storage.getActiveSyncSession(userId);

        if (!session) {
          session = await storage.createSyncSession({
            userId,
            status: "processing",
            totalItems: syncableItems.length,
            sourceType: "chat",
          });
        }
        syncSessionId = session.id;

        const syncItems = syncableItems.map(item => ({
          sessionId: session!.id,
          itemType: item.itemType,
          title: item.title,
          description: item.description,
          startTime: item.startTime ? item.startTime.toISOString() : undefined,
          endTime: item.endTime ? item.endTime.toISOString() : undefined,
          recurrencePattern: item.recurrencePattern,
          recurrenceGroupKey: item.recurrenceGroupKey,
          dimensionTags: item.dimensionTags,
          rawExtraction: item.rawExtraction,
          status: "pending" as const,
        }));

        await storage.createSyncItems(syncItems as any);

        const currentItems = await storage.getSyncItems(session.id);
        await storage.updateSyncSession(session.id, {
          status: "awaiting_review",
          totalItems: currentItems.length,
          processedItems: currentItems.length,
        });
      } catch (err) {
        console.error("Failed to create sync items:", err);
      }
    }

    const safeResult = { ...result, response: enforceOneQuestion(result.response) };
    // Use the hoisted triggerSuggestion (computed before the try block) so
    // there's a single source of truth across success and fallback paths.
    const personSuggestion = req.session.userId ? await buildPersonSuggestion(req.session.userId, message) : null;
    const personMention = personSuggestion ? { personId: personSuggestion.personId, name: personSuggestion.name } : null;
    const mergedSuggestion = triggerSuggestion
      ? (personMention ? { ...triggerSuggestion, person: personMention } : triggerSuggestion)
      : (personMention ? { type: "person" as const, person: personMention } : null);
    return res.json({
      ...safeResult,
      syncSessionId,
      actionsTaken,
      navigation: navigationAction,
      ...(mergedSuggestion ? { suggestion: mergedSuggestion } : {}),
      ...(personSuggestion ? { personSuggestion } : {}),
      dwMode: dwModeResult.dwMode,
    });
  } catch (error: any) {
    const errMsg: string = error?.message || String(error);
    // Graceful degradation: AI provider temporarily down → return a friendly
    // response. Even on this fallback we attach the trigger suggestion if
    // the user's message asked for emotional regulation — they shouldn't
    // lose the reset offer just because the LLM is overloaded.
    if (errMsg.includes("DW_AI_UNAVAILABLE") || errMsg.includes("529") || errMsg.includes("overloaded") || errMsg.includes("rate limit") || errMsg.includes("503")) {
      console.warn("Smart chat: AI temporarily unavailable, returning graceful fallback");
      return res.json({
        response: "I'm here — just had a brief moment of interrupted thinking. Send that again and I'll pick right up.",
        intent: "general",
        actionsTaken: [],
        navigation: null,
        ...(triggerSuggestion ? { suggestion: triggerSuggestion } : {}),
      });
    }
    const errStatus: number = typeof error?.status === "number" ? error.status : 500;
    console.error("Smart chat error:", errStatus, errMsg);
    return res.status(errStatus >= 400 && errStatus < 600 ? errStatus : 500).json({
      error: errMsg,
      status: errStatus,
    });
  }
}
