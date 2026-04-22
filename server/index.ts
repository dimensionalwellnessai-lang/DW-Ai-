import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { runMigrations } from "./migrate";
import { registerBillingWebhook } from "./routes/billing";

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Stripe webhook needs the raw, unparsed request body to verify signatures.
// Mount it BEFORE express.json so the body parser doesn't consume the stream.
registerBillingWebhook(app);

app.use(
  express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  if (process.env.NODE_ENV === "production") {
    await runMigrations();
  } else {
    // Dev: replay migrations with drift tolerance so any tables/columns
    // missing from the local DB (most often `reminder_ledger`, `vapid_keys`,
    // `budgets`, …) get created automatically on boot.
    try {
      const { bootstrapDevDb } = await import("./dev-db-bootstrap");
      await bootstrapDevDb();
    } catch (err) {
      console.warn("[dev-db-bootstrap] skipped:", (err as any)?.message ?? err);
    }
  }

  await registerRoutes(httpServer, app);

  // Initialize web push + start the server-side reminder scheduler so
  // pre-task and post-task notifications fire even when the user's tab/PWA
  // is closed. See server/push.ts.
  try {
    const { initPush, startReminderScheduler } = await import("./push");
    await initPush();
    await startReminderScheduler();
  } catch (err) {
    console.error("[push] Failed to start reminder scheduler:", err);
  }

  // Start the background mood-insights refresh so the Correlations tab is
  // pre-warmed for every active user instead of only refreshing when the
  // user taps "Recompute". See server/mood-insights-scheduler.ts.
  try {
    const { startMoodInsightsScheduler } = await import(
      "./mood-insights-scheduler"
    );
    startMoodInsightsScheduler();
  } catch (err) {
    console.error("[mood-insights] Failed to start scheduler:", err);
  }

  // Daily relationship nudges — sends one push + inbox card per user per
  // day for the most urgent overdue contact or open repair, deep-linked into
  // the right person's sheet. Mute lives on
  // notification_preferences.relationshipNudgesEnabled. See
  // server/relationship-nudges.ts.
  try {
    const { startRelationshipNudgesScheduler } = await import(
      "./relationship-nudges"
    );
    startRelationshipNudgesScheduler();
  } catch (err) {
    console.error("[relationship-nudges] Failed to start scheduler:", err);
  }

  // Start the background Plaid sync scheduler so connected bank
  // transactions are imported every few hours without the user having to
  // tap "Sync" on the Finances page. See server/plaid-sync.ts.
  try {
    const { startPlaidSyncScheduler } = await import("./plaid-sync");
    startPlaidSyncScheduler();
  } catch (err) {
    console.error("[plaid] Failed to start sync scheduler:", err);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
