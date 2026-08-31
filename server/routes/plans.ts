/**
 * Plans Workspace routes — projects, milestones, artifacts, and a plan-scoped
 * DW chat. Builds on the existing `projects`, `projectChats`,
 * `projectMilestones`, and `projectArtifacts` tables. Every request is scoped
 * to the authenticated user; storage helpers verify ownership.
 */
import type { Express, Request, Response } from "express";
import { z } from "zod";
import multer from "multer";
import { storage } from "../storage";
import {
  savePlanArtifactFile,
  readPlanArtifactFile,
  deletePlanArtifactFile,
} from "../lib/plan-artifact-files";
import { extractTextFromBuffer } from "../document-parser";
import { db } from "../db";
import { eq, and, inArray } from "drizzle-orm";
import {
  importedConversations,
  insertProjectMilestoneSchema,
  insertProjectArtifactSchema,
  projectStatusEnum,
  projectArtifactKindEnum,
  type ProjectMilestone,
  type ProjectArtifact,
  type Project,
  type InsertProject,
  type InsertProjectChat,
  type InsertProjectMilestone,
  type InsertProjectArtifact,
} from "@shared/schema";
import { getPlanTemplate, PLAN_TEMPLATES } from "@shared/planTemplates";
import { requireAuth } from "./_shared";
import { getUserContextSnapshot, toUserLifeContext } from "../lib/user-context";
import { generateChatResponse, openai, getAiConfigStatus } from "../openai";
import { buildCompanionContext, serializeCompanionContext } from "../lib/companion-context";

type ChatTurn = { role: "user" | "assistant"; content: string };

function isChatTurn(value: unknown): value is ChatTurn {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ChatTurn).content === "string" &&
    ((value as ChatTurn).role === "user" || (value as ChatTurn).role === "assistant")
  );
}

/**
 * Build the full message list for a plan's DW chat by flattening every
 * `projectChats` row (each row stores an array of messages) in chronological
 * order.
 */
async function loadPlanChatMessages(projectId: string, userId: string): Promise<ChatTurn[]> {
  const rows = await storage.getProjectChatsForUser(projectId, userId);
  const ordered = [...rows].sort((a, b) => {
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return at - bt;
  });
  const out: ChatTurn[] = [];
  for (const row of ordered) {
    const msgs = Array.isArray(row.messages) ? row.messages : [];
    for (const m of msgs) {
      if (isChatTurn(m)) out.push({ role: m.role, content: m.content });
    }
  }
  return out;
}

/**
 * Compose the system context DW receives on every plan-chat turn — plan name,
 * description, dimension tags, milestones (open + recent done), and a short
 * blurb per attached artifact (imported conversations get their summary).
 */
