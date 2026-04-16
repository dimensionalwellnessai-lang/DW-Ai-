import type { Express } from "express";

import { storage } from "../storage";

import { requireAuth, calculateEndTime } from "./_shared";
import { upload } from "./_limiters";

import { analyzeMealPlanDocument } from "../openai";

import { extractTextFromBuffer, isProcessingError, type DocumentProcessingError } from "../document-parser";



export function registerImportRoutes(app: Express): void {
  app.post("/api/import/upload", requireAuth, upload.single("file"), async (req, res) => {
    const startTime = Date.now();
    
    try {
      if (!req.file) {
        return res.status(400).json({ 
          error: "No file uploaded",
          userMessage: "Please select a file to upload.",
          suggestions: ["Choose a PDF, image, or Word document"]
        });
      }

      const { buffer, mimetype, originalname } = req.file;
      
      const extracted = await extractTextFromBuffer(buffer, mimetype, originalname);
      
      if (!extracted.text || extracted.text.trim().length < 50) {
        return res.status(400).json({ 
          error: "INSUFFICIENT_CONTENT",
          userMessage: "This file doesn't have enough readable text.",
          suggestions: ["Try a different file", "Make sure the document has content"]
        });
      }

      const processingTimeMs = Date.now() - startTime;

      const doc = await storage.createImportedDocument({
        userId: req.session.userId!,
        fileName: originalname,
        fileType: mimetype,
        rawText: extracted.text,
        status: "draft",
        extractionMethod: extracted.extractionMethod,
        ocrConfidence: extracted.ocrConfidence,
        processingTimeMs,
      });

      res.json({ 
        documentId: doc.id,
        fileName: originalname,
        textLength: extracted.text.length,
        extractionMethod: extracted.extractionMethod,
        ocrConfidence: extracted.ocrConfidence,
        ocrWarning: extracted.ocrWarning,
        processingTimeMs,
      });
    } catch (error) {
      console.error("Upload error:", error);
      
      if (isProcessingError(error)) {
        const processingError = error as DocumentProcessingError;
        return res.status(422).json({
          error: processingError.code,
          userMessage: processingError.userMessage,
          suggestions: processingError.suggestions,
          isRecoverable: processingError.isRecoverable,
        });
      }
      
      res.status(500).json({ 
        error: "UPLOAD_FAILED",
        userMessage: "Something went wrong while processing your file.",
        suggestions: ["Try uploading again", "Try a different file format"],
        isRecoverable: true,
      });
    }
  });

  app.post("/api/import/analyze/:documentId", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getImportedDocument(req.params.documentId);
      if (!doc || doc.userId !== req.session.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (!doc.rawText) {
        return res.status(400).json({ error: "No text content to analyze" });
      }

      // Analyze with AI
      const analysis = await analyzeMealPlanDocument(doc.rawText);

      // Update document with analysis
      await storage.updateImportedDocument(doc.id, {
        documentTitle: analysis.planTitle,
        summary: analysis.summary,
        confidence: Math.round(analysis.confidence * 100),
        analysisJson: analysis,
        status: "analyzed",
      });

      res.json(analysis);
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: "I couldn't read that file. Try a different PDF or copy/paste text." });
    }
  });

  app.post("/api/import/commit/:documentId", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getImportedDocument(req.params.documentId);
      if (!doc || doc.userId !== req.session.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Prevent duplicate commits
      if (doc.status === "saved") {
        return res.status(400).json({ error: "This plan has already been saved" });
      }

      const { meals, routine, planTitle } = req.body;

      // Create meal plan
      const mealPlan = await storage.createMealPlan({
        userId: req.session.userId!,
        title: planTitle || doc.documentTitle || "Imported Meal Plan",
        summary: doc.summary || undefined,
        source: "import",
        importedDocumentId: doc.id,
        isActive: true,
      });

      // Create ONLY selected meals (explicit isSelected === true check)
      const selectedMeals = (meals || []).filter((m: { isSelected?: boolean }) => m.isSelected === true);
      const createdMeals = await storage.createMeals(
        selectedMeals.map((m: { title: string; mealType?: string; weekLabel?: string; tags?: string[]; notes?: string; ingredients?: string[]; instructions?: string[] }) => ({
          userId: req.session.userId!,
          mealPlanId: mealPlan.id,
          title: m.title,
          mealType: m.mealType || "other",
          weekLabel: m.weekLabel,
          tags: m.tags,
          notes: m.notes,
          ingredients: m.ingredients,
          instructions: m.instructions,
        }))
      );

      // Create routine if steps exist
      let createdRoutine = null;
      if (routine?.steps?.length > 0) {
        createdRoutine = await storage.createRoutine({
          userId: req.session.userId!,
          name: routine.title || "Meal Prep Routine",
          dimensionTags: ["nutrition"],
          steps: routine.steps.map((s: { text: string; notes?: string }) => ({
            title: s.text,
            instructions: s.notes || "",
          })),
          totalDurationMinutes: routine.steps.length * 10,
          scheduleOptions: {},
          mode: "instructions",
          isActive: true,
        });
      }

      // Update document status to prevent re-commit
      await storage.updateImportedDocument(doc.id, {
        status: "saved",
        savedAt: new Date(),
      });

      res.json({
        success: true,
        mealPlan: mealPlan,
        mealsCount: createdMeals.length,
        routine: createdRoutine,
      });
    } catch (error) {
      console.error("Commit error:", error);
      res.status(500).json({ error: "Failed to save meal plan" });
    }
  });

  app.post("/api/import/workout/:documentId", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getImportedDocument(req.params.documentId);
      if (!doc || doc.userId !== req.session.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (doc.status === "saved") {
        return res.status(400).json({ error: "This plan has already been saved" });
      }

      const { exercises: exerciseList, planTitle } = req.body;

      const workoutPlan = await storage.createWorkoutPlan({
        userId: req.session.userId!,
        title: planTitle || doc.documentTitle || "Imported Workout Plan",
        summary: doc.summary || undefined,
        source: "import",
        importedDocumentId: doc.id,
        isActive: true,
      });

      const selectedExercises = (exerciseList || []).filter((e: { isSelected?: boolean }) => e.isSelected === true);
      const createdExercises = await storage.createExercises(
        selectedExercises.map((e: { title: string; exerciseType?: string; dayLabel?: string; tags?: string[]; notes?: string; sets?: string; reps?: string; duration?: string; equipment?: string[]; instructions?: string[] }) => ({
          userId: req.session.userId!,
          workoutPlanId: workoutPlan.id,
          title: e.title,
          exerciseType: e.exerciseType || "other",
          dayLabel: e.dayLabel,
          tags: e.tags,
          notes: e.notes,
          sets: e.sets,
          reps: e.reps,
          duration: e.duration,
          equipment: e.equipment,
          instructions: e.instructions,
        }))
      );

      await storage.updateImportedDocument(doc.id, {
        status: "saved",
        savedAt: new Date(),
      });

      res.json({
        success: true,
        workoutPlan: workoutPlan,
        exercisesCount: createdExercises.length,
      });
    } catch (error) {
      console.error("Workout commit error:", error);
      res.status(500).json({ error: "Failed to save workout plan" });
    }
  });

  app.post("/api/import/calendar/:documentId", requireAuth, async (req, res) => {
    try {
      // Verify document ownership and status
      const doc = await storage.getImportedDocument(req.params.documentId);
      if (!doc || doc.userId !== req.session.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Only allow calendar additions for saved documents
      if (doc.status !== "saved") {
        return res.status(400).json({ error: "Save the plan first before adding calendar events" });
      }

      const { suggestions } = req.body;
      
      if (!suggestions || !Array.isArray(suggestions)) {
        return res.status(400).json({ error: "No calendar suggestions provided" });
      }

      // Only create events explicitly marked as selected
      const selectedSuggestions = suggestions.filter((s: { isSelected?: boolean }) => s.isSelected === true);
      const created = [];

      for (const suggestion of selectedSuggestions) {
        const event = await storage.createCalendarEvent({
          userId: req.session.userId!,
          title: suggestion.title,
          description: suggestion.notes || "",
          startTime: suggestion.suggestedStart || "09:00",
          endTime: calculateEndTime(suggestion.suggestedStart || "09:00", suggestion.durationMinutes || 60),
          eventType: "meal-prep",
          isRecurring: suggestion.recurrence?.frequency !== "none" && !!suggestion.recurrence?.frequency,
          recurrenceRule: suggestion.recurrence?.frequency && suggestion.recurrence.frequency !== "none" 
            ? suggestion.recurrence.frequency 
            : undefined,
          linkedType: "meal",
          linkedId: suggestion.mealId || null,
          linkedRoute: suggestion.mealId ? `/meal-prep?selected=${suggestion.mealId}` : "/meal-prep",
          linkedMeta: { source: "import", documentId: req.params.documentId },
        });
        created.push(event);
      }

      res.json({
        success: true,
        eventsCreated: created.length,
        events: created,
      });
    } catch (error) {
      console.error("Calendar add error:", error);
      res.status(500).json({ error: "Failed to add calendar events" });
    }
  });

  // Get meal plans
}
