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

      if (!birthDate || !birthTime || !birthCity || !birthCountry || !timezone) {
        return res.status(400).json({ error: "Missing required birth data" });
      }

      const lat = latitude || 40.7128;
      const lng = longitude || -74.0060;

      const calculatedChart = calculateBirthChart(
        birthDate,
        birthTime,
        lat,
        lng,
        zodiacSystem,
        houseSystem
      );

      const chartData = {
        userId,
        birthDate,
        birthTime,
        birthCity,
        birthState: birthState || null,
        birthCountry,
        timezone,
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