async function buildPlanChatContext(
  project: Project,
  userId: string,
): Promise<string> {
  const milestones = await storage.getProjectMilestones(project.id, userId);
  const artifacts = await storage.getProjectArtifacts(project.id, userId);

  const open = milestones.filter((m) => !m.doneAt).slice(0, 10);
  const recentDone = milestones
    .filter((m) => m.doneAt)
    .sort((a, b) => (b.doneAt?.getTime?.() ?? 0) - (a.doneAt?.getTime?.() ?? 0))
    .slice(0, 5);

  const lines: string[] = [];
  lines.push(`PLAN CONTEXT — you are DW helping the user with the plan "${project.name}".`);
  if (project.description) lines.push(`Description: ${project.description}`);
  if (project.dimensionTags && project.dimensionTags.length > 0) {
    lines.push(`Dimensions: ${project.dimensionTags.join(", ")}`);
  }
  lines.push(`Status: ${project.status ?? "active"}.`);

  if (open.length > 0) {
    lines.push("Open milestones:");
    for (const m of open) {
      const due = m.dueDate ? ` (due ${new Date(m.dueDate).toLocaleDateString()})` : "";
      lines.push(`- ${m.title}${due}`);
    }
  } else {
    lines.push("No open milestones yet — invite the user to define a few when natural.");
  }
  if (recentDone.length > 0) {
    lines.push("Recently completed:");
    for (const m of recentDone) lines.push(`- ${m.title}`);
  }

  if (artifacts.length > 0) {
    lines.push("Attached artifacts:");
    // Pull summaries for any imported-conversation artifacts so DW can
    // reference what was actually discussed in those imports.
    const importIds = artifacts
      .filter((a) => a.kind === "import" && a.refId)
      .map((a) => a.refId as string);
    const importMap = new Map<string, { summary: string | null; topics: string[] | null; title: string }>();
    if (importIds.length > 0) {
      const rows = await db
        .select({
          id: importedConversations.id,
          summary: importedConversations.summary,
          topics: importedConversations.topics,
          title: importedConversations.originalTitle,
        })
        .from(importedConversations)
        .where(and(eq(importedConversations.userId, userId), inArray(importedConversations.id, importIds)));
      for (const r of rows) {
        importMap.set(r.id, { summary: r.summary, topics: r.topics, title: r.title });
      }
    }
    for (const a of artifacts) {
      if (a.kind === "import" && a.refId) {
        const meta = importMap.get(a.refId);
        const summary = meta?.summary ? ` — ${meta.summary.slice(0, 400)}` : "";
        const topics = meta?.topics && meta.topics.length > 0 ? ` [topics: ${meta.topics.join(", ")}]` : "";
        lines.push(`- (import) ${a.title}${topics}${summary}`);
      } else if (a.kind === "link") {
        lines.push(`- (link) ${a.title}${a.url ? ` — ${a.url}` : ""}`);
      } else {
        const meta: string[] = [];
        if (a.mimeType) meta.push(a.mimeType);
        if (typeof a.fileSize === "number") meta.push(`${Math.max(1, Math.round(a.fileSize / 1024))} KB`);
        const metaStr = meta.length > 0 ? ` [${meta.join(", ")}]` : "";
        const excerpt = a.excerpt ? ` — ${a.excerpt.slice(0, 600)}` : "";
        lines.push(`- (upload) ${a.title}${metaStr}${excerpt}`);
      }
    }
  }

  lines.push("");
  lines.push(
    "Ground every reply in this plan: reference its name, the open milestones, and the attached artifact content when relevant. Do not pretend you don't know what plan this is.",
  );
  return lines.join("\n");
}

/**
 * Ask the model for a short "where you are" sentence about a plan, used as
 * the one-liner shown on the Plans list. Best-effort — returns null on any
 * failure so callers can fall back gracefully.
 */
