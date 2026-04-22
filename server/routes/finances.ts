import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth } from "./_shared";
import { openai } from "../openai";
import {
  insertFinancialAccountSchema,
  insertTransactionSchema,
  insertBudgetSchema,
  insertInvestmentHoldingSchema,
  insertSavingsGoalSchema,
  financialAccountTypeEnum,
  holdingTypeEnum,
} from "@shared/schema";

const accountBody = insertFinancialAccountSchema.omit({ userId: true, plaidAccountId: true, plaidItemId: true, isManual: true });

const transactionBody = insertTransactionSchema.omit({ userId: true, source: true, plaidTransactionId: true, pending: true }).extend({
  accountId: z.string().optional().nullable(),
  goalId: z.string().uuid().optional().nullable(),
});

const budgetBody = insertBudgetSchema.omit({ userId: true });

const holdingBody = insertInvestmentHoldingSchema.omit({ userId: true, currentPrice: true, lastQuoteAt: true }).extend({
  type: z.enum(holdingTypeEnum).default("stock"),
});

const goalBody = insertSavingsGoalSchema.omit({ userId: true }).extend({
  name: z.string().min(1).max(120),
  targetAmount: z.coerce.number().positive(),
  currentAmount: z.coerce.number().nonnegative().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

function monthBounds(date = new Date()): { from: string; to: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  const from = new Date(y, m, 1).toISOString().slice(0, 10);
  const to = new Date(y, m + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function holdingValue(h: { shares: number | string | null; currentPrice: number | string | null; manualValue: number | string | null }): number {
  const mv = toNum(h.manualValue);
  if (mv != null) return mv;
  const s = toNum(h.shares);
  const p = toNum(h.currentPrice);
  if (s != null && p != null) return s * p;
  return 0;
}

export function registerFinancesRoutes(app: Express) {
  // ── Accounts ──────────────────────────────────────────────────────
  app.get("/api/finance/accounts", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const accounts = await storage.getFinancialAccounts(userId);
      res.json(accounts);
    } catch (err) {
      console.error("[finance] list accounts", err);
      res.status(500).json({ error: "Failed to load accounts" });
    }
  });

  app.post("/api/finance/accounts", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = accountBody.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid account", issues: parsed.error.issues });
      const account = await storage.createFinancialAccount({ ...parsed.data, userId, isManual: true });
      res.json(account);
    } catch (err) {
      console.error("[finance] create account", err);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.patch("/api/finance/accounts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = accountBody.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid account", issues: parsed.error.issues });
      const row = await storage.updateFinancialAccount(req.params.id, userId, parsed.data);
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    } catch (err) {
      console.error("[finance] update account", err);
      res.status(500).json({ error: "Failed to update account" });
    }
  });

  app.delete("/api/finance/accounts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const ok = await storage.deleteFinancialAccount(req.params.id, userId);
      res.json({ ok });
    } catch (err) {
      console.error("[finance] delete account", err);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // ── Transactions ─────────────────────────────────────────────────
  app.get("/api/finance/transactions", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const from = typeof req.query.from === "string" ? req.query.from : undefined;
      const to = typeof req.query.to === "string" ? req.query.to : undefined;
      const category = typeof req.query.category === "string" ? req.query.category : undefined;
      const limit = Math.min(Number(req.query.limit) || 500, 2000);
      const rows = await storage.getTransactions(userId, { from, to, category, limit });
      res.json(rows);
    } catch (err) {
      console.error("[finance] list transactions", err);
      res.status(500).json({ error: "Failed to load transactions" });
    }
  });

  app.post("/api/finance/transactions", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = transactionBody.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid transaction", issues: parsed.error.issues });
      if (parsed.data.goalId) {
        const goals = await storage.getSavingsGoals(userId);
        if (!goals.some(g => g.id === parsed.data.goalId)) {
          return res.status(400).json({ error: "Linked savings goal not found" });
        }
      }
      const row = await storage.createTransaction({
        ...parsed.data,
        userId,
        source: "manual",
      });
      res.json(row);
    } catch (err) {
      console.error("[finance] create transaction", err);
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });

  app.delete("/api/finance/transactions/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const ok = await storage.deleteTransaction(req.params.id, userId);
      res.json({ ok });
    } catch (err) {
      console.error("[finance] delete transaction", err);
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  // ── Budgets ──────────────────────────────────────────────────────
  app.get("/api/finance/budgets", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const rows = await storage.getBudgets(userId);
      const { from, to } = monthBounds();
      const txns = await storage.getTransactions(userId, { from, to });
      const spent: Record<string, number> = {};
      for (const t of txns) {
        if (t.amount < 0) {
          spent[t.category] = (spent[t.category] || 0) + Math.abs(t.amount);
        }
      }
      res.json(rows.map(b => ({ ...b, spent: Math.round((spent[b.category] || 0) * 100) / 100 })));
    } catch (err) {
      console.error("[finance] list budgets", err);
      res.status(500).json({ error: "Failed to load budgets" });
    }
  });

  app.post("/api/finance/budgets", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = budgetBody.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid budget", issues: parsed.error.issues });
      const row = await storage.upsertBudget({ ...parsed.data, userId });
      res.json(row);
    } catch (err) {
      console.error("[finance] upsert budget", err);
      res.status(500).json({ error: "Failed to save budget" });
    }
  });

  app.delete("/api/finance/budgets/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const ok = await storage.deleteBudget(req.params.id, userId);
      res.json({ ok });
    } catch (err) {
      console.error("[finance] delete budget", err);
      res.status(500).json({ error: "Failed to delete budget" });
    }
  });

  // ── Investment holdings ──────────────────────────────────────────
  app.get("/api/finance/holdings", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const rows = await storage.getInvestmentHoldings(userId);
      res.json(rows.map(h => ({ ...h, value: holdingValue(h) })));
    } catch (err) {
      console.error("[finance] list holdings", err);
      res.status(500).json({ error: "Failed to load holdings" });
    }
  });

  app.post("/api/finance/holdings", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = holdingBody.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid holding", issues: parsed.error.issues });
      const row = await storage.createInvestmentHolding({ ...parsed.data, userId });
      res.json(row);
    } catch (err) {
      console.error("[finance] create holding", err);
      res.status(500).json({ error: "Failed to create holding" });
    }
  });

  app.patch("/api/finance/holdings/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = holdingBody.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid holding", issues: parsed.error.issues });
      const row = await storage.updateInvestmentHolding(req.params.id, userId, parsed.data);
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    } catch (err) {
      console.error("[finance] update holding", err);
      res.status(500).json({ error: "Failed to update holding" });
    }
  });

  app.delete("/api/finance/holdings/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const ok = await storage.deleteInvestmentHolding(req.params.id, userId);
      res.json({ ok });
    } catch (err) {
      console.error("[finance] delete holding", err);
      res.status(500).json({ error: "Failed to delete holding" });
    }
  });

  // ── Savings goals ────────────────────────────────────────────────
  app.get("/api/finance/goals", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const rows = await storage.getSavingsGoals(userId);
      res.json(rows);
    } catch (err) {
      console.error("[finance] list goals", err);
      res.status(500).json({ error: "Failed to load goals" });
    }
  });

  app.post("/api/finance/goals", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = goalBody.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid goal", issues: parsed.error.issues });
      const row = await storage.createSavingsGoal({
        ...parsed.data,
        userId,
        currentAmount: parsed.data.currentAmount ?? 0,
      });
      res.json(row);
    } catch (err) {
      console.error("[finance] create goal", err);
      res.status(500).json({ error: "Failed to create goal" });
    }
  });

  app.patch("/api/finance/goals/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = goalBody.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid goal", issues: parsed.error.issues });
      const row = await storage.updateSavingsGoal(req.params.id, userId, parsed.data);
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    } catch (err) {
      console.error("[finance] update goal", err);
      res.status(500).json({ error: "Failed to update goal" });
    }
  });

  app.delete("/api/finance/goals/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const ok = await storage.deleteSavingsGoal(req.params.id, userId);
      res.json({ ok });
    } catch (err) {
      console.error("[finance] delete goal", err);
      res.status(500).json({ error: "Failed to delete goal" });
    }
  });

  // ── Net worth snapshots ──────────────────────────────────────────
  app.get("/api/finance/net-worth", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const rows = await storage.getNetWorthSnapshots(userId, 90);
      res.json(rows.reverse());
    } catch (err) {
      console.error("[finance] net worth", err);
      res.status(500).json({ error: "Failed to load net worth" });
    }
  });

  // ── Aggregate summary for Overview tab + AI grounding ─────────────
  app.get("/api/finance/summary", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { from, to } = monthBounds();
      const [accounts, monthTxns, budgetsList, holdings, last90Txns, goals] = await Promise.all([
        storage.getFinancialAccounts(userId),
        storage.getTransactions(userId, { from, to }),
        storage.getBudgets(userId),
        storage.getInvestmentHoldings(userId),
        storage.getTransactions(userId, {
          from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        }),
        storage.getSavingsGoals(userId),
      ]);

      const monthSpend = monthTxns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
      const monthIncome = monthTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);

      const spendByCategory: Record<string, number> = {};
      for (const t of monthTxns) {
        if (t.amount < 0) spendByCategory[t.category] = (spendByCategory[t.category] || 0) + Math.abs(t.amount);
      }

      const assets = (accounts.filter(a => !["credit", "loan"].includes(a.type)).reduce((s, a) => s + (a.currentBalance || 0), 0))
        + holdings.reduce((s, h) => s + holdingValue(h), 0);
      const liabilities = accounts.filter(a => ["credit", "loan"].includes(a.type)).reduce((s, a) => s + Math.abs(a.currentBalance || 0), 0);
      const netWorth = assets - liabilities;

      // Persist today's snapshot for trend lines.
      const today = new Date().toISOString().slice(0, 10);
      await storage.upsertNetWorthSnapshot({ userId, date: today, assets, liabilities, netWorth });

      const budgetProgress = budgetsList.map(b => ({
        id: b.id,
        category: b.category,
        monthlyLimit: b.monthlyLimit,
        spent: Math.round((spendByCategory[b.category] || 0) * 100) / 100,
        overBy: Math.max(0, (spendByCategory[b.category] || 0) - b.monthlyLimit),
      }));

      res.json({
        netWorth,
        assets,
        liabilities,
        monthSpend,
        monthIncome,
        spendByCategory,
        budgets: budgetProgress,
        accounts,
        holdings: holdings.map(h => ({ ...h, value: holdingValue(h) })),
        recentTransactions: last90Txns.slice(0, 25),
        totalTransactions90d: last90Txns.length,
        goals,
      });
    } catch (err) {
      console.error("[finance] summary", err);
      res.status(500).json({ error: "Failed to load summary" });
    }
  });

  // ── Chat grounding endpoint ──────────────────────────────────────
  // Builds a compact context blob from the last 90 days of transactions,
  // current budgets, and current holdings, then routes the question through
  // the existing LLM.
  app.post("/api/finance/chat", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const schema = z.object({
        message: z.string().min(1).max(4000),
        history: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().max(8000),
        })).max(20).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid chat request" });

      const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const [txns, budgetsList, holdings, goals] = await Promise.all([
        storage.getTransactions(userId, { from, limit: 500 }),
        storage.getBudgets(userId),
        storage.getInvestmentHoldings(userId),
        storage.getSavingsGoals(userId),
      ]);

      const spendByCat: Record<string, number> = {};
      const incomeByCat: Record<string, number> = {};
      for (const t of txns) {
        if (t.amount < 0) spendByCat[t.category] = (spendByCat[t.category] || 0) + Math.abs(t.amount);
        else incomeByCat[t.category] = (incomeByCat[t.category] || 0) + t.amount;
      }
      const topCats = Object.entries(spendByCat).sort((a, b) => b[1] - a[1]).slice(0, 8);
      const totalSpend = txns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
      const totalIncome = txns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const holdingsValue = holdings.reduce((s, h) => s + holdingValue(h), 0);

      const ctx = [
        `Finances context (last 90 days):`,
        `- Total spend: $${totalSpend.toFixed(2)}, total income: $${totalIncome.toFixed(2)}`,
        `- Top categories: ${topCats.map(([c, v]) => `${c} $${v.toFixed(0)}`).join(", ") || "none"}`,
        `- Budgets: ${budgetsList.map(b => `${b.category} $${b.monthlyLimit}/mo`).join(", ") || "none set"}`,
        `- Holdings total value: $${holdingsValue.toFixed(2)} (${holdings.length} position${holdings.length === 1 ? "" : "s"})`,
        holdings.length ? `- Holdings: ${holdings.map(h => `${h.ticker || h.name}${h.shares ? ` x${h.shares}` : ""}`).join(", ")}` : "",
        goals.length ? `- Savings goals: ${goals.map(g => `${g.name} ${Math.round((g.currentAmount / g.targetAmount) * 100)}% ($${g.currentAmount.toFixed(0)}/$${g.targetAmount.toFixed(0)}${g.targetDate ? ` by ${g.targetDate}` : ""})`).join("; ")}` : "",
      ].filter(Boolean).join("\n");

      const systemPrompt = `You are DW's compassionate financial wellness coach. Answer questions using the real finance data below — cite specific numbers and categories when possible. Keep answers concise (2-3 short paragraphs), warm, practical. Never promise specific returns.\n\n${ctx}`;

      const history = parsed.data.history || [];
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user", content: parsed.data.message },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });
      const text = response.choices[0]?.message?.content || "";
      res.json({ response: text });
    } catch (err) {
      console.error("[finance] chat", err);
      res.status(500).json({ error: "Couldn't get a response" });
    }
  });

  // ── Quote refresh (daily cron-able) ──────────────────────────────
  // Uses Perplexity if available to get end-of-day prices; else falls back
  // to a noop that just stamps lastQuoteAt.
  app.post("/api/finance/refresh-quotes", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const holdings = await storage.getInvestmentHoldings(userId);
      const tickerHoldings = holdings.filter(h => h.ticker && h.type !== "other" && h.type !== "cash");
      if (tickerHoldings.length === 0) return res.json({ updated: 0 });

      const apiKey = process.env.PERPLEXITY_API_KEY;
      let updated = 0;

      if (!apiKey) {
        // Without an API key, just stamp lastQuoteAt so the UI stops blinking.
        for (const h of tickerHoldings) {
          await storage.updateInvestmentHolding(h.id, userId, { lastQuoteAt: new Date() });
          updated++;
        }
        return res.json({ updated, note: "Quotes unchanged (PERPLEXITY_API_KEY not configured)" });
      }

      const tickers = tickerHoldings.map(h => h.ticker).join(", ");
      const prompt = `Return ONLY a JSON object mapping stock/etf/crypto tickers to their current USD price as a number. Tickers: ${tickers}. Format: {"AAPL": 172.34}`;

      try {
        const r = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "sonar",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
            temperature: 0,
          }),
        });
        if (!r.ok) throw new Error(`Perplexity ${r.status}`);
        const j = await r.json();
        const text = j.choices?.[0]?.message?.content || "";
        const match = text.match(/\{[\s\S]*\}/);
        const prices: Record<string, number> = match ? JSON.parse(match[0]) : {};

        for (const h of tickerHoldings) {
          const key = h.ticker!;
          const price = prices[key] ?? prices[key.toUpperCase()];
          if (typeof price === "number" && isFinite(price) && price > 0) {
            await storage.updateInvestmentHolding(h.id, userId, { currentPrice: price, lastQuoteAt: new Date() });
            updated++;
          }
        }
      } catch (e) {
        console.error("[finance] quote fetch failed", e);
      }

      res.json({ updated });
    } catch (err) {
      console.error("[finance] refresh-quotes", err);
      res.status(500).json({ error: "Failed to refresh quotes" });
    }
  });
}
