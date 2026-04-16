import type { Express } from "express";



export function registerLocalResourcesRoutes(app: Express): void {
  app.post("/api/local-resources/search", async (req, res) => {
    try {
      const { query } = req.body;
      
      // Validate query
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      // Limit query length for safety
      const sanitizedQuery = query.trim().slice(0, 200);

      const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
      
      if (!perplexityApiKey) {
        // Fallback to mock data if no API key
        const mockResources = [
          {
            title: "Local Wellness Center",
            description: `Results for "${sanitizedQuery}" - A comprehensive wellness center offering various services to support your health journey.`,
            category: "Wellness",
            rating: 4.5,
            address: "123 Main St",
            aiSuggested: true,
            aiReason: "This matches your search and has great reviews",
          },
          {
            title: "Community Fitness Studio",
            description: "Group classes, personal training, and wellness programs for all fitness levels.",
            category: "Fitness",
            rating: 4.3,
            address: "456 Oak Ave",
          },
          {
            title: "Mindful Living Center",
            description: "Meditation, yoga, and stress management programs in a peaceful environment.",
            category: "Mental Health",
            rating: 4.7,
            address: "789 Peace Blvd",
            aiSuggested: true,
            aiReason: "Highly rated for stress relief and mindfulness",
          },
        ];
        return res.json({ resources: mockResources });
      }

      // Call Perplexity API for web search
      const response = await fetch("https://api.perplexity.ai/chat/completions", { signal: AbortSignal.timeout(25000),
        method: "POST",
        headers: {
          "Authorization": `Bearer ${perplexityApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            {
              role: "system",
              content: `You are a helpful local resource finder. When the user searches for something, find relevant local businesses, services, or resources. 
              
Return your response as a JSON array with objects containing these fields:
- title: Business/resource name
- description: Brief description of services
- category: Type of business (e.g., "Gym", "Therapist", "Restaurant", "Yoga Studio")
- rating: Numeric rating if available (1-5)
- address: Address if available
- phone: Phone number if available
- website: Website URL if available
- aiSuggested: true if this is a top recommendation
- aiReason: Brief reason why this is recommended (only for aiSuggested items)

Return ONLY the JSON array, no other text. Return 3-5 relevant results.`
            },
            {
              role: "user",
              content: `Find local resources for: ${sanitizedQuery}`
            }
          ],
          temperature: 0.2,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        console.error("Perplexity API error:", response.status, await response.text());
        return res.status(500).json({ error: "Failed to search resources" });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "[]";
      
      // Try to parse the JSON response
      interface LocalResource {
        title: string;
        description: string;
        category: string;
        rating?: number;
        address?: string;
        phone?: string;
        website?: string;
        aiSuggested: boolean;
        aiReason?: string;
      }
      let resources: LocalResource[] = [];
      try {
        // Clean up the response - remove markdown code blocks if present
        let cleanContent = content.trim();
        if (cleanContent.startsWith("```json")) {
          cleanContent = cleanContent.slice(7);
        }
        if (cleanContent.startsWith("```")) {
          cleanContent = cleanContent.slice(3);
        }
        if (cleanContent.endsWith("```")) {
          cleanContent = cleanContent.slice(0, -3);
        }
        const parsed = JSON.parse(cleanContent.trim());
        // Validate that it's an array and each item has required fields
        if (Array.isArray(parsed)) {
          resources = parsed
            .filter((item: any) => item && typeof item === "object" && item.title && item.description)
            .map((item: any) => ({
              title: String(item.title || "").slice(0, 200),
              description: String(item.description || "").slice(0, 500),
              category: String(item.category || "General").slice(0, 50),
              rating: typeof item.rating === "number" ? Math.min(Math.max(item.rating, 0), 5) : undefined,
              address: item.address ? String(item.address).slice(0, 200) : undefined,
              phone: item.phone ? String(item.phone).slice(0, 30) : undefined,
              website: item.website ? String(item.website).slice(0, 300) : undefined,
              aiSuggested: Boolean(item.aiSuggested),
              aiReason: item.aiReason ? String(item.aiReason).slice(0, 200) : undefined,
            }));
        }
      } catch (parseError) {
        console.error("Failed to parse Perplexity response:", parseError);
        // Return empty array if parsing fails
        resources = [];
      }

      res.json({ 
        resources,
        citations: data.citations || [],
      });
    } catch (error) {
      console.error("Local resources search error:", error);
      res.status(500).json({ error: "Failed to search resources" });
    }
  });

  // ===== ADMIN ANALYTICS ROUTES =====
  
  // Check user role
}