async function generatePlanSummary(
  project: Project,
  history: ChatTurn[],
  milestones: ProjectMilestone[],
): Promise<string | null> {
  if (!getAiConfigStatus().configured) return null;
  const openTitles = milestones.filter((m) => !m.doneAt).slice(0, 5).map((m) => m.title);
  const doneCount = milestones.filter((m) => m.doneAt).length;
  const recentChat = history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "You" : "DW"}: ${m.content}`)
    .join("\n")
    .slice(0, 1500);
  const prompt = [
    `Plan: ${project.name}`,
    project.description ? `Description: ${project.description}` : "",
    openTitles.length ? `Open milestones: ${openTitles.join("; ")}` : "No open milestones yet.",
    doneCount > 0 ? `${doneCount} milestone(s) completed.` : "",
    recentChat ? `Recent chat:\n${recentChat}` : "",
    "",
    'Write ONE short sentence (≤ 110 chars) describing "where this plan is right now" — calm, plain, present-tense. No emojis, no quotes, no preamble.',
  ]
    .filter(Boolean)
    .join("\n");
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are DW, summarizing the current state of one of the user's plans in a single calm sentence." },
        { role: "user", content: prompt },
      ],
      max_tokens: 80,
      temperature: 0.4,
    });
    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) return null;
    return raw.replace(/^["']|["']$/g, "").slice(0, 200);
  } catch (err) {
    console.error("[plans] summary generation failed:", err);
    return null;
  }
}

const createPlanSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional().nullable(),
  dimensionTags: z.array(z.string().min(1).max(40)).max(8).optional().nullable(),
  templateId: z.enum(PLAN_TEMPLATES.map((t) => t.id) as [string, ...string[]]).optional(),
});

const updatePlanSchema = z
  .object({
    name: z.string().min(1).max(160).optional(),
    description: z.string().max(2000).nullable().optional(),
    dimensionTags: z.array(z.string().min(1).max(40)).max(8).nullable().optional(),
    status: z.enum(projectStatusEnum).optional(),
  })
  .strict();

const milestoneCreateSchema = z.object({
  title: z.string().min(1).max(200),
  dueDate: z.coerce.date().optional().nullable(),
  order: z.number().int().min(0).max(9999).optional(),
});

const milestoneUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    dueDate: z.coerce.date().nullable().optional(),
    order: z.number().int().min(0).max(9999).optional(),
    done: z.boolean().optional(),
  })
  .strict();

/**
 * Restrict attached link URLs to http(s) so we never render a `javascript:` or
 * other dangerous-scheme href as a clickable artifact link.
 */
const httpUrlSchema = z
  .string()
  .url()
  .max(800)
  .refine((u) => /^https?:\/\//i.test(u), { message: "URL must start with http:// or https://" });

const artifactCreateSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("import"),
    refId: z.string().min(1),
    title: z.string().min(1).max(200).optional(),
  }),
  z.object({
    kind: z.literal("link"),
    url: httpUrlSchema,
    title: z.string().min(1).max(200),
  }),
]);

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB
const planFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

const chatPostSchema = z.object({
  message: z.string().min(1).max(8000),
});

function zodError(error: z.ZodError) {
  const issue = error.issues[0];
  const field = issue?.path.length ? issue.path.join(".") : "input";
  return { error: `Invalid ${field}: ${issue?.message || "Invalid input"}` };
}

export function registerPlansRoutes(app: Express): void {
  // ── Plans CRUD ──────────────────────────────────────────────────────────
  app.get("/api/plans", requireAuth, async (req, res) => {
    try {
      const projects = await storage.getProjects(req.session.userId!);
      res.json(projects);
    } catch (err) {
      console.error("[plans] list error:", err);
      res.status(500).json({ error: "Failed to load plans." });
    }
  });

  app.post("/api/plans", requireAuth, async (req, res) => {
    const parsed = createPlanSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodError(parsed.error));
    try {
      const insert: InsertProject = {
        userId: req.session.userId!,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        dimensionTags: parsed.data.dimensionTags ?? null,
        isActive: true,
        status: "active",
        lastActivityAt: new Date(),
        summary: null,
      };
      const created = await storage.createProject(insert);

      // If a non-blank template was chosen, seed its starter milestones and
      // the opening DW chat message so the new plan isn't a blank page.
      // Do these synchronously (before responding) so the user sees them
      // immediately when they open the plan.
      const tpl = getPlanTemplate(parsed.data.templateId);
      if (created && tpl && tpl.id !== "custom") {
        try {
          for (let i = 0; i < tpl.milestones.length; i++) {
            await storage.createProjectMilestone(
              { projectId: created.id, title: tpl.milestones[i], order: i, dueDate: null },
              req.session.userId!,
            );
          }
          if (tpl.intro) {
            const insertChat: InsertProjectChat = {
              projectId: created.id,
              messages: [{ role: "assistant", content: tpl.intro }],
            };
            await storage.createProjectChatForUser(insertChat, req.session.userId!);
          }
        } catch (err) {
          console.error(`[plans] template seeding failed for project=${created.id} template=${tpl.id}:`, err);
        }
      }

      res.json(created);
      // Backfill the DW one-liner asynchronously so even brand-new plans get a
      // generated summary on the cards (instead of falling back to description).
      if (created && (created.description || (created.dimensionTags?.length ?? 0) > 0)) {
        void (async () => {
          try {
            const summary = await generatePlanSummary(created, [], []);
            if (summary) {
              await storage.updateProjectForUser(created.id, req.session.userId!, { summary });
            }
          } catch (err) {
            console.error("[plans] backfill summary failed:", err);
          }
        })();
      }
    } catch (err) {
      console.error("[plans] create error:", err);
      res.status(500).json({ error: "Failed to create plan." });
    }
  });

  app.get("/api/plans/:id", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProjectForUser(req.params.id, req.session.userId!);
      if (!project) return res.status(404).json({ error: "Plan not found." });
      res.json(project);
    } catch (err) {
      console.error("[plans] get error:", err);
      res.status(500).json({ error: "Failed to load plan." });
    }
  });

  app.patch("/api/plans/:id", requireAuth, async (req, res) => {
    const parsed = updatePlanSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodError(parsed.error));
    try {
      const data: Partial<Project> = { lastActivityAt: new Date() };
      if (parsed.data.name !== undefined) data.name = parsed.data.name;
      if (parsed.data.description !== undefined) data.description = parsed.data.description;
      if (parsed.data.dimensionTags !== undefined) data.dimensionTags = parsed.data.dimensionTags;
      if (parsed.data.status !== undefined) data.status = parsed.data.status;
      const updated = await storage.updateProjectForUser(req.params.id, req.session.userId!, data);
      if (!updated) return res.status(404).json({ error: "Plan not found." });
      res.json(updated);
    } catch (err) {
      console.error("[plans] update error:", err);
      res.status(500).json({ error: "Failed to update plan." });
    }
  });

  app.delete("/api/plans/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteProjectForUser(req.params.id, req.session.userId!);
      if (!deleted) return res.status(404).json({ error: "Plan not found." });
      res.json({ success: true });
    } catch (err) {
      console.error("[plans] delete error:", err);
      res.status(500).json({ error: "Failed to delete plan." });
    }
  });

  // ── Milestones ──────────────────────────────────────────────────────────
  app.get("/api/plans/:id/milestones", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProjectForUser(req.params.id, req.session.userId!);
      if (!project) return res.status(404).json({ error: "Plan not found." });
      const milestones = await storage.getProjectMilestones(req.params.id, req.session.userId!);
      res.json(milestones);
    } catch (err) {
      console.error("[plans] milestones list error:", err);
      res.status(500).json({ error: "Failed to load milestones." });
    }
  });

  app.post("/api/plans/:id/milestones", requireAuth, async (req, res) => {
    const parsed = milestoneCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodError(parsed.error));
    try {
      const insert: InsertProjectMilestone = {
        projectId: req.params.id,
        title: parsed.data.title,
        dueDate: parsed.data.dueDate ?? null,
        doneAt: null,
        order: parsed.data.order ?? 0,
      };
      const created = await storage.createProjectMilestone(insert, req.session.userId!);
      if (!created) return res.status(404).json({ error: "Plan not found." });
      res.json(created);
    } catch (err) {
      console.error("[plans] milestones create error:", err);
      res.status(500).json({ error: "Failed to create milestone." });
    }
  });

  app.patch("/api/plans/:id/milestones/:milestoneId", requireAuth, async (req, res) => {
    const parsed = milestoneUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodError(parsed.error));
    try {
      const data: Partial<InsertProjectMilestone> & { doneAt?: Date | null } = {};
      if (parsed.data.title !== undefined) data.title = parsed.data.title;
      if (parsed.data.dueDate !== undefined) data.dueDate = parsed.data.dueDate ?? null;
      if (parsed.data.order !== undefined) data.order = parsed.data.order;
      if (parsed.data.done !== undefined) data.doneAt = parsed.data.done ? new Date() : null;
      const updated = await storage.updateProjectMilestone(
        req.params.milestoneId,
        req.params.id,
        req.session.userId!,
        data,
      );
      if (!updated) return res.status(404).json({ error: "Milestone not found." });
      res.json(updated);
    } catch (err) {
      console.error("[plans] milestones update error:", err);
      res.status(500).json({ error: "Failed to update milestone." });
    }
  });

  app.delete("/api/plans/:id/milestones/:milestoneId", requireAuth, async (req, res) => {
    try {
      const ok = await storage.deleteProjectMilestone(
        req.params.milestoneId,
        req.params.id,
        req.session.userId!,
      );
      if (!ok) return res.status(404).json({ error: "Milestone not found." });
      res.json({ success: true });
    } catch (err) {
      console.error("[plans] milestones delete error:", err);
      res.status(500).json({ error: "Failed to delete milestone." });
    }
  });

  // ── Artifacts ───────────────────────────────────────────────────────────
  app.get("/api/plans/:id/artifacts", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProjectForUser(req.params.id, req.session.userId!);
      if (!project) return res.status(404).json({ error: "Plan not found." });
      const artifacts = await storage.getProjectArtifacts(req.params.id, req.session.userId!);
      res.json(artifacts);
    } catch (err) {
      console.error("[plans] artifacts list error:", err);
      res.status(500).json({ error: "Failed to load artifacts." });
    }
  });

  app.post("/api/plans/:id/artifacts", requireAuth, async (req, res) => {
    const parsed = artifactCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodError(parsed.error));
    try {
      // Verify the plan belongs to this user *before* mutating any
      // import back-references. This prevents an attacker from poking
      // imports on a plan they don't own.
      const ownerCheck = await storage.getProjectForUser(req.params.id, req.session.userId!);
      if (!ownerCheck) return res.status(404).json({ error: "Plan not found." });
      let title = parsed.data.title || "Untitled";
      let refId: string | null = null;
      let url: string | null = null;
      if (parsed.data.kind === "import") {
        // Verify the import belongs to this user before linking.
        const imp = await storage.getImportedConversation(parsed.data.refId, req.session.userId!);
        if (!imp) return res.status(404).json({ error: "Import not found." });
        refId = imp.id;
        if (!parsed.data.title) title = imp.originalTitle.slice(0, 200);
        // If this import was previously attached to a *different* plan, drop
        // the stale artifact rows from that plan so the import lives on only
        // one plan at a time (matches importedConversations.projectId being
        // singular and mirrors the PATCH /api/imports/:id/project behavior).
        if (imp.projectId && imp.projectId !== req.params.id) {
          try {
            const stale = await storage.getProjectArtifacts(imp.projectId, req.session.userId!);
            for (const a of stale) {
              if (a.kind === "import" && a.refId === imp.id) {
                await storage.deleteProjectArtifact(a.id, imp.projectId, req.session.userId!);
              }
            }
          } catch {
            /* non-fatal */
          }
        }
        // Dedup: if this import is already attached to *this* plan, return the
        // existing artifact instead of inserting a duplicate.
        try {
          const onThis = await storage.getProjectArtifacts(req.params.id, req.session.userId!);
          const dup = onThis.find((a) => a.kind === "import" && a.refId === imp.id);
          if (dup) {
            // Still ensure the import row points at this plan, then short-circuit.
            try {
              await storage.updateImportedConversation(imp.id, req.session.userId!, {
                projectId: req.params.id,
              });
            } catch {
              /* non-fatal */
            }
            return res.json(dup);
          }
        } catch {
          /* non-fatal */
        }
        // Mirror the link onto the import row too so the imports list reflects it.
        try {
          await storage.updateImportedConversation(imp.id, req.session.userId!, {
            projectId: req.params.id,
          });
        } catch {
          /* non-fatal */
        }
      } else if (parsed.data.kind === "link") {
        url = parsed.data.url;
      }
      const insert: InsertProjectArtifact = {
        projectId: req.params.id,
        kind: parsed.data.kind,
        refId,
        url,
        title,
      };
      const created = await storage.createProjectArtifact(insert, req.session.userId!);
      if (!created) return res.status(404).json({ error: "Plan not found." });
      res.json(created);
    } catch (err) {
      console.error("[plans] artifacts create error:", err);
      res.status(500).json({ error: "Failed to attach artifact." });
    }
  });

  // Upload a file (PDF, image, text, doc) and attach it as an "upload" artifact.
  // Multipart only — the JSON POST above does not accept upload kinds.
  // Wrap multer.single so its size-limit / file-type errors surface as JSON
  // 4xx responses instead of being swallowed by Express's default handler.
  const planFileUploadMw = (req: Request, res: Response, next: (err?: unknown) => void) => {
    planFileUpload.single("file")(req, res, (err: unknown) => {
      if (err) {
        if ((err as { code?: string })?.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "File is too large (25 MB max)." });
        }
        console.error("[plans] upload middleware error:", err);
        return res.status(400).json({ error: "Failed to read uploaded file." });
      }
      next();
    });
  };

  app.post(
    "/api/plans/:id/artifacts/upload",
    requireAuth,
    planFileUploadMw,
    async (req, res) => {
      try {
        const userId = req.session.userId!;
        const ownerCheck = await storage.getProjectForUser(req.params.id, userId);
        if (!ownerCheck) return res.status(404).json({ error: "Plan not found." });
        const file = req.file;
        if (!file) return res.status(400).json({ error: "No file uploaded." });
        const rawTitle = typeof req.body?.title === "string" && req.body.title.trim()
          ? req.body.title.trim()
          : file.originalname || "Untitled file";
        const title = rawTitle.slice(0, 200);

        // Best-effort text extraction so DW can ground replies in the file.
        // Failures (binary file, encrypted PDF, OCR not configured) are
        // non-fatal — we just skip the excerpt.
        let excerpt: string | null = null;
        try {
          const result = await extractTextFromBuffer(file.buffer, file.mimetype, file.originalname);
          if (result.text) {
            excerpt = result.text.replace(/\s+/g, " ").trim().slice(0, 1500);
          }
        } catch (err) {
          console.warn("[plans] artifact text extraction skipped:", err instanceof Error ? err.message : err);
        }

        // Create the row first so we can use its id as the storage key.
        const created = await storage.createProjectArtifact(
          {
            projectId: req.params.id,
            kind: "upload",
            refId: null,
            url: null,
            title,
            mimeType: file.mimetype || null,
            fileSize: file.size,
            excerpt,
          },
          userId,
        );
        if (!created) return res.status(404).json({ error: "Plan not found." });

        try {
          const saved = await savePlanArtifactFile(userId, created.id, file.buffer, file.mimetype);
          const updated = await storage.updateProjectArtifact(created.id, req.params.id, userId, {
            refId: saved.storageKey,
          });
          res.json(updated ?? { ...created, refId: saved.storageKey });
        } catch (err) {
          // Roll back the row if writing the file fails so we don't leave
          // dangling artifact records pointing at nothing.
          try {
            await storage.deleteProjectArtifact(created.id, req.params.id, userId);
          } catch {
            /* non-fatal */
          }
          throw err;
        }
      } catch (err) {
        console.error("[plans] artifact upload error:", err);
        res.status(500).json({ error: "Failed to upload file." });
      }
    },
  );

  // Stream a previously-uploaded artifact back to the user.
  app.get("/api/plans/:id/artifacts/:artifactId/file", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const artifacts = await storage.getProjectArtifacts(req.params.id, userId);
      const target = artifacts.find((a) => a.id === req.params.artifactId);
      if (!target || target.kind !== "upload" || !target.refId) {
        return res.status(404).json({ error: "File not found." });
      }
      let buffer: Buffer;
      try {
        buffer = await readPlanArtifactFile(target.refId);
      } catch (err) {
        console.error("[plans] artifact file read error:", err);
        return res.status(404).json({ error: "File not found." });
      }
      res.setHeader("Content-Type", target.mimeType || "application/octet-stream");
      res.setHeader("Content-Length", String(buffer.byteLength));
      // Use attachment so browsers download the file with its original name
      // rather than rendering arbitrary HTML/SVG inline.
      const safeName = (target.title || "download").replace(/[\r\n"]/g, "_").slice(0, 200);
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
      res.send(buffer);
    } catch (err) {
      console.error("[plans] artifact file error:", err);
      res.status(500).json({ error: "Failed to download file." });
    }
  });

  app.delete("/api/plans/:id/artifacts/:artifactId", requireAuth, async (req, res) => {
    try {
      // If it's an import-kind artifact, also clear the back-reference on the import row.
      const artifacts = await storage.getProjectArtifacts(req.params.id, req.session.userId!);
      const target = artifacts.find((a) => a.id === req.params.artifactId);
      if (target?.kind === "import" && target.refId) {
        try {
          await storage.updateImportedConversation(target.refId, req.session.userId!, {
            projectId: null,
          });
        } catch {
          /* non-fatal */
        }
      }
      // Best-effort cleanup of the on-disk file for upload artifacts so we
      // don't leak storage when the user detaches.
      if (target?.kind === "upload" && target.refId) {
        try {
          await deletePlanArtifactFile(target.refId);
        } catch (err) {
          console.warn("[plans] artifact file delete failed:", err instanceof Error ? err.message : err);
        }
      }
      const ok = await storage.deleteProjectArtifact(
        req.params.artifactId,
        req.params.id,
        req.session.userId!,
      );
      if (!ok) return res.status(404).json({ error: "Artifact not found." });
      res.json({ success: true });
    } catch (err) {
      console.error("[plans] artifacts delete error:", err);
      res.status(500).json({ error: "Failed to detach artifact." });
    }
  });

  // ── Plan-scoped chat ────────────────────────────────────────────────────
  app.get("/api/plans/:id/chat", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProjectForUser(req.params.id, req.session.userId!);
      if (!project) return res.status(404).json({ error: "Plan not found." });
      const messages = await loadPlanChatMessages(req.params.id, req.session.userId!);
      res.json({ messages });
    } catch (err) {
      console.error("[plans] chat list error:", err);
      res.status(500).json({ error: "Failed to load chat." });
    }
  });

  app.post("/api/plans/:id/chat", requireAuth, async (req, res) => {
    const parsed = chatPostSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodError(parsed.error));
    try {
      const userId = req.session.userId!;
      const project = await storage.getProjectForUser(req.params.id, userId);
      if (!project) return res.status(404).json({ error: "Plan not found." });

      const aiConfig = getAiConfigStatus();
      const userMessage: ChatTurn = { role: "user", content: parsed.data.message };

      let assistantText: string;
      let history: ChatTurn[] = [];
      if (!aiConfig.configured) {
        assistantText =
          "I'm having a small moment on my end — try again in a moment. In the meantime, I've saved your message to this plan's thread.";
      } else {
        history = await loadPlanChatMessages(req.params.id, userId);
        const planContext = await buildPlanChatContext(project, userId);
        const snapshot = await getUserContextSnapshot(userId);
        const userContext = toUserLifeContext(snapshot, { category: "plan" });
        const companionContextBlock = serializeCompanionContext(
          await buildCompanionContext(userId).catch(() => ({
            zones: {},
            currents: {},
            energyType: null,
            interests: { deepDives: [], currentObsessions: [], popCulture: [] },
          }))
        );
        try {
          const result = await generateChatResponse(
            parsed.data.message,
            history,
            userContext,
            planContext,
            companionContextBlock,
          );
          assistantText = typeof result === "string" ? result : result.content;
        } catch (err) {
          console.error("[plans] DW chat error:", err);
          assistantText =
            "I couldn't reach my full thinking just now, but your message is saved here. Try again in a moment.";
        }
      }

      const assistantMessage: ChatTurn = { role: "assistant", content: assistantText };
      const insertChat: InsertProjectChat = {
        projectId: req.params.id,
        messages: [userMessage, assistantMessage],
      };
      await storage.createProjectChatForUser(insertChat, userId);

      // Refresh the plan's "where you are" one-liner in the background so the
      // Plans list reflects the latest state without blocking the chat reply.
      void (async () => {
        try {
          const milestones = await storage.getProjectMilestones(req.params.id, userId);
          const fullHistory = [...history, userMessage, assistantMessage];
          const summary = await generatePlanSummary(project, fullHistory, milestones);
          if (summary) {
            await storage.updateProjectForUser(req.params.id, userId, { summary });
          }
        } catch (err) {
          console.error("[plans] background summary update failed:", err);
        }
      })();

      res.json({ assistant: assistantMessage, user: userMessage });
    } catch (err) {
      console.error("[plans] chat post error:", err);
      res.status(500).json({ error: "Failed to send message." });
    }
  });

  // ── Suggest milestones ──────────────────────────────────────────────────
  app.post("/api/plans/:id/suggest-milestones", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const project = await storage.getProjectForUser(req.params.id, userId);
      if (!project) return res.status(404).json({ error: "Plan not found." });

      const aiConfig = getAiConfigStatus();
      if (!aiConfig.configured) {
        return res.json({ proposals: [] });
      }

      const planContext = await buildPlanChatContext(project, userId);
      const history = await loadPlanChatMessages(req.params.id, userId);
      const recentChat = history
        .slice(-12)
        .map((m) => `${m.role === "user" ? "User" : "DW"}: ${m.content}`)
        .join("\n")
        .slice(0, 4000);

      const prompt = [
        planContext,
        "",
        recentChat ? `Recent chat:\n${recentChat}` : "(no recent chat yet)",
        "",
        "Propose 3–5 concrete next milestones for this plan.",
        "Return ONLY valid JSON: { \"proposals\": [{\"title\": string}] }",
        "Each title must be a short, actionable step (≤ 90 chars). No numbering, no bullets.",
      ].join("\n");

      const proposals: { title: string }[] = [];
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are DW, a calm planning partner. Reply with JSON only." },
            { role: "user", content: prompt },
          ],
          max_tokens: 400,
          temperature: 0.5,
          response_format: { type: "json_object" },
        });
        const raw = completion.choices[0]?.message?.content?.trim() || "{}";
        const parsedJson = JSON.parse(raw) as unknown;
        const list =
          parsedJson && typeof parsedJson === "object" && "proposals" in parsedJson
            ? (parsedJson as { proposals?: unknown }).proposals
            : undefined;
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item && typeof item === "object" && "title" in item) {
              const title = (item as { title?: unknown }).title;
              if (typeof title === "string" && title.trim()) {
                proposals.push({ title: title.trim().slice(0, 200) });
                if (proposals.length >= 5) break;
              }
            }
          }
        }
      } catch (err) {
        console.error("[plans] suggest-milestones AI error:", err);
      }

      res.json({ proposals });
    } catch (err) {
      console.error("[plans] suggest-milestones error:", err);
      res.status(500).json({ error: "Failed to suggest milestones." });
    }
  });
}
