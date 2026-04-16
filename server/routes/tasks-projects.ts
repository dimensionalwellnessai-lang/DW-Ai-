import type { Express } from "express";

import { z } from "zod";
import { storage } from "../storage";

import { requireAuth } from "./_shared";
import { insertProjectChatSchema, insertProjectSchema, insertTaskSchema } from "@shared/schema";
export function registerTasksProjectsRoutes(app: Express): void {
  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const tasks = await storage.getTasks(req.session.userId!);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to load tasks" });
    }
  });

  app.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      const data = insertTaskSchema.parse({ ...req.body, userId: req.session.userId! });
      const created = await storage.createTask(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const existing = await storage.getTask(req.params.id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Task not found" });
      }
      // Only allow updates to permitted task fields; disallow changing ownership.
      const updateTaskSchema = insertTaskSchema.omit({ userId: true }).partial();
      const updateData = updateTaskSchema.parse(req.body);
      const updated = await storage.updateTaskForUser(req.params.id, userId, updateData);

      // Bidirectional sync: propagate completion to a linked elevation plan action
      if (updateData.isCompleted !== undefined && existing.blueprintActionId) {
        try {
          await storage.updateElevationPlanAction(existing.blueprintActionId, userId, {
            isCompleted: updateData.isCompleted,
          });
        } catch {
          // Non-fatal: linked plan action may have been deleted externally
        }
      }

      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getTask(req.params.id);
      if (!existing || existing.userId !== req.session.userId) {
        return res.status(404).json({ error: "Task not found" });
      }
      await storage.deleteTask(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  app.get("/api/projects", requireAuth, async (req, res) => {
    try {
      const projects = await storage.getProjects(req.session.userId!);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to load projects" });
    }
  });

  app.get("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProjectForUser(req.params.id, req.session.userId!);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to load project" });
    }
  });

  app.post("/api/projects", requireAuth, async (req, res) => {
    try {
      const data = insertProjectSchema.parse({ ...req.body, userId: req.session.userId! });
      const created = await storage.createProject(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateProjectForUser(req.params.id, req.session.userId!, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteProjectForUser(req.params.id, req.session.userId!);
      if (!deleted) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  app.get("/api/projects/:id/chats", requireAuth, async (req, res) => {
    try {
      const chats = await storage.getProjectChatsForUser(req.params.id, req.session.userId!);
      res.json(chats);
    } catch (error) {
      res.status(500).json({ error: "Failed to load project chats" });
    }
  });

  app.post("/api/projects/:id/chats", requireAuth, async (req, res) => {
    try {
      const data = insertProjectChatSchema.parse({ ...req.body, projectId: req.params.id });
      const created = await storage.createProjectChatForUser(data, req.session.userId!);
      if (!created) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create project chat" });
    }
  });
}
