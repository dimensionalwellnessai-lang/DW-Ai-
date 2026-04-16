import type { Express } from "express";

import { generateContextualSearch, generateIngredientSubstitutes, generateCookSessionRecipe, openai, type SearchCategory } from "../openai";



export function registerHelpersRoutes(app: Express): void {
  app.post("/api/search", async (req, res) => {
    try {
      const { query, category, limit, excludedIngredients, includeSubstitutes } = req.body;
      
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      const validCategories: SearchCategory[] = ["meals", "workouts", "recovery", "spiritual", "community"];
      if (!category || !validCategories.includes(category)) {
        return res.status(400).json({ error: "Valid category is required: meals, workouts, recovery, spiritual, or community" });
      }
      
      const searchLimit = Math.min(Math.max(limit || 5, 1), 10);
      const excluded = Array.isArray(excludedIngredients) ? excludedIngredients : [];
      const results = await generateContextualSearch(query, category, searchLimit, excluded, includeSubstitutes === true);
      
      res.json(results);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Search failed" });
    }
  });

  // AI-powered ingredient substitutes endpoint
  app.post("/api/ingredient-substitutes", async (req, res) => {
    try {
      const { ingredient, context, excludedIngredients } = req.body;
      
      if (!ingredient || typeof ingredient !== "string") {
        return res.status(400).json({ error: "Ingredient is required" });
      }
      
      const excluded = Array.isArray(excludedIngredients) ? excludedIngredients : [];
      const results = await generateIngredientSubstitutes(ingredient, context, excluded);
      
      res.json(results);
    } catch (error) {
      console.error("Ingredient substitutes error:", error);
      res.status(500).json({ error: "Failed to generate substitutes" });
    }
  });

  // Generalized alternatives endpoint for all domains
  app.post("/api/alternatives", async (req, res) => {
    try {
      const { domain, item, context, excludedItems, constraints } = req.body;
      
      if (!item || typeof item !== "string") {
        return res.status(400).json({ error: "Item is required" });
      }
      
      const validDomains = ["meals", "workouts", "recovery", "spiritual", "community"];
      if (!domain || !validDomains.includes(domain)) {
        return res.status(400).json({ error: "Valid domain is required: meals, workouts, recovery, spiritual, or community" });
      }
      
      const excluded = Array.isArray(excludedItems) ? excludedItems : [];
      const userConstraints = Array.isArray(constraints) ? constraints : [];
      
      const { generateDomainAlternatives } = await import("../openai");
      const results = await generateDomainAlternatives(domain, item, context, excluded, userConstraints);
      
      res.json(results);
    } catch (error) {
      console.error("Alternatives error:", error);
      res.status(500).json({ error: "Failed to generate alternatives" });
    }
  });

  // Guided CookSession recipe generation
  app.post("/api/ai/cook-session", async (req, res) => {
    try {
      const { query, preferences, mode } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "query is required" });
      }
      if (query.length > 300) {
        return res.status(400).json({ error: "query must be 300 characters or fewer" });
      }
      const validModes = ["lightweight", "full"];
      const sessionMode = validModes.includes(mode) ? mode : "full";

      // Normalize preferences to avoid runtime errors from malformed input
      const rawPreferences = preferences && typeof preferences === "object" ? preferences : {};
      const normalizeStringArray = (value: unknown): string[] => {
        if (!Array.isArray(value)) return [];
        return (value as unknown[])
          .filter((v): v is string => typeof v === "string")
          .map((v) => v.trim())
          .filter((v) => v.length > 0);
      };
      const prefsRecord = rawPreferences as Record<string, unknown>;
      const normalizeValues = (value: unknown): string[] => {
        if (Array.isArray(value)) {
          return normalizeStringArray(value);
        }
        if (typeof value === "string") {
          const trimmed = value.trim();
          return trimmed.length > 0 ? [trimmed] : [];
        }
        return [];
      };
      const dietaryStyle =
        typeof prefsRecord.dietaryStyle === "string"
          ? prefsRecord.dietaryStyle.trim() || undefined
          : undefined;
      const sanitizedPreferences = {
        ...prefsRecord,
        restrictions: normalizeStringArray(prefsRecord.restrictions),
        allergies: normalizeStringArray(prefsRecord.allergies),
        bannedIngredients: normalizeStringArray(prefsRecord.bannedIngredients),
        dietaryStyle,
        values: normalizeValues(prefsRecord.values),
      };

      const recipe = await generateCookSessionRecipe(query, sanitizedPreferences, sessionMode);
      res.json(recipe);
    } catch (error) {
      console.error("Cook session generation error:", error);
      res.status(500).json({ error: "Failed to generate cook session recipe" });
    }
  });

}
