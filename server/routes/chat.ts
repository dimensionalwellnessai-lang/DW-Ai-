import type { Express } from "express";

import { storage } from "../storage";

import { extractSyncableItems, extractCategoryData, CONTEXT_SYSTEM_OVERRIDES, DW_MAX_MESSAGE_CONTENT_LENGTH } from "./_shared";
import { chatLimiter } from "./_limiters";

import { generateChatResponse, detectIntentAndRespond, detectIntentAndRespondStreaming, getAiConfigStatus, enforceOneQuestion } from "../openai";

import { type CoachingMode, coachingModeEnum } from "@shared/schema";

export function registerChatRoutes(app: Express): void {
  app.post("/api/chat", chatLimiter, async (req, res) => {
    try {
      const { message, conversationHistory, context } = req.body;

      // Validate message content
      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({ error: "Message is required" });
      }
      if (message.length > DW_MAX_MESSAGE_CONTENT_LENGTH) {
        return res.status(400).json({ error: `Message is too long (max ${DW_MAX_MESSAGE_CONTENT_LENGTH} characters)` });
      }

      let userId = req.session.userId;
      
      if (!userId) {
        let devUser = await storage.getUserByEmail("dev@wellness.local");
        if (!devUser) {
          devUser = await storage.createUser({
            email: "dev@wellness.local",
            password: "devpassword123",
          });
        }
        userId = devUser.id;
        req.session.userId = userId;
      }
      
      const [user, goals, habits, recentEntries, moodLogs, scheduleBlocks, routines, calendarEvents, lifeSystem, userProfile, systemPrefs, wellnessPrefs] = await Promise.all([
        storage.getUser(userId),
        storage.getGoals(userId),
        storage.getHabits(userId),
        storage.getCategoryEntries(userId),
        storage.getMoodLogs(userId),
        storage.getScheduleBlocks(userId),
        storage.getRoutines(userId),
        storage.getCalendarEvents(userId),
        storage.getLifeSystem(userId),
        storage.getUserProfile(userId),
        storage.getUserSystemPreferences(userId),
        storage.getWellnessPreferences(userId),
      ]);
      
      const today = new Date();
      const dayOfWeek = today.getDay();
      const todayStr = today.toISOString().split('T')[0];
      
      const userContext = {
        category: context,
        systemName: user?.systemName || undefined,
        activeGoals: goals.filter(g => g.isActive).map(g => ({ 
          title: g.title, 
          progress: g.progress || 0,
          wellnessDimension: g.wellnessDimension || undefined
        })),
        habits: habits.filter(h => h.isActive).map(h => ({ 
          title: h.title, 
          streak: h.streak || 0,
          frequency: h.frequency || 'daily'
        })),
        upcomingEvents: recentEntries
          .filter(e => e.category === 'calendar' && e.date)
          .slice(0, 5)
          .map(e => ({ title: e.title, date: e.date! })),
        recentMoods: moodLogs.slice(0, 5).map(m => ({
          energy: m.energyLevel,
          mood: m.moodLevel,
          clarity: m.clarityLevel || undefined,
          date: m.createdAt?.toISOString().split('T')[0] || ''
        })),
        categoryEntries: recentEntries.slice(0, 10).map(e => ({
          category: e.category,
          title: e.title,
          content: e.content || '',
          date: e.date || undefined
        })),
        todaySchedule: scheduleBlocks
          .filter(b => b.dayOfWeek === dayOfWeek)
          .map(b => ({
            title: b.title,
            startTime: b.startTime,
            endTime: b.endTime,
            category: b.category || undefined
          })),
        routines: routines.map(r => ({
          title: r.name,
          type: r.mode || 'routine',
          isActive: r.isActive ?? true
        })),
        todayCalendarEvents: calendarEvents
          .filter(e => e.startTime?.startsWith(todayStr))
          .map(e => ({
            title: e.title,
            time: e.startTime?.split('T')[1]?.substring(0, 5) || undefined,
            allDay: false
          })),
        lifeSystem: {
          preferences: {
            enabledSystems: systemPrefs?.enabledSystems || [],
            preferredWakeTime: systemPrefs?.preferredWakeTime || undefined,
            preferredSleepTime: systemPrefs?.preferredSleepTime || undefined,
          },
          scheduleEvents: scheduleBlocks
            .filter(b => b.dayOfWeek === dayOfWeek)
            .map(b => ({
              title: b.title,
              scheduledTime: b.startTime,
              systemReference: b.category || undefined
            })),
        },
        wellnessFocus: userProfile?.goals || [],
        peakMotivationTime: systemPrefs?.preferredWakeTime || undefined,
        coachMode: (coachingModeEnum as readonly string[]).includes(user?.coachingMode ?? "")
          ? (user!.coachingMode as CoachingMode)
          : "gentle",
        wellnessPreferences: wellnessPrefs ? {
          beliefSystem: wellnessPrefs.beliefSystem,
          traditions: wellnessPrefs.traditions,
          otherTradition: wellnessPrefs.otherTradition,
          meditationEnabled: wellnessPrefs.meditationEnabled,
          journalEnabled: wellnessPrefs.journalEnabled,
          astrologyEnabled: wellnessPrefs.astrologyEnabled,
          tarotEnabled: wellnessPrefs.tarotEnabled,
          energyWorkEnabled: wellnessPrefs.energyWorkEnabled,
        } : undefined,
      };
      
      const rawResponse = await generateChatResponse(
        message,
        conversationHistory || [],
        userContext
      );
      
      const response = typeof rawResponse === 'string' ? rawResponse : rawResponse.content;
      const toolCalls = typeof rawResponse === 'object' && 'toolCalls' in rawResponse ? rawResponse.toolCalls : [];
      
      const actionsTaken: string[] = [];
      for (const toolCall of toolCalls) {
        try {
          switch (toolCall.name) {
            case 'create_schedule_block':
              await storage.createScheduleBlock({
                userId,
                title: toolCall.arguments.title,
                startTime: toolCall.arguments.startTime,
                endTime: toolCall.arguments.endTime,
                dayOfWeek: toolCall.arguments.dayOfWeek,
                category: toolCall.arguments.category || 'personal',
              });
              actionsTaken.push(`Added "${toolCall.arguments.title}" to your schedule`);
              break;
            case 'log_mood':
              await storage.createMoodLog({
                userId,
                energyLevel: toolCall.arguments.energyLevel,
                moodLevel: toolCall.arguments.moodLevel,
                clarityLevel: toolCall.arguments.clarityLevel,
                notes: toolCall.arguments.notes,
              });
              actionsTaken.push(`Logged your mood (energy: ${toolCall.arguments.energyLevel}/5, mood: ${toolCall.arguments.moodLevel}/5)`);
              break;
            case 'create_goal':
              await storage.createGoal({
                userId,
                title: toolCall.arguments.title,
                description: toolCall.arguments.description,
                wellnessDimension: toolCall.arguments.wellnessDimension,
                isActive: true,
              });
              actionsTaken.push(`Created goal: "${toolCall.arguments.title}"`);
              break;
            case 'create_habit':
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
      
      if (extractedData.length > 0) {
        try {
          await storage.createCategoryEntries(
            extractedData.map((item) => ({
              userId,
              category: item.category,
              title: item.title,
              content: item.content,
              date: item.date,
              metadata: item.metadata,
            }))
          );
          for (const item of extractedData) {
            if (!updatedCategories.includes(item.category)) {
              updatedCategories.push(item.category);
            }
          }
        } catch (err) {
          console.error("Failed to create category entries:", err);
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
      
      res.json({ response: enforceOneQuestion(response), updatedCategories, syncSessionId, actionsTaken });
    } catch (error: any) {
      const errMsg: string = error?.message || String(error);
      // Graceful degradation: show a human-readable message instead of crashing
      if (errMsg.includes("DW_AI_UNAVAILABLE")) {
        return res.json({
          response: "I'm here — just had a brief moment of interrupted thinking. Send that again and I'll pick right up.",
          updatedCategories: [],
          actionsTaken: [],
        });
      }
      const errStatus: number = typeof error?.status === "number" ? error.status : 500;
      console.error("Chat error:", errStatus, errMsg);
      res.status(errStatus >= 400 && errStatus < 600 ? errStatus : 500).json({
        error: errMsg,
        status: errStatus,
      });
    }
  });

  app.post("/api/chat/smart", chatLimiter, async (req, res) => {
    try {
      const { message, conversationHistory, context, userProfile: clientProfile, lifeSystemContext, energyContext, documentIds, cosmicConsent } = req.body;

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
        });
      }

      let userId = req.session.userId;
      
      if (!userId) {
        let devUser = await storage.getUserByEmail("dev@wellness.local");
        if (!devUser) {
          devUser = await storage.createUser({
            email: "dev@wellness.local",
            password: "devpassword123",
          });
        }
        userId = devUser.id;
        req.session.userId = userId;
      }
      
      const [user, goals, habits, profile, wellnessPrefs, todayHabitLogs, moodLogs, scheduleBlocks, calendarEvents, recentJournal, pendingReminders, routines] = await Promise.all([
        storage.getUser(userId),
        storage.getGoals(userId),
        storage.getHabits(userId),
        storage.getUserProfile(userId),
        storage.getWellnessPreferences(userId),
        storage.getTodayHabitLogsByUser(userId),
        storage.getMoodLogs(userId),
        storage.getScheduleBlocks(userId),
        storage.getCalendarEvents(userId),
        storage.getDwJournalEntries(userId, 3),
        storage.getReminders(userId, 'scheduled'),
        storage.getRoutines(userId),
      ]);
      
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const dayOfWeek = today.getDay();

      // Compute which active habits are done today
      const completedHabitIds = new Set(todayHabitLogs.map((l: any) => l.habitId));
      const activeHabits = habits.filter((h: any) => h.isActive);

      // Today's schedule blocks (matching today's day of week)
      const todayScheduleBlocks = scheduleBlocks.filter((b: any) => b.dayOfWeek === dayOfWeek);

      // Today's calendar events
      const todayCalEvents = calendarEvents.filter((e: any) => {
        if (!e.startTime) return false;
        const evDate = new Date(e.startTime).toISOString().split('T')[0];
        return evDate === todayStr;
      });

      // Most recent mood log
      const latestMood = moodLogs.length > 0 ? moodLogs[0] : null;
      
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
      
      const userContext = {
        category: context,
        systemName: user?.systemName || undefined,
        activeGoals: goals.filter((g: any) => g.isActive).map((g: any) => ({ 
          id: g.id,
          title: g.title, 
          progress: g.progress || 0 
        })),
        habits: activeHabits.map((h: any) => ({ 
          id: h.id,
          title: h.title, 
          streak: h.streak || 0,
          frequency: h.frequency,
          completedToday: completedHabitIds.has(h.id),
        })),
        todaySchedule: todayScheduleBlocks.map((b: any) => ({
          title: b.title,
          startTime: b.startTime,
          endTime: b.endTime,
          category: b.category,
        })),
        todayCalendarEvents: todayCalEvents.map((e: any) => ({
          title: e.title,
          startTime: e.startTime,
          description: e.description,
        })),
        currentMood: latestMood ? {
          energyLevel: latestMood.energyLevel,
          moodLevel: latestMood.moodLevel,
          clarityLevel: latestMood.clarityLevel,
          loggedAt: latestMood.createdAt,
        } : null,
        recentJournalEntries: recentJournal.map((j: any) => ({
          content: j.content?.slice(0, 200),
          mood: j.mood,
          createdAt: j.createdAt,
        })),
        pendingReminders: pendingReminders.slice(0, 5).map((r: any) => ({
          title: r.title,
          reminderTime: r.reminderTime,
        })),
        activeRoutines: routines.map((r: any) => ({
          id: r.id,
          name: r.name,
          mode: r.mode,
        })),
        profile: profile || clientProfile || null,
        lifeSystem: lifeSystemContext || null,
        energyContext: energyContext || null,
        cosmicConsent: cosmicConsent && typeof cosmicConsent === "object"
          ? {
              useAstrologyInGuidance: Boolean(cosmicConsent.useAstrologyInGuidance),
              useNumerologyInGuidance: Boolean(cosmicConsent.useNumerologyInGuidance),
            }
          : undefined,
        coachMode: (coachingModeEnum as readonly string[]).includes(user?.coachingMode ?? "")
          ? (user!.coachingMode as CoachingMode)
          : "gentle",
        wellnessPreferences: wellnessPrefs ? {
          beliefSystem: wellnessPrefs.beliefSystem,
          traditions: wellnessPrefs.traditions,
          otherTradition: wellnessPrefs.otherTradition,
          meditationEnabled: wellnessPrefs.meditationEnabled,
          journalEnabled: wellnessPrefs.journalEnabled,
          astrologyEnabled: wellnessPrefs.astrologyEnabled,
          tarotEnabled: wellnessPrefs.tarotEnabled,
          energyWorkEnabled: wellnessPrefs.energyWorkEnabled,
        } : undefined,
      };
      
      // Strip any non-standard roles (e.g. 'insight') that OpenAI rejects
      const safeHistory = (conversationHistory || []).filter(
        (m: any) => m && typeof m.content === "string" && ["user", "assistant"].includes(m.role)
      );

      const result = await detectIntentAndRespond(
        enhancedMessage,
        safeHistory,
        userContext,
        typeof context === "string" && Object.prototype.hasOwnProperty.call(CONTEXT_SYSTEM_OVERRIDES, context)
          ? CONTEXT_SYSTEM_OVERRIDES[context]
          : undefined
      );
      
      // Execute tool calls if any
      const actionsTaken: string[] = [];
      let navigationAction: { path: string; reason: string } | null = null;
      if (result.toolCalls && result.toolCalls.length > 0) {
        for (const toolCall of result.toolCalls) {
          try {
            // Parse arguments if they're a string (defensive)
            const args = typeof toolCall.arguments === 'string' 
              ? JSON.parse(toolCall.arguments) 
              : toolCall.arguments;
            
            if (!args || typeof args !== 'object') {
              console.error(`Invalid tool arguments for ${toolCall.name}:`, toolCall.arguments);
              continue;
            }
            
            switch (toolCall.name) {
              case 'create_schedule_block':
                if (args.title && args.startTime && args.endTime) {
                  await storage.createScheduleBlock({
                    userId,
                    title: args.title,
                    startTime: args.startTime,
                    endTime: args.endTime,
                    dayOfWeek: args.dayOfWeek ?? new Date().getDay(),
                    category: args.category || 'personal',
                  });
                  actionsTaken.push(`Added "${args.title}" to your schedule`);
                }
                break;
              case 'log_mood':
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
              case 'create_goal':
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
              case 'create_habit':
                if (args.title) {
                  await storage.createHabit({
                    userId,
                    title: args.title,
                    description: args.description,
                    frequency: args.frequency || 'daily',
                    reminderTime: args.reminderTime,
                    isActive: true,
                  });
                  actionsTaken.push(`Created habit: "${args.title}"`);
                }
                break;
              case 'create_workout_plan':
                actionsTaken.push(`Generated workout plan based on your preferences`);
                break;
              case 'navigate_to':
                if (args.path) {
                  navigationAction = { path: args.path, reason: args.reason || '' };
                  actionsTaken.push(`Opening ${args.path}${args.reason ? ': ' + args.reason : ''}`);
                }
                break;
              case 'create_journal_entry':
                if (args.content) {
                  const entryTitle = args.content.slice(0, 60) + (args.content.length > 60 ? '…' : '');
                  await storage.createDwJournalEntry({
                    userId,
                    title: entryTitle,
                    story: args.content,
                    tags: args.tags || [],
                  });
                  actionsTaken.push(`Saved journal entry`);
                }
                break;
              case 'log_habit_completion':
                if (args.habitId && args.habitTitle) {
                  const existingLog = await storage.getTodaysHabitLog(args.habitId);
                  if (!existingLog) {
                    await storage.createHabitLog({
                      habitId: args.habitId,
                      notes: args.notes,
                    });
                  }
                  actionsTaken.push(`Marked "${args.habitTitle}" as complete for today`);
                }
                break;
              case 'create_reminder':
                if (args.title && args.reminderTime) {
                  await storage.createReminder({
                    userId,
                    type: 'custom',
                    title: args.title,
                    body: args.notes,
                    scheduledAt: new Date(args.reminderTime),
                    status: 'scheduled',
                  });
                  actionsTaken.push(`Set reminder: "${args.title}"`);
                }
                break;
              case 'create_routine':
                if (args.name) {
                  await storage.createRoutine({
                    userId,
                    name: args.name,
                    mode: args.mode || 'custom',
                    isActive: true,
                  });
                  actionsTaken.push(`Created routine: "${args.name}"`);
                }
                break;
              case 'update_goal_progress':
                if (args.goalId && typeof args.progress === 'number') {
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
      res.json({ ...safeResult, syncSessionId, actionsTaken, navigation: navigationAction });
    } catch (error: any) {
      const errMsg: string = error?.message || String(error);
      // Graceful degradation: AI provider temporarily down → return a friendly response
      if (errMsg.includes("DW_AI_UNAVAILABLE") || errMsg.includes("529") || errMsg.includes("overloaded") || errMsg.includes("rate limit") || errMsg.includes("503")) {
        console.warn("Smart chat: AI temporarily unavailable, returning graceful fallback");
        return res.json({
          response: "I'm here — just had a brief moment of interrupted thinking. Send that again and I'll pick right up.",
          intent: "general",
          actionsTaken: [],
          navigation: null,
        });
      }
      const errStatus: number = typeof error?.status === "number" ? error.status : 500;
      console.error("Smart chat error:", errStatus, errMsg);
      return res.status(errStatus >= 400 && errStatus < 600 ? errStatus : 500).json({
        error: errMsg,
        status: errStatus,
      });
    }
  });

  // ── DW Command endpoint ──────────────────────────────────────────────────────
  // Processes a short command/question from the floating widget.
  // Returns a text response plus an optional navigation action.
  app.post("/api/chat/command", chatLimiter, async (req, res) => {
    try {
      const { message } = req.body as { message?: string };
      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ error: "message is required" });
      }

      if (message.length > DW_MAX_MESSAGE_CONTENT_LENGTH) {
        return res.status(400).json({ error: `Message is too long (max ${DW_MAX_MESSAGE_CONTENT_LENGTH} characters)` });
      }

      // Detect Cosmic navigation intent before calling the full AI
      type CosmicTab = "calendar" | "insights" | "astrology" | "numerology";
      const lower = message.toLowerCase();
      let cosmicTab: CosmicTab | null = null;
      if (/\b(calendar|schedule|event)\b/.test(lower) && /\bcosmic\b/.test(lower)) cosmicTab = "calendar";
      else if (/\bastrology\b|\bchart\b|\bplanet\b|\bhoroscope\b|\bzodiac\b/.test(lower)) cosmicTab = "astrology";
      else if (/\bnumerology\b|\blife path\b/.test(lower)) cosmicTab = "numerology";
      else if (/\bcosmic\b/.test(lower)) cosmicTab = "insights";

      const action: { type: "navigate"; path: string; tab?: string } | null = cosmicTab
        ? { type: "navigate", path: `/cosmic?tab=${cosmicTab}`, tab: cosmicTab }
        : null;

      // Generate a brief AI response
      const rawAI = await generateChatResponse(
        message,
        [],
        undefined
      );
      const response = typeof rawAI === "string" ? rawAI : rawAI.content;

      res.json({ response, action });
    } catch (error) {
      console.error("Command chat error:", error);
      res.status(500).json({ error: "Failed to process command" });
    }
  });

  // Streaming chat endpoint for improved performance
  app.post("/api/chat/stream", chatLimiter, async (req, res) => {
    try {
      const { message, conversationHistory, context, userProfile: clientProfile, lifeSystemContext, energyContext, documentIds, cosmicConsent } = req.body;

      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({ error: "Message is required" });
      }
      if (message.length > DW_MAX_MESSAGE_CONTENT_LENGTH) {
        return res.status(400).json({ error: `Message is too long (max ${DW_MAX_MESSAGE_CONTENT_LENGTH} characters)` });
      }

      let userId = req.session.userId;
      
      if (!userId) {
        let devUser = await storage.getUserByEmail("dev@wellness.local");
        if (!devUser) {
          devUser = await storage.createUser({
            email: "dev@wellness.local",
            password: "devpassword123",
          });
        }
        userId = devUser.id;
        req.session.userId = userId;
      }
      
      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Fetch enriched user context (same as smart endpoint)
      const [user, goals, habits, profile, wellnessPrefs, todayHabitLogsS, moodLogsS, scheduleBlocksS, calendarEventsS, recentJournalS, pendingRemindersS, routinesS] = await Promise.all([
        storage.getUser(userId),
        storage.getGoals(userId),
        storage.getHabits(userId),
        storage.getUserProfile(userId),
        storage.getWellnessPreferences(userId),
        storage.getTodayHabitLogsByUser(userId),
        storage.getMoodLogs(userId),
        storage.getScheduleBlocks(userId),
        storage.getCalendarEvents(userId),
        storage.getDwJournalEntries(userId, 3),
        storage.getReminders(userId, 'scheduled'),
        storage.getRoutines(userId),
      ]);

      const todayS = new Date();
      const todayStrS = todayS.toISOString().split('T')[0];
      const dayOfWeekS = todayS.getDay();
      const completedHabitIdsS = new Set(todayHabitLogsS.map((l: any) => l.habitId));
      const activeHabitsS = habits.filter((h: any) => h.isActive);
      const todayScheduleBlocksS = scheduleBlocksS.filter((b: any) => b.dayOfWeek === dayOfWeekS);
      const todayCalEventsS = calendarEventsS.filter((e: any) => {
        if (!e.startTime) return false;
        return new Date(e.startTime).toISOString().split('T')[0] === todayStrS;
      });
      const latestMoodS = moodLogsS.length > 0 ? moodLogsS[0] : null;
      
      // Handle document attachments
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
      
      const userContext = {
        category: context,
        systemName: user?.systemName || undefined,
        activeGoals: goals.filter((g: any) => g.isActive).map((g: any) => ({ 
          id: g.id,
          title: g.title, 
          progress: g.progress || 0 
        })),
        habits: activeHabitsS.map((h: any) => ({ 
          id: h.id,
          title: h.title, 
          streak: h.streak || 0,
          frequency: h.frequency,
          completedToday: completedHabitIdsS.has(h.id),
        })),
        todaySchedule: todayScheduleBlocksS.map((b: any) => ({
          title: b.title, startTime: b.startTime, endTime: b.endTime, category: b.category,
        })),
        todayCalendarEvents: todayCalEventsS.map((e: any) => ({
          title: e.title, startTime: e.startTime, description: e.description,
        })),
        currentMood: latestMoodS ? {
          energyLevel: latestMoodS.energyLevel,
          moodLevel: latestMoodS.moodLevel,
          clarityLevel: latestMoodS.clarityLevel,
          loggedAt: latestMoodS.createdAt,
        } : null,
        recentJournalEntries: recentJournalS.map((j: any) => ({
          content: j.content?.slice(0, 200), mood: j.mood, createdAt: j.createdAt,
        })),
        pendingReminders: pendingRemindersS.slice(0, 5).map((r: any) => ({
          title: r.title, reminderTime: r.reminderTime,
        })),
        activeRoutines: routinesS.map((r: any) => ({
          id: r.id, name: r.name, mode: r.mode,
        })),
        profile: profile || clientProfile || null,
        lifeSystem: lifeSystemContext || null,
        energyContext: energyContext || null,
        coachMode: (coachingModeEnum as readonly string[]).includes(user?.coachingMode ?? "")
          ? (user!.coachingMode as CoachingMode)
          : "gentle",
        cosmicConsent: cosmicConsent && typeof cosmicConsent === "object"
          ? {
              useAstrologyInGuidance: Boolean(cosmicConsent.useAstrologyInGuidance),
              useNumerologyInGuidance: Boolean(cosmicConsent.useNumerologyInGuidance),
            }
          : undefined,
        wellnessPreferences: wellnessPrefs ? {
          beliefSystem: wellnessPrefs.beliefSystem,
          traditions: wellnessPrefs.traditions,
          otherTradition: wellnessPrefs.otherTradition,
          meditationEnabled: wellnessPrefs.meditationEnabled,
          journalEnabled: wellnessPrefs.journalEnabled,
          astrologyEnabled: wellnessPrefs.astrologyEnabled,
          tarotEnabled: wellnessPrefs.tarotEnabled,
          energyWorkEnabled: wellnessPrefs.energyWorkEnabled,
        } : undefined,
      };
      
      // Strip any non-standard roles (e.g. 'insight') that OpenAI rejects
      const safeStreamHistory = (conversationHistory || []).filter(
        (m: any) => m && typeof m.content === "string" && ["user", "assistant"].includes(m.role)
      );

      // Use detectIntentAndRespond to get the AI response with streaming support
      const result = await detectIntentAndRespondStreaming(
        enhancedMessage,
        safeStreamHistory,
        userContext,
        res
      );
      
      // Execute tool calls if any (same as smart endpoint)
      const actionsTaken: string[] = [];
      let navigationActionS: { path: string; reason: string } | null = null;
      if (result.toolCalls && result.toolCalls.length > 0) {
        for (const toolCall of result.toolCalls) {
          try {
            const args = typeof toolCall.arguments === 'string' 
              ? JSON.parse(toolCall.arguments) 
              : toolCall.arguments;
            
            if (!args || typeof args !== 'object') {
              console.error(`Invalid tool arguments for ${toolCall.name}:`, toolCall.arguments);
              continue;
            }
            
            switch (toolCall.name) {
              case 'create_schedule_block':
                if (args.title && args.startTime && args.endTime) {
                  await storage.createScheduleBlock({
                    userId,
                    title: args.title,
                    startTime: args.startTime,
                    endTime: args.endTime,
                    dayOfWeek: args.dayOfWeek ?? new Date().getDay(),
                    category: args.category || 'personal',
                  });
                  actionsTaken.push(`Added "${args.title}" to your schedule`);
                }
                break;
              case 'log_mood':
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
              case 'create_goal':
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
              case 'create_habit':
                if (args.title) {
                  await storage.createHabit({
                    userId,
                    title: args.title,
                    description: args.description,
                    frequency: args.frequency || 'daily',
                    reminderTime: args.reminderTime,
                    isActive: true,
                  });
                  actionsTaken.push(`Created habit: "${args.title}"`);
                }
                break;
              case 'create_workout_plan':
                actionsTaken.push(`Generated workout plan based on your preferences`);
                break;
              case 'navigate_to':
                if (args.path) {
                  navigationActionS = { path: args.path, reason: args.reason || '' };
                  actionsTaken.push(`Opening ${args.path}${args.reason ? ': ' + args.reason : ''}`);
                }
                break;
              case 'create_journal_entry':
                if (args.content) {
                  const sEntryTitle = args.content.slice(0, 60) + (args.content.length > 60 ? '…' : '');
                  await storage.createDwJournalEntry({
                    userId,
                    title: sEntryTitle,
                    story: args.content,
                    tags: args.tags || [],
                  });
                  actionsTaken.push(`Saved journal entry`);
                }
                break;
              case 'log_habit_completion':
                if (args.habitId && args.habitTitle) {
                  const existingLog = await storage.getTodaysHabitLog(args.habitId);
                  if (!existingLog) {
                    await storage.createHabitLog({
                      habitId: args.habitId,
                      notes: args.notes,
                    });
                  }
                  actionsTaken.push(`Marked "${args.habitTitle}" as complete for today`);
                }
                break;
              case 'create_reminder':
                if (args.title && args.reminderTime) {
                  await storage.createReminder({
                    userId,
                    type: 'custom',
                    title: args.title,
                    body: args.notes,
                    scheduledAt: new Date(args.reminderTime),
                    status: 'scheduled',
                  });
                  actionsTaken.push(`Set reminder: "${args.title}"`);
                }
                break;
              case 'create_routine':
                if (args.name) {
                  await storage.createRoutine({
                    userId,
                    name: args.name,
                    mode: args.mode || 'custom',
                    isActive: true,
                  });
                  actionsTaken.push(`Created routine: "${args.name}"`);
                }
                break;
              case 'update_goal_progress':
                if (args.goalId && typeof args.progress === 'number') {
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
      
      // Handle syncable items (same as smart endpoint)
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
      
      // Send actions taken and metadata at the end
      if (actionsTaken.length > 0 || syncSessionId || navigationActionS) {
        res.write(`data: ${JSON.stringify({ 
          metadata: { 
            actionsTaken, 
            syncSessionId,
            navigation: navigationActionS,
          } 
        })}\n\n`);
      }
      
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      const errMsg: string = error?.message || String(error);
      const errStatus: number = typeof error?.status === "number" ? error.status : 500;
      console.error("Streaming chat error:", errStatus, errMsg);
      res.write(`data: ${JSON.stringify({ error: errMsg, status: errStatus })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  });

}
