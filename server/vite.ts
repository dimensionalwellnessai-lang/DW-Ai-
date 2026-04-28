import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { storage } from "./storage";

/**
 * Build a `<script>window.__DW_LANG__ = "..."</script>` tag for synchronous
 * language hydration on the client. Looks up the signed-in user's persisted
 * language preference from the request session; returns an empty string
 * when there's no session, no preference, or any lookup error so the client
 * cleanly falls back to localStorage / navigator detection.
 *
 * The value is JSON-stringified and `</script` sequences are escaped so a
 * malicious BCP-47 string cannot break out of the script tag.
 */
async function buildLanguageBootstrap(req: { session?: { userId?: string } }): Promise<string> {
  const userId = req.session?.userId;
  if (!userId) return "";
  try {
    const user = await storage.getUser(userId);
    const lang = user?.language;
    if (!lang) return "";
    const safe = JSON.stringify(lang).replace(/<\/script/gi, "<\\/script");
    return `<script>window.__DW_LANG__=${safe};</script>`;
  } catch {
    return "";
  }
}

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      // Inject the signed-in user's language into the served HTML so the
      // client can read it synchronously before React first renders. No-op
      // for anonymous requests or users with no stored preference.
      const bootstrap = await buildLanguageBootstrap(req as { session?: { userId?: string } });
      if (bootstrap) {
        template = template.replace("</head>", `  ${bootstrap}\n  </head>`);
      }
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
