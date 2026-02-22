import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeDemoMode, isDemoMode } from "./lib/demo-mode";

// Activate Demo Mode via URL query param (?demo=true) – works in web, Capacitor WebView, and
// can also be triggered by a deep link that opens the app with this param in the initial URL.
(function activateDemoFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "true" && !isDemoMode()) {
      initializeDemoMode();
    }
  } catch (error) {
    // Non-fatal: ignore if URL parsing fails (e.g. unusual WebView environments)
    if (import.meta.env.DEV) {
      console.warn("[demo] Failed to parse URL params:", error);
    }
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
