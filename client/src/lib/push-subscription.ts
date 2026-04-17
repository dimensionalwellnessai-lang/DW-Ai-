/**
 * Web Push subscription helper.
 *
 * Ensures the current browser is registered with the server so pre-task and
 * post-task accountability reminders can be delivered through the OS even
 * when the tab/PWA is closed.
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
  return out;
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

let inflight: Promise<boolean> | null = null;

/**
 * Idempotently subscribe this browser to push notifications and POST the
 * subscription to the server. Safe to call repeatedly — does the work once
 * per page load and short-circuits if already subscribed with the current
 * server VAPID key.
 */
export async function ensurePushSubscription(): Promise<boolean> {
  if (!isWebPushSupported()) return false;
  if (Notification.permission !== "granted") return false;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();

      // Fetch the server's VAPID public key
      const keyRes = await fetch("/api/push/vapid-key", {
        credentials: "include",
        cache: "no-store",
      });
      if (!keyRes.ok) return false;
      const { publicKey } = (await keyRes.json()) as { publicKey?: string };
      if (!publicKey) return false;

      // If the existing subscription was made with a different VAPID key
      // (e.g. server keys rotated, or first run after install), unsubscribe so
      // we can re-subscribe with the current key.
      let sub = existing;
      if (sub) {
        const existingKey = sub.options.applicationServerKey;
        const newKeyBytes = urlBase64ToUint8Array(publicKey);
        if (
          !existingKey ||
          new Uint8Array(existingKey as ArrayBuffer).toString() !==
            newKeyBytes.toString()
        ) {
          await sub.unsubscribe().catch(() => {});
          sub = null;
        }
      }

      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const json = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        }),
      });
      return res.ok;
    } catch (err) {
      console.error("[push-subscription] ensurePushSubscription failed:", err);
      return false;
    } finally {
      // Allow retry on next call after an in-flight resolves.
      setTimeout(() => {
        inflight = null;
      }, 5000);
    }
  })();
  return inflight;
}
