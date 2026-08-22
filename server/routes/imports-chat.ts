import type { Express, Request, Response } from "express";
import multer from "multer";
import { z } from "zod";

import { storage } from "../storage";
import { openai } from "../openai";
import { chatComplete } from "../ai-engine";
import { requireAuth, requirePaidOrQuota } from "./_shared";

import type {
  ImportedConversation,
  ImportedConversationMessage,
  ImportedConversationSource,
} from "@shared/schema";

// Allow up to 100MB ChatGPT export files (they include every conversation ever).
const exportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

// ── ChatGPT export parsing ────────────────────────────────────────────────────
type ChatGptMappingNode = {
  id: string;
  parent?: string | null;
  children?: string[];
  message?: {
    id?: string;
    author?: { role?: string; name?: string | null };
    create_time?: number | null;
    content?: {
      content_type?: string;
      parts?: Array<string | { text?: string; asset_pointer?: string } | null | undefined>;
    };
  } | null;
};

type ChatGptConversation = {
  title?: string;
  create_time?: number;
  update_time?: number;
  mapping: Record<string, ChatGptMappingNode>;
  current_node?: string;
};

function partsToText(parts: ChatGptMappingNode["message"] extends infer M ? (M extends { content?: infer C } ? C extends { parts?: infer P } ? P : never : never) : never): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => {
      if (typeof p === "string") return p;
      if (p && typeof p === "object") {
        if (typeof (p as { text?: string }).text === "string") return (p as { text: string }).text;
        if (typeof (p as { asset_pointer?: string }).asset_pointer === "string") {
          return "[attachment shared]";
        }
      }
      return "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function flattenConversation(convo: ChatGptConversation): ImportedConversationMessage[] {
  const messages: ImportedConversationMessage[] = [];
  // Walk the tree from root to current_node along the parent chain.
  const ordered: ChatGptMappingNode[] = [];
  let cursor: string | undefined = convo.current_node;
  const seen = new Set<string>();
  while (cursor && convo.mapping[cursor] && !seen.has(cursor)) {
    seen.add(cursor);
    ordered.unshift(convo.mapping[cursor]);
    cursor = convo.mapping[cursor].parent ?? undefined;
  }
  // Fallback: if no current_node, use mapping order.
  const nodes = ordered.length > 0 ? ordered : Object.values(convo.mapping);

  for (const node of nodes) {
    const m = node.message;
    if (!m || !m.content) continue;
    const role = m.author?.role;
    if (role !== "user" && role !== "assistant") continue;
    const text = partsToText(m.content.parts ?? []);
    if (!text) continue;
    messages.push({
      role,
      content: text,
      timestamp: m.create_time ? Math.round(m.create_time * 1000) : undefined,
    });
  }
  return messages;
}

function summarizeFallback(messages: ImportedConversationMessage[]): { summary: string; topics: string[]; suggestedActions: { title: string; description?: string }[] } {
  const userText = messages.filter((m) => m.role === "user").map((m) => m.content).join(" ").slice(0, 400);
  return {
    summary: userText
      ? `Imported conversation with ${messages.length} messages. Recent focus: ${userText.slice(0, 200)}…`
      : `Imported conversation with ${messages.length} messages.`,
    topics: [],
    suggestedActions: [],
  };
}

async function summarizeConversation(messages: ImportedConversationMessage[], originalTitle: string): Promise<{ summary: string; topics: string[]; suggestedActions: { title: string; description?: string }[] }> {
  if (messages.length === 0) return summarizeFallback(messages);

  // Trim to last ~12k chars to stay within token budget.
  const transcript = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n")
    .slice(-12000);

  try {
    const raw = await chatComplete(
      [
        {
          role: "system",
          content:
            "You read an imported chat thread and summarize where the user left off. Reply with strict JSON: { \"summary\": string (2-3 sentences), \"topics\": string[] (3-8 short tags), \"suggestedActions\": { \"title\": string, \"description\"?: string }[] (1-5 items) }. No prose outside JSON.",
        },
        {
          role: "user",
          content: `Title: ${originalTitle}\n\nTranscript:\n${transcript}`,
        },
      ],
      { task: "import_summary", jsonMode: true, temperature: 0.4 },
    );
    const parsed = JSON.parse(raw);
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : summarizeFallback(messages).summary,
      topics: Array.isArray(parsed.topics) ? parsed.topics.filter((t: unknown) => typeof t === "string").slice(0, 8) : [],
      suggestedActions: Array.isArray(parsed.suggestedActions)
        ? parsed.suggestedActions
            .filter((a: any) => a && typeof a.title === "string")
            .slice(0, 5)
            .map((a: any) => ({ title: a.title, description: typeof a.description === "string" ? a.description : undefined }))
        : [],
    };
  } catch (err) {
    console.warn("[imports-chat] summarize failed:", (err as Error).message);
    return summarizeFallback(messages);
  }
}

