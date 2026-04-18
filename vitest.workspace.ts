import path from "path";
import { defineWorkspace } from "vitest/config";

// A single `vitest` invocation runs both the client (jsdom) and server (node)
// projects so server-side tests are picked up by the standard test workflow
// without remembering the extra `--config` flag.
export default defineWorkspace([
  {
    extends: path.resolve(import.meta.dirname, "vite.config.ts"),
    test: {
      name: "client",
    },
  },
  {
    extends: path.resolve(import.meta.dirname, "vitest.server.config.ts"),
    test: {
      name: "server",
    },
  },
]);
