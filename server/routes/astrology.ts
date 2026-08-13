import type { Express } from "express";

import { storage } from "../storage";

import { requireAuth } from "./_shared";



import { calculateBirthChart, getChartSummary } from "../astrology";

export function registerAstrologyRoutes(app: Express): void {
  app.get("/api/astrology/chart", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const chart = await storage.getBirthChart(userId);
      if (!chart) {
        return res.status(404).json({ error: "No birth chart found" });
      }
      res.json(chart);
    } catch (error) {
      console.error("Get birth chart error:", error);
      res.status(500).json({ error: "Failed to get birth chart" });
    }
  });

  app.post("/api/astrology/chart", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const {
        birthDate,
        birthTime,
        birthPlace,
        birthCity,
        birthState,
        birthCountry,
        timezone,
        latitude,
        longitude,
        daylightSavings = false,
        zodiacSystem = "tropical",
        houseSystem = "placidus"
      } = req.body;

      // Only the birth date is truly required; everything else refines the
      // chart. This matches the client's quick-add flow where time/place are
      // optional.
      if (!birthDate || typeof birthDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
        return res.status(400).json({ error: "A valid birth date (YYYY-MM-DD) is required" });
      }
      if (birthTime && !/^\d{1,2}:\d{2}/.test(String(birthTime))) {
        return res.status(400).json({ error: "Birth time must be in HH:MM format" });
      }

      // Accept either structured city/country fields or a single free-text
      // "birthPlace" string (used by the quick-add sheet). If only birthPlace
      // is given, split on the last comma into city / country.
      let city = typeof birthCity === "string" ? birthCity.trim() : "";
      let country = typeof birthCountry === "string" ? birthCountry.trim() : "";
      if (!city && typeof birthPlace === "string" && birthPlace.trim()) {
        const parts = birthPlace.split(",").map((p: string) => p.trim()).filter(Boolean);
        city = parts.slice(0, -1).join(", ") || parts[0] || "";
        country = parts.length > 1 ? parts[parts.length - 1] : country;
      }

      // Without a birth time, calculate from solar noon so date-dependent
      // placements (sun, moon, etc.) are still reasonable.
      const timeForCalc = birthTime || "12:00";

      // Never silently default coordinates to a specific city. When no
      // coordinates are known, use 0,0 — location-sensitive angles
      // (ascendant/MC) will be approximate either way without a real place.
      const lat = typeof latitude === "number" && Number.isFinite(latitude) ? latitude : 0;
      const lng = typeof longitude === "number" && Number.isFinite(longitude) ? longitude : 0;

      const calculatedChart = calculateBirthChart(
        birthDate,
        timeForCalc,
        lat,
        lng,
        zodiacSystem,
        houseSystem
      );

      const chartData = {
        userId,
        birthDate,
        birthTime: birthTime || "",
        birthCity: city,
        birthState: (typeof birthState === "string" && birthState.trim()) || null,
        birthCountry: country,
        timezone: (typeof timezone === "string" && timezone.trim()) || "",
        daylightSavings,
        zodiacSystem,
        houseSystem,
        placements: calculatedChart.placements,
        aspects: calculatedChart.aspects,
        interpretations: calculatedChart.interpretations,
      };

      const existing = await storage.getBirthChart(userId);
      let chart;
      if (existing) {
        chart = await storage.updateBirthChart(userId, chartData);
      } else {
        chart = await storage.createBirthChart(chartData);
      }

      res.json({
        chart,
        summary: getChartSummary(calculatedChart),
      });
    } catch (error) {
      console.error("Save birth chart error:", error);
      res.status(500).json({ error: "Failed to save birth chart" });
    }
  });

  app.post("/api/astrology/calculate", async (req, res) => {
    try {
      const { 
        birthDate, 
        birthTime, 
        latitude = 40.7128, 
        longitude = -74.0060,
        zodiacSystem = "tropical",
        houseSystem = "placidus"
      } = req.body;

      if (!birthDate || !birthTime) {
        return res.status(400).json({ error: "Birth date and time required" });
      }

      const calculatedChart = calculateBirthChart(
        birthDate,
        birthTime,
        latitude,
        longitude,
        zodiacSystem,
        houseSystem
      );

      res.json({
        ...calculatedChart,
        summary: getChartSummary(calculatedChart),
      });
    } catch (error) {
      console.error("Calculate chart error:", error);
      res.status(500).json({ error: "Failed to calculate chart" });
    }
  });

  // Local Resources Search using Perplexity API
}