async function normalizeRawPaste(text: string, providedTitle?: string): Promise<{ title: string; messages: ImportedConversationMessage[] }> {
  const trimmed = text.slice(0, 60000);
  try {
    const raw = await chatComplete(
      [
        {
          role: "system",
          content:
            "Convert the pasted text into a normalized chat transcript. Detect speakers (user vs assistant) when possible; otherwise mark unknown. Reply ONLY with strict JSON: { \"title\": string (concise topic), \"messages\": { \"role\": \"user\"|\"assistant\"|\"unknown\", \"content\": string }[] }.",
        },
        { role: "user", content: trimmed },
      ],
      { task: "import_normalize", jsonMode: true, temperature: 0.2 },
    );
    const parsed = JSON.parse(raw);
    const messages: ImportedConversationMessage[] = Array.isArray(parsed.messages)
      ? parsed.messages
          .filter((m: any) => m && typeof m.content === "string" && m.content.trim().length > 0)
          .map((m: any) => ({
            role: m.role === "user" || m.role === "assistant" ? m.role : "unknown",
            content: m.content,
          }))
      : [];
    const title = providedTitle?.trim() || (typeof parsed.title === "string" && parsed.title.trim()) || "Pasted conversation";
    if (messages.length === 0) {
      // Fallback: treat the whole thing as one unknown message.
      messages.push({ role: "unknown", content: trimmed });
    }
    return { title, messages };
  } catch (err) {
    console.warn("[imports-chat] raw paste normalize failed:", (err as Error).message);
    return {
      title: providedTitle?.trim() || "Pasted conversation",
      messages: [{ role: "unknown", content: trimmed }],
    };
  }
}

async function generateOpeningMessage(record: ImportedConversation): Promise<string> {
  const summary = record.summary || "your imported conversation";
  const topics = (record.topics || []).slice(0, 3).join(", ");
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are DW, a grounded assistant. Write 1-2 sentences acknowledging that you read the user's imported conversation and inviting them to keep going. Reference specifics from the summary. Conversational, no headers, no lists.",
        },
        {
          role: "user",
          content: `Summary: ${summary}\nTopics: ${topics}\nWrite the opening message.`,
        },
      ],
      temperature: 0.6,
    });
    return completion.choices?.[0]?.message?.content?.trim()
      || `I read all of it. Want to keep going from where you left off?`;
  } catch {
    return `I read all of it — ${summary.slice(0, 200)} Want to keep going from where you left off?`;
  }
}

// ── In-memory staged ChatGPT exports keyed by stagingId ───────────────────────
type StagedExport = {
  userId: string;
  conversations: ChatGptConversation[];
  createdAt: number;
};
const stagedExports = new Map<string, StagedExport>();
const STAGING_TTL_MS = 30 * 60 * 1000;

function pruneStaging() {
  const cutoff = Date.now() - STAGING_TTL_MS;
  stagedExports.forEach((v, k) => {
    if (v.createdAt < cutoff) stagedExports.delete(k);
  });
}

const rawPasteSchema = z.object({
  text: z.string().min(1).max(200_000),
  title: z.string().max(200).optional(),
});

const commitSchema = z.object({
  stagingId: z.string().min(1),
  indexes: z.array(z.number().int().nonnegative()).min(1).max(200),
});

