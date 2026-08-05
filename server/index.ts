import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { runMigrations } from "./migrate";
import { registerBillingWebhook } from "./routes/billing";
import { installRouteDuplicateAudit } from "./lib/route-audit";

const app = express();
app.set("trust proxy", 1);

// Security headers — applied before any route
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.plaid.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://img.youtube.com"],
        connectSrc: ["'self'", "https://api.openai.com", "https://api.stripe.com", "https://cdn.plaid.com", "https://production.plaid.com", "https://sandbox.plaid.com", "https://development.plaid.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        objectSrc: ["'none'"],
        frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com", "https://cdn.plaid.com"],
        // In development the app runs inside Replit's preview iframe, so it
        // must be embeddable; in production block all framing (clickjacking).
        frameAncestors:
          process.env.NODE_ENV === "production" ? ["'none'"] : ["*"],
        // upgrade-insecure-requests breaks plain-HTTP dev previews; keep it
        // production-only.
        ...(process.env.NODE_ENV === "production"
          ? {}
          : { upgradeInsecureRequests: null }),
      },
    },
    crossOriginEmbedderPolicy: false,
    // X-Frame-Options would also block the Replit preview iframe in dev;
    // frame-ancestors above already covers production.
    frameguard: process.env.NODE_ENV === "production" ? undefined : false,
  })
);
// Wrap app.get/post/... so any duplicate `${METHOD} ${path}` registration
// is logged at startup. Express only runs the FIRST handler for a given
// route, so duplicates become silent dead code (see Task #139 fallout).
// Install BEFORE any route registration so every registration is audited.
installRouteDuplicateAudit(app);
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
      if (capturedJsonResponse && process.env.NODE_ENV !== "production") {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // The runner is idempotent and drift-tolerant — safe to run on every boot
  // in both dev and prod. It self-heals databases that were originally
  // bootstrapped via `drizzle-kit push` and stamps every new migration as
  // applied. See server/migrate.ts.
  try {
    await runMigrations();
  } catch (err) {
    if (process.env.NODE_ENV === "production") throw err;
    console.warn("[migrate] skipped (dev):", (err as any)?.message ?? err);
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

  // Guide check-ins — proactive level-up coaching nudges when role-map or
  // group-challenge progress stalls or a milestone is within reach. Mute
  // lives on notification_preferences.guideCheckinsEnabled. See
  // server/guide-checkins.ts.
  try {
    const { startGuideCheckinsScheduler } = await import("./guide-checkins");
    startGuideCheckinsScheduler();
  } catch (err) {
    console.error("[guide-checkins] Failed to start scheduler:", err);
  }

  // Daily growth snapshots — upserts a growth_snapshots row for every
  // recently-active user so My Level trend charts stay continuous even on
  // days the user never opens the app. See server/growth-snapshots-scheduler.ts.
  try {
    const { startGrowthSnapshotsScheduler } = await import(
      "./growth-snapshots-scheduler"
    );
    startGrowthSnapshotsScheduler();
  } catch (err) {
    console.error("[growth-snapshots] Failed to start scheduler:", err);
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
