import express, { type Express, type Request } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage";

/**
 * Build a `<script>window.__DW_LANG__ = "..."</script>` tag for synchronous
 * language hydration on the client. Mirror of the dev-mode helper in
 * server/vite.ts so production users see localized strings on first paint
 * the same way dev users do.
 */
async function buildLanguageBootstrap(
  req: Request & { session?: { userId?: string } },
): Promise<string> {
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

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // Serve the SPA shell, injecting the per-user language bootstrap into the
  // <head> so the client can pick it up synchronously before first render.
  // Falls through to plain index.html on any error so a broken lookup never
  // takes the app down.
  const indexPath = path.resolve(distPath, "index.html");
  app.use("*", async (req, res) => {
    try {
      let template = await fs.promises.readFile(indexPath, "utf-8");
      const bootstrap = await buildLanguageBootstrap(
        req as Request & { session?: { userId?: string } },
      );
      if (bootstrap) {
        template = template.replace("</head>", `  ${bootstrap}\n  </head>`);
      }
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch {
      res.sendFile(indexPath);
    }
  });
}