export function registerChatImportRoutes(app: Express): void {
  // Upload + parse a ChatGPT export. Returns a list of conversations the user
  // can pick from, plus a stagingId to commit the chosen ones.
  app.post(
    "/api/imports/chatgpt-export",
    requireAuth,
    requirePaidOrQuota("import"),
    exportUpload.single("file"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded. Drop your conversations.json from the ChatGPT export." });
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(req.file.buffer.toString("utf8"));
        } catch {
          return res.status(400).json({ error: "That file isn't valid JSON. Upload the conversations.json from your ChatGPT export." });
        }
        if (!Array.isArray(parsed)) {
          return res.status(400).json({ error: "Expected an array of conversations (conversations.json from ChatGPT export)." });
        }
        const list = parsed as ChatGptConversation[];
        const preview = list.map((c, idx) => {
          const msgCount = c?.mapping
            ? Object.values(c.mapping).filter((n) => n.message && (n.message.author?.role === "user" || n.message.author?.role === "assistant")).length
            : 0;
          return {
            index: idx,
            title: c?.title || `Conversation ${idx + 1}`,
            messageCount: msgCount,
            createTime: c?.create_time ?? null,
            updateTime: c?.update_time ?? null,
          };
        });

        pruneStaging();
        const stagingId = `${req.session.userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        stagedExports.set(stagingId, {
          userId: req.session.userId!,
          conversations: list,
          createdAt: Date.now(),
        });

        res.json({ stagingId, total: preview.length, conversations: preview });
      } catch (err) {
        console.error("[imports-chat] export upload error:", err);
        res.status(500).json({ error: "Couldn't read that export. Try again or use the paste tab." });
      }
    },
  );

  // Commit selected conversations from a staged export.
  app.post("/api/imports/chatgpt-export/commit", requireAuth, async (req: Request, res: Response) => {
    const parsed = commitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Provide stagingId and indexes[]." });
    }
    const staged = stagedExports.get(parsed.data.stagingId);
    if (!staged || staged.userId !== req.session.userId) {
      return res.status(404).json({ error: "Staged export not found or expired. Upload again." });
    }
    try {
      const created: ImportedConversation[] = [];
      for (const idx of parsed.data.indexes) {
        const convo = staged.conversations[idx];
        if (!convo) continue;
        const messages = flattenConversation(convo);
        if (messages.length === 0) continue;
        const originalTitle = convo.title || `ChatGPT conversation ${idx + 1}`;
        const summary = await summarizeConversation(messages, originalTitle);
        const sourceTimestamp = convo.update_time
          ? new Date(convo.update_time * 1000)
          : convo.create_time
            ? new Date(convo.create_time * 1000)
            : null;
        const row = await storage.createImportedConversation({
          userId: req.session.userId!,
          source: "chatgpt_export",
          originalTitle,
          messages,
          summary: summary.summary,
          topics: summary.topics,
          suggestedActions: summary.suggestedActions,
          sourceTimestamp,
        });
        created.push(row);
      }
      res.json({ imported: created.length, conversations: created });
    } catch (err) {
      console.error("[imports-chat] commit error:", err);
      res.status(500).json({ error: "Couldn't import those conversations. Please try again." });
    }
  });

  // Raw paste: any wall of text, normalized via LLM into a transcript.
  app.post("/api/imports/raw-paste", requireAuth, requirePaidOrQuota("import"), async (req: Request, res: Response) => {
    const parsed = rawPasteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Paste some text first." });
    }
    try {
      const { title, messages } = await normalizeRawPaste(parsed.data.text, parsed.data.title);
      const summary = await summarizeConversation(messages, title);
      const row = await storage.createImportedConversation({
        userId: req.session.userId!,
        source: "raw_paste",
        originalTitle: title,
        messages,
        summary: summary.summary,
        topics: summary.topics,
        suggestedActions: summary.suggestedActions,
      });
      res.json(row);
    } catch (err) {
      console.error("[imports-chat] raw paste error:", err);
      res.status(500).json({ error: "Couldn't import that paste. Please try again." });
    }
  });

  // List all imported conversations for the current user.
  app.get("/api/imports", requireAuth, async (req: Request, res: Response) => {
    try {
      const rows = await storage.listImportedConversations(req.session.userId!);
      res.json(rows);
    } catch (err) {
      console.error("[imports-chat] list error:", err);
      res.status(500).json({ error: "Couldn't load your imports." });
    }
  });

  // Get a single imported conversation (with full message list).
  app.get("/api/imports/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const row = await storage.getImportedConversation(req.params.id, req.session.userId!);
      if (!row) return res.status(404).json({ error: "Import not found." });
      res.json(row);
    } catch (err) {
      console.error("[imports-chat] get error:", err);
      res.status(500).json({ error: "Couldn't load that import." });
    }
  });

  app.delete("/api/imports/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const ok = await storage.deleteImportedConversation(req.params.id, req.session.userId!);
      if (!ok) return res.status(404).json({ error: "Import not found." });
      res.json({ success: true });
    } catch (err) {
      console.error("[imports-chat] delete error:", err);
      res.status(500).json({ error: "Couldn't delete that import." });
    }
  });

  // Attach an imported conversation to a project (for the Plans Workspace).
  app.patch("/api/imports/:id/project", requireAuth, async (req: Request, res: Response) => {
    const body = z.object({ projectId: z.string().nullable() }).safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Provide projectId (or null)." });
    try {
      // Verify the import belongs to this user before touching anything.
      const existing = await storage.getImportedConversation(req.params.id, req.session.userId!);
      if (!existing) return res.status(404).json({ error: "Import not found." });

      // If a project is being attached, verify the project belongs to this user too.
      if (body.data.projectId) {
        const project = await storage.getProjectForUser(body.data.projectId, req.session.userId!);
        if (!project) return res.status(404).json({ error: "Plan not found." });
      }

      const updated = await storage.updateImportedConversation(req.params.id, req.session.userId!, {
        projectId: body.data.projectId,
      });
      if (!updated) return res.status(404).json({ error: "Import not found." });

      // Mirror the attach into the new ProjectArtifacts table so the plan's
      // artifacts panel shows the import. If detaching, remove any matching
      // artifact row(s) for this import on this user's plans.
      try {
        // Always clean up artifact rows on the *previously* linked plan first
        // so that re-attaching to a different plan never leaves stale rows.
        if (existing.projectId && existing.projectId !== body.data.projectId) {
          const prior = await storage.getProjectArtifacts(existing.projectId, req.session.userId!);
          for (const a of prior) {
            if (a.kind === "import" && a.refId === existing.id) {
              await storage.deleteProjectArtifact(a.id, existing.projectId, req.session.userId!);
            }
          }
        }
        if (body.data.projectId) {
          // Avoid creating duplicates if one already exists on the new plan.
          const existingArtifacts = await storage.getProjectArtifacts(body.data.projectId, req.session.userId!);
          const already = existingArtifacts.some(
            (a) => a.kind === "import" && a.refId === existing.id,
          );
          if (!already) {
            await storage.createProjectArtifact(
              {
                projectId: body.data.projectId,
                kind: "import",
                refId: existing.id,
                url: null,
                title: existing.originalTitle.slice(0, 200),
              },
              req.session.userId!,
            );
          }
        }
      } catch (err) {
        // Non-fatal: the import is attached; artifact mirror is just best-effort.
        console.error("[imports-chat] artifact mirror failed:", err);
      }

      res.json(updated);
    } catch (err) {
      console.error("[imports-chat] attach project error:", err);
      res.status(500).json({ error: "Couldn't attach to that plan." });
    }
  });

  // Create a seeded chat conversation that picks up where the import left off.
  // Returns the new conversation row + a flat message list for the client to
  // hand to the Talk-It-Out page.
  app.post("/api/imports/:id/continue", requireAuth, requirePaidOrQuota("chat"), async (req: Request, res: Response) => {
    try {
      const record = await storage.getImportedConversation(req.params.id, req.session.userId!);
      if (!record) return res.status(404).json({ error: "Import not found." });

      const messages = (record.messages as ImportedConversationMessage[]) || [];
      const recent = messages.slice(-10);
      const opening = await generateOpeningMessage(record);

      const systemContext = [
        `You are DW continuing a conversation the user started elsewhere (${record.source}).`,
        `Imported title: ${record.originalTitle}`,
        record.summary ? `Summary of where they left off: ${record.summary}` : null,
        record.topics && record.topics.length > 0 ? `Topics: ${record.topics.join(", ")}` : null,
        `Pick up exactly where they left off — do not re-introduce yourself, do not restart the topic. Reference specifics from the summary when relevant.`,
      ]
        .filter(Boolean)
        .join("\n");

      const seededMessages = [
        { role: "system" as const, content: systemContext },
        ...recent.map((m) => ({
          role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
          content: m.content,
        })),
        { role: "assistant" as const, content: opening },
      ];

      const created = await storage.createConversation({
        userId: req.session.userId!,
        title: record.originalTitle.slice(0, 120),
        category: "general",
        messages: seededMessages,
      });

      res.json({
        sessionId: created.id,
        conversation: created,
        openingMessage: opening,
        recentMessages: recent,
        systemContext,
      });
    } catch (err) {
      console.error("[imports-chat] continue error:", err);
      res.status(500).json({ error: "Couldn't open a chat from that import." });
    }
  });
}
