import type { Express } from "express";
import type { Response } from "express";

import { eq } from "drizzle-orm";
import { storage } from "../storage";
import { pool } from "../db";
import { db } from "../db";

import { requireAuth } from "./_shared";

import { openai } from "../openai";

import { communityPosts, communityPostLikes, communityGroups, communityGroupMembers } from "@shared/schema";

export function registerCommunityRoutes(app: Express): void {
  app.get("/api/community/engage", async (req, res) => {
    try {
      const location = (req.query.location as string) || "my area";
      const type = (req.query.type as string) || "all";
      const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
      const typeFilter = type === "volunteering" ? "volunteering opportunities" :
        type === "events" ? "community events" :
        type === "service" ? "community service" :
        "volunteering, community events, and service opportunities";
      const prompt = `Search the web and find 6-8 real ${typeFilter} in or near ${location}. Include real organizations, events, or programs with actual websites where possible.

Return ONLY this JSON:
{"opportunities":[{"id":"e1","title":"Opportunity name","organization":"Org name","description":"2 sentences about what it is and who can participate","type":"volunteering or event or service or resource","location":"${location}","schedule":"When/how often (e.g. Saturdays 9am, ongoing, one-time)","url":"https://real.url.if.available or null","tags":["wellness","community","etc"],"isVirtual":false}]}`;

      let opportunities: any[] = [];
      if (perplexityApiKey) {
        try {
          const pxRes = await fetch("https://api.perplexity.ai/chat/completions", { signal: AbortSignal.timeout(25000),
            method: "POST",
            headers: { "Authorization": `Bearer ${perplexityApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "llama-3.1-sonar-large-128k-online",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.2, max_tokens: 2000,
            }),
          });
          if (pxRes.ok) {
            const pxData = await pxRes.json();
            let raw = (pxData.choices?.[0]?.message?.content || "").trim();
            if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
            const si = raw.indexOf("{"); const ei = raw.lastIndexOf("}");
            if (si !== -1 && ei !== -1) opportunities = JSON.parse(raw.substring(si, ei + 1)).opportunities || [];
          }
        } catch { /* non-fatal */ }
      }
      res.json({ opportunities, location });
    } catch (error) {
      console.error("community/engage error:", error);
      res.status(500).json({ opportunities: [], location: "" });
    }
  });

  // ── Community: Local groups/meetups by location ─────────────────────────────
  app.get("/api/community/groups/local", async (req, res) => {
    try {
      const location = (req.query.location as string) || "my area";
      const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
      const prompt = `Search for real physical community groups, clubs, or meetups in or near ${location}. Look for wellness, fitness, social, hobby, book clubs, running clubs, yoga groups, mental health support groups, etc. Find real groups with actual websites.

Return ONLY this JSON:
{"groups":[{"id":"g1","name":"Group name","description":"What the group is about and who it's for","category":"fitness or wellness or social or learning or support","location":"${location}","schedule":"Meeting frequency/time","url":"https://real.url.if.known or null","membersEstimate":"e.g. 50+ members or unknown"}]}`;

      let groups: any[] = [];
      if (perplexityApiKey) {
        try {
          const pxRes = await fetch("https://api.perplexity.ai/chat/completions", { signal: AbortSignal.timeout(25000),
            method: "POST",
            headers: { "Authorization": `Bearer ${perplexityApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "llama-3.1-sonar-large-128k-online",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.2, max_tokens: 1800,
            }),
          });
          if (pxRes.ok) {
            const pxData = await pxRes.json();
            let raw = (pxData.choices?.[0]?.message?.content || "").trim();
            if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
            const si = raw.indexOf("{"); const ei = raw.lastIndexOf("}");
            if (si !== -1 && ei !== -1) groups = JSON.parse(raw.substring(si, ei + 1)).groups || [];
          }
        } catch { /* non-fatal */ }
      }
      res.json({ groups, location });
    } catch (error) {
      console.error("community/groups/local error:", error);
      res.status(500).json({ groups: [], location: "" });
    }
  });

  // ── Community: In-app groups (CRUD) ─────────────────────────────────────────
  app.get("/api/community/groups/online", async (req, res) => {
    try {
      const rows = await db.select().from(communityGroups).orderBy(communityGroups.createdAt);
      const userId = req.session?.userId;
      let memberGroupIds: Set<string> = new Set();
      if (userId) {
        const memberships = await db.select().from(communityGroupMembers).where(eq(communityGroupMembers.userId, userId));
        memberGroupIds = new Set(memberships.map((m) => m.groupId));
      }
      const result = rows.map((g) => ({ ...g, isMember: memberGroupIds.has(g.id) }));
      res.json({ groups: result });
    } catch (error) {
      console.error("community/groups/online GET error:", error);
      res.status(500).json({ groups: [] });
    }
  });

  app.post("/api/community/groups", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { name, description, type, location, meetingUrl, meetingSchedule, tags } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: "Group name is required" });
      const [group] = await db.insert(communityGroups).values({
        createdByUserId: userId,
        name: name.trim(),
        description: description?.trim() || null,
        type: type || "online_chat",
        location: location?.trim() || null,
        meetingUrl: meetingUrl?.trim() || null,
        meetingSchedule: meetingSchedule?.trim() || null,
        tags: tags || [],
        membersCount: 1,
        isPublic: true,
      }).returning();
      await db.insert(communityGroupMembers).values({ groupId: group.id, userId }).onConflictDoNothing();
      res.json(group);
    } catch (error) {
      console.error("POST /api/community/groups error:", error);
      res.status(500).json({ error: "Failed to create group" });
    }
  });

  app.post("/api/community/groups/:id/join", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const groupId = req.params.id;
      await pool.query(
        "INSERT INTO community_group_members (id, group_id, user_id) VALUES (gen_random_uuid(), $1, $2) ON CONFLICT (group_id, user_id) DO NOTHING",
        [groupId, userId]
      );
      await pool.query("UPDATE community_groups SET members_count = (SELECT COUNT(*) FROM community_group_members WHERE group_id = $1) WHERE id = $1", [groupId]);
      res.json({ joined: true });
    } catch (error) {
      console.error("POST /api/community/groups/:id/join error:", error);
      res.status(500).json({ error: "Failed to join group" });
    }
  });

  app.delete("/api/community/groups/:id/leave", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const groupId = req.params.id;
      await pool.query("DELETE FROM community_group_members WHERE group_id = $1 AND user_id = $2", [groupId, userId]);
      await pool.query("UPDATE community_groups SET members_count = GREATEST(members_count - 1, 0) WHERE id = $1", [groupId]);
      res.json({ left: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to leave group" });
    }
  });

  // ── Community: Posts / Group Chat ─────────────────────────────────────────────
  app.get("/api/community/posts", async (req, res) => {
    try {
      const groupId = req.query.groupId as string | undefined;
      const category = req.query.category as string | undefined;
      const userId = req.session?.userId;

      let rows = await db.select().from(communityPosts).orderBy(communityPosts.createdAt);
      // Filter by group
      if (groupId) rows = rows.filter((p) => p.groupId === groupId);
      // Filter to top-level posts only (replies are nested below)
      const topLevel = rows.filter((p) => !p.parentId);
      const replies = rows.filter((p) => !!p.parentId);
      // Apply category filter only on user posts
      const filtered = category && category !== "all"
        ? topLevel.filter((p) => p.category === category)
        : topLevel;

      let likedPostIds: Set<string> = new Set();
      if (userId) {
        const likes = await db.select().from(communityPostLikes).where(eq(communityPostLikes.userId, userId));
        likedPostIds = new Set(likes.map((l) => l.postId));
      }

      // Build reply map: parentId → replies array
      const replyMap: Record<string, any[]> = {};
      for (const r of replies) {
        if (!r.parentId) continue;
        if (!replyMap[r.parentId]) replyMap[r.parentId] = [];
        replyMap[r.parentId].push({ ...r, isLiked: likedPostIds.has(r.id) });
      }

      const result = filtered.reverse().map((p) => ({
        ...p,
        isLiked: likedPostIds.has(p.id),
        displayName: p.isAnonymous ? "Anonymous" : "Community Member",
        replies: replyMap[p.id] || [],
      }));
      res.json({ posts: result });
    } catch (error) {
      console.error("GET /api/community/posts error:", error);
      res.status(500).json({ posts: [] });
    }
  });

  app.post("/api/community/posts", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { title, body, category, isAnonymous, groupId } = req.body;
      if (!title?.trim() || !body?.trim()) return res.status(400).json({ error: "Title and body are required" });

      const [post] = await db.insert(communityPosts).values({
        userId,
        groupId: groupId || null,
        title: title.trim(),
        body: body.trim(),
        category: category || "general",
        isAnonymous: isAnonymous ?? false,
        isDwResponse: false,
      }).returning();

      res.json(post);

      // Generate DW AI response asynchronously (don't block the response)
      if (groupId) {
        try {
          // Get group context
          const groupRows = await pool.query("SELECT name, description, tags FROM community_groups WHERE id = $1", [groupId]);
          const group = groupRows.rows[0];
          // Get user context for personalization
          let userCtx = "";
          try {
            const [profile, onboarding] = await Promise.all([
              storage.getUserProfile(userId),
              storage.getOnboardingProfile(userId),
            ]);
            const firstName = profile?.firstName || "friend";
            userCtx = `The person who shared this: name is ${firstName}.`;
          } catch { /* non-fatal */ }

          const groupCtx = group ? `This is the "${group.name}" support group — ${group.description}` : "a wellness support group";

          const dwPrompt = `You are DW — a warm, emotionally intelligent AI companion facilitating a support group. ${groupCtx}.

${userCtx}

A community member just shared this post:
Title: "${title}"
Message: "${body}"

Write a brief, warm, supportive response (2-4 sentences max). 
- Acknowledge what they shared with genuine empathy
- Offer one gentle reflection, insight, or question to help them go deeper
- Never give medical advice or diagnose
- Tone: calm, caring, human — like a wise friend who truly listens
- Do NOT start with "DW here" or "As DW" — just speak naturally
- Do NOT use bullet points or headers

Response:`;

          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: dwPrompt }],
            temperature: 0.8,
            max_tokens: 250,
          });

          const dwBody = completion.choices[0]?.message?.content?.trim() ?? "";
          if (dwBody) {
            await db.insert(communityPosts).values({
              userId: "dw-ai-system",
              groupId: groupId || null,
              parentId: post.id,
              isDwResponse: true,
              title: "DW Response",
              body: dwBody,
              category: "support",
              isAnonymous: false,
            });
            // Update comments count
            await pool.query("UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = $1", [post.id]);
          }
        } catch (aiErr) {
          console.error("DW response generation error:", aiErr);
        }
      }
    } catch (error) {
      console.error("POST /api/community/posts error:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  app.post("/api/community/posts/:id/like", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const postId = req.params.id;
      const existing = await db.select().from(communityPostLikes).where(eq(communityPostLikes.postId, postId));
      const alreadyLiked = existing.some((l) => l.userId === userId);
      if (alreadyLiked) {
        await db.delete(communityPostLikes).where(eq(communityPostLikes.postId, postId));
        await pool.query("UPDATE community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1", [postId]);
        res.json({ liked: false });
      } else {
        await db.insert(communityPostLikes).values({ postId, userId }).onConflictDoNothing();
        await pool.query("UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = $1", [postId]);
        res.json({ liked: true });
      }
    } catch (error) {
      console.error("POST /api/community/posts/:id/like error:", error);
      res.status(500).json({ error: "Failed to like post" });
    }
  });

  // ── DISCOVER FEED STATIC LIBRARY ────────────────────────────────────────────
  // Rich curated fallback content when AI is unavailable
  const DISCOVER_STATIC_LIBRARY = [
    // ── FOR YOU ──
    { type: "article", bucket: "for_you", title: "The 5-Minute Morning Reset That Changes Everything", summary: "A simple ritual used by top performers to start every day with intention rather than reaction.", synopsis: "Most people start their day by reaching for their phone. This simple reset takes just 5 minutes and rewires your morning for focus and calm. It involves three breaths, one intention, and one thing you're grateful for — nothing more. Over time, this micro-habit compounds into a life that feels authored, not accidental.", dwConnection: "Starting the day with intention directly nurtures your emotional and mental wellness dimensions.", url: "https://www.healthline.com/health/morning-routine", source: "Healthline", dimension: "emotional", readTime: "4 min read" },
    { type: "video", bucket: "for_you", title: "Andrew Huberman: The Science of a Perfect Morning", summary: "Stanford neuroscientist explains exactly what to do in the first 60 minutes after waking up.", synopsis: "Dr. Andrew Huberman walks through the neuroscience of morning light, cortisol timing, and how your first hour sets your dopamine baseline for the entire day. He explains why viewing natural light within 30 minutes of waking is the single most powerful biological lever available to you. This video changed the morning routines of millions.", dwConnection: "Understanding your biology is the foundation of sustainable physical and emotional wellness.", url: "https://www.youtube.com/watch?v=gR_f-iwUGY4", source: "YouTube", dimension: "physical", readTime: "Watch" },
    { type: "article", bucket: "for_you", title: "How to Build Habits That Actually Stick", summary: "James Clear's framework from Atomic Habits: why tiny changes create remarkable results.", synopsis: "Most people try to change too much at once. James Clear's research shows that 1% improvement, done consistently, leads to 37x improvement over a year. The key insight: don't set goals, design systems. Every habit has a cue, craving, response, and reward — and you can engineer all four. This framework has been applied by millions worldwide.", dwConnection: "Building sustainable habits is the foundation of every wellness dimension you're working to improve.", url: "https://jamesclear.com/atomic-habits", source: "James Clear", dimension: "general", readTime: "8 min read" },
    { type: "article", bucket: "for_you", title: "The Hidden Cost of Never Saying No", summary: "Why boundaries aren't walls — they're the architecture of a life that actually belongs to you.", synopsis: "Research from Brené Brown and others shows that people who struggle with boundaries often suffer chronic depletion, resentment, and a sense that their life is happening to them rather than by them. Saying no to the wrong things is saying yes to the right ones. This piece walks through practical scripts and the psychological shift required to make boundaries feel natural.", dwConnection: "Healthy boundaries are the bedrock of emotional wellness and sustainable social connection.", url: "https://brenebrown.com/resources/", source: "Brené Brown", dimension: "emotional", readTime: "6 min read" },
    { type: "video", bucket: "for_you", title: "This Is Your Brain on Gratitude", summary: "Neuroscientist explains what happens in the brain when you practice gratitude — and why it works.", synopsis: "Dr. Rick Hanson breaks down how gratitude physically rewires your brain over time. The brain has a negativity bias baked in from evolution — gratitude practice counteracts this by strengthening neural pathways associated with positive emotion, social connection, and resilience. Even 30 seconds a day has measurable effects within weeks.", dwConnection: "A regular gratitude practice is one of the most evidence-based tools for emotional regulation.", url: "https://www.youtube.com/watch?v=JMd1CcGZYwU", source: "YouTube", dimension: "emotional", readTime: "Watch" },
    { type: "article", bucket: "for_you", title: "Money Mindset: The Psychology Behind Financial Stress", summary: "Why your relationship with money is mostly emotional — and how to change it.", synopsis: "Financial therapists have found that most money problems aren't about math — they're about meaning. Our money scripts (beliefs formed in childhood) drive adult financial decisions unconsciously. Understanding and rewriting these scripts is the first step toward real financial peace. This article walks through three common money wounds and how to heal them.", dwConnection: "Your financial wellness dimension starts with self-awareness, not spreadsheets.", url: "https://www.psychologytoday.com/us/blog/financial-therapy", source: "Psychology Today", dimension: "financial", readTime: "7 min read" },
    { type: "article", bucket: "for_you", title: "Why Walking Is the Most Underrated Health Practice", summary: "Science keeps finding new benefits of daily walking — from brain health to longevity.", synopsis: "Walking 7,000–10,000 steps a day is associated with a 50–70% reduction in all-cause mortality risk. But beyond the cardiovascular benefits, walking is the only exercise that meaningfully reduces cortisol while simultaneously boosting creativity and mood. A 2019 Stanford study found that walking increased creative output by 81%. It's free, requires no gym, and works immediately.", dwConnection: "Movement is medicine — especially the kind that doesn't feel like medicine.", url: "https://www.health.harvard.edu/staying-healthy/5-surprising-benefits-of-walking", source: "Harvard Health", dimension: "physical", readTime: "5 min read" },
    { type: "video", bucket: "for_you", title: "Mel Robbins: How to Stop Screwing Yourself Over", summary: "One of the most-watched TED Talks ever — and the 5-second rule that changed millions of lives.", synopsis: "Mel Robbins discovered that the moment you feel resistance to doing something you know you should do, you have exactly 5 seconds before your brain talks you out of it. The 5-second rule is simple: count down 5-4-3-2-1 and physically move. It interrupts the habit loop and activates your prefrontal cortex. Simple, ridiculous, and it works.", dwConnection: "Taking action in the face of fear is the core of building momentum in any life dimension.", url: "https://www.youtube.com/watch?v=Lp7E973zozc", source: "YouTube", dimension: "general", readTime: "Watch" },
    // ── EXPLORE ──
    { type: "article", bucket: "explore", title: "The Japanese Art of Kintsugi: Beauty in Broken Things", summary: "The 500-year-old philosophy of repairing broken objects with gold — and what it teaches us about resilience.", synopsis: "Kintsugi, the Japanese art of repairing broken pottery with gold lacquer, is a profound metaphor for human resilience. Instead of hiding damage, kintsugi highlights it, treating breakage as part of the object's history rather than something to conceal. The philosophy behind it — wabi-sabi and mono no aware — suggests that imperfection is not just acceptable but beautiful. Psychologists have started using this concept in trauma therapy.", dwConnection: "Your breaks and scars are not weaknesses — they're where your light gets in. This is a deeply emotional and spiritual insight.", url: "https://en.wikipedia.org/wiki/Kintsugi", source: "Wikipedia", dimension: "spiritual", readTime: "5 min read" },
    { type: "article", bucket: "explore", title: "The Science of Flow: How to Enter Your Peak State", summary: "Mihaly Csikszentmihalyi's research on the state where time disappears and work becomes effortless.", synopsis: "Flow is the state of complete absorption where self-consciousness disappears and performance peaks. Psychologist Mihaly Csikszentmihalyi spent decades studying this state, interviewing artists, surgeons, chess players, and athletes. He found flow emerges when challenge slightly exceeds current skill level — not too easy (boredom), not too hard (anxiety). Learning to engineer flow conditions can transform any area of your life.", dwConnection: "Flow states are where your best work lives — and they're accessible in any dimension of your life.", url: "https://www.ted.com/talks/mihaly_csikszentmihalyi_flow_the_secret_to_happiness", source: "TED", dimension: "intellectual", readTime: "Watch" },
    { type: "article", bucket: "explore", title: "Forest Bathing: What the Japanese Have Known for Decades", summary: "Shinrin-yoku, the practice of spending time in forests, has extraordinary measurable health effects.", synopsis: "Japanese researchers have documented that spending time in forests reduces cortisol by 15%, blood pressure by 7%, and significantly boosts NK (natural killer) immune cells. These effects last 30 days after a single weekend in nature. The practice is called Shinrin-yoku — forest bathing — and it's now prescribed by some Japanese doctors. The key mechanism is phytoncides, organic compounds released by trees.", dwConnection: "Your environment shapes your biology. Environmental wellness isn't just about tidying your space — it's about what environments you choose.", url: "https://www.nationalgeographic.com/travel/article/forest-bathing", source: "National Geographic", dimension: "environmental", readTime: "6 min read" },
    { type: "article", bucket: "explore", title: "The Forgotten Science of Belonging", summary: "Loneliness is more dangerous than smoking 15 cigarettes a day. Here's what the research says.", synopsis: "Surgeon General Vivek Murthy declared loneliness an epidemic in 2023. The research is stark: chronic loneliness increases mortality risk by 26%, equivalent to smoking 15 cigarettes daily. Social connection isn't a nice-to-have — it's a biological necessity. Our nervous systems are literally calibrated to regulate via other humans. This article walks through the neuroscience of belonging and practical ways to build deeper connection.", dwConnection: "Social wellness is not about having many connections — it's about the quality of the ones you do have.", url: "https://www.hhs.gov/sites/default/files/surgeon-general-social-connection-advisory.pdf", source: "U.S. Surgeon General", dimension: "social", readTime: "8 min read" },
    { type: "video", bucket: "explore", title: "The Most Unknown Thing About How Memory Works", summary: "Every time you remember something, you rewrite it. Memory is reconstruction, not recording.", synopsis: "Memory researcher Elizabeth Loftus reveals one of the most counterintuitive findings in psychology: human memory is not a recording — it's a reconstruction. Every time you recall a memory, you subtly alter it. This means our memories of the past are partly fictional, edited by our present emotions and beliefs. The implications for identity, relationships, and self-improvement are profound.", dwConnection: "Understanding how your mind works is core to intellectual wellness and self-compassion.", url: "https://www.youtube.com/watch?v=PB2OegI6wvI", source: "YouTube", dimension: "intellectual", readTime: "Watch" },
    { type: "article", bucket: "explore", title: "Why Stoicism Is the Most Practical Philosophy Ever Written", summary: "Marcus Aurelius governed an empire while writing private notes to himself about not losing his mind.", synopsis: "The Stoics — Epictetus, Seneca, Marcus Aurelius — developed a philosophy for navigating chaos, loss, and uncertainty with equanimity. Epictetus was a slave. Marcus Aurelius was an emperor. Both concluded the same thing: the only thing you control is your response. Stoicism offers concrete daily practices (negative visualization, voluntary discomfort, memento mori) that train psychological resilience.", dwConnection: "Stoic practices directly build emotional regulation, resilience, and purposeful living.", url: "https://dailystoic.com/what-is-stoicism-a-definition-3-stoic-exercises-to-get-you-started/", source: "Daily Stoic", dimension: "spiritual", readTime: "7 min read" },
    { type: "article", bucket: "explore", title: "The Polyvagal Theory: Your Nervous System Is Running Your Life", summary: "Why you can't just 'think' your way out of anxiety — and what to do instead.", synopsis: "Dr. Stephen Porges' Polyvagal Theory explains that the autonomic nervous system has three states: safe and social, fight-or-flight, and shutdown. Most people shift between these states without knowing why. Once you understand your neuroception — how your nervous system reads safety — you can learn to regulate these states with specific somatic practices. This is the missing piece in most mental health conversations.", dwConnection: "Understanding your nervous system is foundational to emotional wellness and building safe, authentic relationships.", url: "https://www.nicabm.com/trauma-how-to-help-your-clients-understand-the-window-of-tolerance/", source: "NICABM", dimension: "emotional", readTime: "8 min read" },
    // ── RANDOM / SURPRISE ──
    { type: "fact", bucket: "random", title: "Cleopatra Lived Closer to the Moon Landing Than to the Building of the Pyramids", summary: "The Great Pyramid was built around 2560 BCE. Cleopatra lived in 69 BCE — 2,500 years later. The moon landing was 1969 CE — just 2,038 years after her. Time is genuinely strange.", synopsis: "The Great Pyramid of Giza was built around 2560 BCE. Cleopatra lived from 69–30 BCE — nearly 2,500 years after the pyramids. The Apollo 11 moon landing happened in 1969 CE, only 2,038 years after Cleopatra. This means she was temporally closer to Neil Armstrong's first step on the moon than to the pyramids she likely gazed upon as ancient history. History is not as evenly spaced as we imagine.", dwConnection: "Perspective is a superpower. When you zoom out on time, your current challenges find their proper proportion.", url: "", source: "Historical Research", dimension: "intellectual", readTime: "1 min" },
    { type: "quote", bucket: "random", title: "\"The cave you fear to enter holds the treasure you seek.\" — Joseph Campbell", summary: "Campbell spent his life studying mythology and found one story repeated across every culture: the hero's journey. The monster at the gate is always the guardian of the gift.", synopsis: "Joseph Campbell spent decades studying myths from every human culture and found a single pattern: the hero must descend into darkness, face their greatest fear, and only then return with the gift that heals their world. The cave metaphor is universal. Whatever you're avoiding — the difficult conversation, the creative risk, the vulnerable honesty — inside it is exactly what you need. The fear is the sign, not the warning.", dwConnection: "This applies to every dimension of your life. What are you circling around instead of entering?", url: "", source: "Joseph Campbell", dimension: "spiritual", readTime: "1 min" },
    { type: "spiritual", bucket: "random", title: "The Zen Teaching of 'Beginner's Mind'", summary: "In the beginner's mind there are many possibilities. In the expert's mind there are few. — Shunryu Suzuki", synopsis: "Shunryu Suzuki, the Zen master who brought Zen Buddhism to America, wrote: 'In the beginner's mind there are many possibilities. In the expert's mind there are few.' Beginner's mind means approaching each moment — a conversation, a meal, a problem — as if encountering it for the first time. The opposite is being so full of what you already know that nothing new can enter. Most of our suffering comes from insisting reality match our existing maps.", dwConnection: "Beginner's mind is the antidote to rigidity in any dimension — relationships, work, health habits, beliefs.", url: "", source: "Shunryu Suzuki, Zen Mind, Beginner's Mind", dimension: "spiritual", readTime: "1 min" },
    { type: "fact", bucket: "random", title: "Trees Communicate Through Underground Fungal Networks", summary: "Forests are not individual trees — they're communities. Mother trees send nutrients to young seedlings and dying trees redistribute resources to their neighbors.", synopsis: "Ecologist Suzanne Simard discovered that trees in forests are connected by vast underground fungal networks — sometimes called the 'Wood Wide Web.' Through these networks, older 'mother trees' send carbon, water, and nutrients to younger, struggling seedlings, including those of different species. When a tree is dying, it redistributes its resources to neighboring trees. Forests are not collections of individuals competing for resources — they're cooperative superorganisms.", dwConnection: "We are built for interdependence, not independence. This is true of trees, of neurons, and of human communities.", url: "https://www.youtube.com/watch?v=Un2yBgIAxYs", source: "TED Talk", dimension: "environmental", readTime: "1 min" },
    { type: "lesson", bucket: "random", title: "The 10-10-10 Rule for Hard Decisions", summary: "Ask yourself: how will I feel about this in 10 minutes? 10 months? 10 years? The answers usually make the right choice obvious.", synopsis: "Suzy Welch developed the 10-10-10 rule for cutting through the emotional fog of hard decisions. When facing a difficult choice, ask: How will I feel about this decision in 10 minutes? In 10 months? In 10 years? The short-term answer addresses immediate emotion. The medium-term grounds you in your season of life. The long-term connects you to your values. Most regrets live in the 10-year column — and so do most of the things that matter.", dwConnection: "Good decision-making is a foundational life skill that improves every dimension — relationships, career, health, money.", url: "", source: "Suzy Welch", dimension: "intellectual", readTime: "1 min" },
    { type: "spiritual", bucket: "random", title: "Viktor Frankl's Discovery in the Concentration Camp", summary: "Everything can be taken from a man but one thing: the last of the human freedoms — to choose one's attitude in any given set of circumstances.", synopsis: "Viktor Frankl, psychiatrist and Holocaust survivor, observed in Auschwitz that the prisoners who survived the longest were not the physically strongest — they were the ones who maintained a sense of meaning. He wrote: 'When we are no longer able to change a situation, we are challenged to change ourselves.' From his experience emerged logotherapy — the idea that meaning is the primary human motivational force, not pleasure or power.", dwConnection: "Meaning-making is not passive — it's an active, daily practice. This touches your purpose and spiritual dimensions profoundly.", url: "", source: "Viktor Frankl, Man's Search for Meaning", dimension: "purpose", readTime: "1 min" },
    { type: "fact", bucket: "random", title: "Your Body Replaces Almost Every Cell Every 7–10 Years", summary: "The 'you' of 10 years ago is physically almost entirely gone. You are always becoming, never just being.", synopsis: "Most of the cells in your body are replaced over time. Your red blood cells live 120 days. Liver cells: about a year. Bone cells: 10 years. Even neurons, long thought to be permanent, have some turnover. The implication is profound: you are not a fixed object but a continuous process. The 'you' who made a mistake 10 years ago is literally, atomically, not the same person. Transformation is not metaphorical — it's biological.", dwConnection: "You are built to change. Stagnation is the anomaly, not the norm. This truth belongs to your physical and emotional dimensions.", url: "", source: "Scientific Research", dimension: "physical", readTime: "1 min" },
    { type: "quote", bucket: "random", title: "\"The present moment always will have been.\" — Eckhart Tolle", summary: "Whatever good you experience right now is permanent in a way nothing can undo. It happened. It's real. Forever.", synopsis: "Eckhart Tolle offers a radical comfort: the present moment, once lived, is eternally woven into the fabric of what has happened. No future suffering can un-happen your joy. The kindness you gave, the peace you felt, the love you experienced — these are indestructible facts. This realization shifts our relationship with impermanence. We don't need to cling to good moments because they're already safe. They will always have been.", dwConnection: "This perspective is a profound gift for emotional wellness, especially during difficult seasons.", url: "", source: "Eckhart Tolle", dimension: "spiritual", readTime: "1 min" },
    { type: "lesson", bucket: "random", title: "The Ownership Paradox: Why Accepting Responsibility Feels Like Freedom", summary: "The moment you take full ownership of your situation is the moment you regain the power to change it.", synopsis: "Jocko Willink, in Extreme Ownership, argues that the most powerful shift available to any person is total personal responsibility. Not blame, not self-flagellation — ownership. When you own a problem completely, you also own the solution. This is counterintuitive: accepting that something is 'your fault' feels like losing, but it's actually the only path to agency. Victims wait. Owners act.", dwConnection: "Ownership thinking transforms every life dimension — from relationships to finances to health. It's not about blame. It's about power.", url: "", source: "Jocko Willink, Extreme Ownership", dimension: "purpose", readTime: "1 min" },
    { type: "fact", bucket: "random", title: "Humans Are the Only Animals That Voluntarily Delay Sleep", summary: "Every other species sleeps when it's tired. Only humans override this biological signal — and it's destroying our health.", synopsis: "Sleep scientist Matthew Walker calls voluntary sleep deprivation a catastrophic modern phenomenon. No other animal on earth voluntarily stays awake when its body signals sleep. Humans alone override this with artificial light, deadlines, and entertainment. The costs are staggering: impaired immunity, emotional dysregulation, cognitive decline, increased cancer risk, and reduced lifespan. Sleeping less to do more is, mathematically, doing less — because everything you do suffers.", dwConnection: "Sleep is the foundation. Without it, every other wellness habit is undermined. This belongs to your physical dimension.", url: "https://www.sleepfoundation.org/how-sleep-works/why-do-we-need-sleep", source: "Sleep Foundation", dimension: "physical", readTime: "1 min" },
  ];

  // ── DISCOVER FEED ──────────────────────────────────────────────────────────
  // GET /api/discover/feed?page=1
  // Returns a mixed batch of AI-curated content cards (for_you | explore | random)
}
