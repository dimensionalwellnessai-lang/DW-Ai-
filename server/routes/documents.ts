import type { Express } from "express";

import { storage } from "../storage";

import { requireAuth } from "./_shared";
import { upload } from "./_limiters";

import { openai } from "../openai";

import { extractTextFromBuffer, generateDocumentAnalysisPrompt, validateAnalysisResult, isProcessingError, detectPrimaryCategory, type DocumentAnalysisResult, type DocumentProcessingError } from "../document-parser";



export function registerDocumentsRoutes(app: Express): void {
  app.post("/api/documents/upload", requireAuth, upload.single("file"), async (req, res) => {
    const startTime = Date.now();
    try {
      if (!req.file) {
        return res.status(400).json({ 
          error: "No file provided",
          userMessage: "Please select a file to upload.",
          suggestions: ["Choose a PDF, image, or Word document"]
        });
      }

      const { buffer, originalname, mimetype } = req.file;
      
      const extracted = await extractTextFromBuffer(buffer, mimetype, originalname);
      
      if (!extracted.text || extracted.text.trim().length < 10) {
        return res.status(400).json({ 
          error: "Could not extract meaningful text from this document",
          userMessage: "This file doesn't seem to have readable text.",
          suggestions: ["Try a different file", "Make sure the document contains text"]
        });
      }

      const processingTimeMs = Date.now() - startTime;

      const docRecord = await storage.createImportedDocument({
        userId: req.session.userId!,
        fileName: originalname,
        fileType: mimetype,
        rawText: extracted.text,
        status: "pending",
        extractionMethod: extracted.extractionMethod,
        ocrConfidence: extracted.ocrConfidence,
        processingTimeMs,
      });

      res.json({ 
        documentId: docRecord.id,
        fileName: originalname,
        textLength: extracted.text.length,
        metadata: extracted.metadata,
        extractionMethod: extracted.extractionMethod,
        ocrConfidence: extracted.ocrConfidence,
        ocrWarning: extracted.ocrWarning,
        processingTimeMs,
        message: "Document uploaded. Ready for analysis."
      });
    } catch (error) {
      console.error("Document upload error:", error);
      
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

  app.post("/api/documents/:id/analyze", requireAuth, async (req, res) => {
    try {
      const docId = req.params.id;
      const doc = await storage.getImportedDocument(docId);
      
      if (!doc || doc.userId !== req.session.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (!doc.rawText) {
        return res.status(400).json({ error: "Document has no text content" });
      }

      // Generate analysis prompt and call AI
      const analysisPrompt = generateDocumentAnalysisPrompt(doc.rawText);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a document analysis AI that extracts structured data. Always respond with valid JSON only." },
          { role: "user", content: analysisPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
      let analysisResult: DocumentAnalysisResult | null = null;
      
      try {
        const parsed = JSON.parse(responseText);
        analysisResult = validateAnalysisResult(parsed);
      } catch {
        console.error("Failed to parse AI response:", responseText);
      }

      if (!analysisResult) {
        return res.status(500).json({ error: "Failed to analyze document structure" });
      }

      const primaryCategory = analysisResult.primaryCategory || detectPrimaryCategory(analysisResult.items);
      
      await storage.updateImportedDocument(docId, {
        analysisJson: analysisResult as unknown as Record<string, unknown>,
        documentTitle: analysisResult.documentTitle,
        summary: analysisResult.summary,
        confidence: analysisResult.confidence,
        primaryCategory,
        status: "analyzed",
      });

      await storage.createImportedDocumentItems(
        analysisResult.items.map((item) => ({
          documentId: docId,
          itemType: item.itemType,
          title: item.title,
          description: item.description,
          details: item.details,
          destinationSystem: item.destinationSystem,
          confidence: item.confidence,
          isSelected: item.isSelected,
        }))
      );

      const previewRoute = getPreviewRoute(primaryCategory);

      res.json({
        documentId: docId,
        analysis: analysisResult,
        primaryCategory,
        previewRoute,
        message: "Document analyzed. Review the items before saving."
      });
    } catch (error) {
      console.error("Document analysis error:", error);
      res.status(500).json({ 
        error: "ANALYSIS_FAILED",
        userMessage: "We couldn't analyze this document.",
        suggestions: ["Try uploading a clearer document", "Make sure the content is readable"],
        isRecoverable: true,
      });
    }
  });

  function getPreviewRoute(category: string): string {
    switch (category) {
      case "meals": return "/meals?import=pending";
      case "workouts": return "/workout?import=pending";
      case "routines": return "/routines?import=pending";
      case "calendar": return "/calendar?import=pending";
      default: return "/import/preview";
    }
  }

  app.get("/api/documents/:id", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getImportedDocument(req.params.id);
      if (!doc || doc.userId !== req.session.userId) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      const items = await storage.getImportedDocumentItems(req.params.id);
      
      res.json({
        document: doc,
        items,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to load document" });
    }
  });

  app.patch("/api/documents/:id/items", requireAuth, async (req, res) => {
    try {
      const { items } = req.body as { items: Array<{ id: string; title?: string; isSelected?: boolean; destinationSystem?: string }> };
      
      const doc = await storage.getImportedDocument(req.params.id);
      if (!doc || doc.userId !== req.session.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      for (const item of items) {
        await storage.updateImportedDocumentItem(item.id, {
          title: item.title,
          isSelected: item.isSelected,
          destinationSystem: item.destinationSystem,
        });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update items" });
    }
  });

  app.post("/api/documents/:id/commit", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getImportedDocument(req.params.id);
      if (!doc || doc.userId !== req.session.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      const items = await storage.getImportedDocumentItems(req.params.id);
      const selectedItems = items.filter(item => item.isSelected);
      
      const committed: Array<{ itemId: string; entityType: string; entityId: string }> = [];

      // Pre-create parent plans if we have grouped items
      const workoutItems = selectedItems.filter(item => item.destinationSystem === "workout");
      const mealItems = selectedItems.filter(item => item.destinationSystem === "nutrition");
      
      let workoutPlanId: string | undefined;
      let mealPlanId: string | undefined;
      
      // Create a workout plan if we have workout items
      if (workoutItems.length > 0) {
        const workoutPlan = await storage.createWorkoutPlan({
          userId: req.session.userId!,
          title: doc.documentTitle || "Imported Workout Plan",
          summary: doc.summary || undefined,
          source: "import",
          importedDocumentId: doc.id,
          isActive: true,
        });
        workoutPlanId = workoutPlan.id;
      }
      
      // Create a meal plan if we have meal items
      if (mealItems.length > 0) {
        const mealPlan = await storage.createMealPlan({
          userId: req.session.userId!,
          title: doc.documentTitle || "Imported Meal Plan",
          summary: doc.summary || undefined,
          source: "import",
          importedDocumentId: doc.id,
          isActive: true,
        });
        mealPlanId = mealPlan.id;
      }

      for (const item of selectedItems) {
        let entityId: string | undefined;
        let entityType: string = item.destinationSystem || "";

        // Create entities based on destination system
        if (item.destinationSystem === "calendar") {
          const details = item.details as { date?: string; startTime?: string; endTime?: string; isRecurring?: boolean };
          const event = await storage.createCalendarEvent({
            userId: req.session.userId!,
            title: item.title,
            description: item.description || "",
            startTime: details.startTime || "09:00",
            endTime: details.endTime || "10:00",
            eventType: "imported",
            isRecurring: details.isRecurring || false,
          });
          entityId = event.id;
          entityType = "calendar";
        } else if (item.destinationSystem === "routines") {
          const details = item.details as { steps?: Array<{ title: string; instructions?: string; duration?: number }> };
          const routine = await storage.createRoutine({
            userId: req.session.userId!,
            name: item.title,
            dimensionTags: [],
            steps: details.steps || [{ title: item.title, instructions: item.description || "" }],
            totalDurationMinutes: 30,
            scheduleOptions: {},
            mode: "instructions",
            isActive: true,
          });
          entityId = routine.id;
          entityType = "routine";
        }
        else if (item.destinationSystem === "nutrition") {
          const details = item.details as { mealType?: string; weekLabel?: string; ingredients?: string[]; instructions?: string[]; tags?: string[] };
          const meal = await storage.createMeal({
            userId: req.session.userId!,
            mealPlanId: mealPlanId,
            title: item.title,
            mealType: details.mealType || "other",
            weekLabel: details.weekLabel,
            notes: item.description || undefined,
            ingredients: details.ingredients,
            instructions: details.instructions,
            tags: details.tags,
          });
          entityId = meal.id;
          entityType = "meal";
        }
        else if (item.destinationSystem === "workout") {
          const details = item.details as { exerciseType?: string; dayLabel?: string; sets?: string; reps?: string; duration?: string; equipment?: string[]; instructions?: string[]; tags?: string[] };
          const exercise = await storage.createExercise({
            userId: req.session.userId!,
            workoutPlanId: workoutPlanId,
            title: item.title,
            exerciseType: details.exerciseType || "other",
            dayLabel: details.dayLabel,
            notes: item.description || undefined,
            sets: details.sets,
            reps: details.reps,
            duration: details.duration,
            equipment: details.equipment,
            instructions: details.instructions,
            tags: details.tags,
          });
          entityId = exercise.id;
          entityType = "exercise";
        }

        if (entityId) {
          await storage.updateImportedDocumentItem(item.id, {
            linkedEntityId: entityId,
            linkedEntityType: entityType,
          });
          committed.push({ itemId: item.id, entityType, entityId });
        }
      }

      // Update document status
      await storage.updateImportedDocument(req.params.id, {
        status: "saved",
      });

      res.json({
        success: true,
        committed,
        workoutPlanId,
        mealPlanId,
        message: `Saved ${committed.length} items to your systems.`
      });
    } catch (error) {
      console.error("Document commit error:", error);
      res.status(500).json({ error: "Failed to save items" });
    }
  });

  app.get("/api/documents", requireAuth, async (req, res) => {
    try {
      const docs = await storage.getImportedDocuments(req.session.userId!);
      res.json(docs);
    } catch (error) {
      res.status(500).json({ error: "Failed to load documents" });
    }
  });

  // Wave 4: Meal Plan Import Endpoints
}
