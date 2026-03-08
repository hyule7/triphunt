// TripHunt — push.js
// Client-side Web Push API registration + subscription management
// Include on any page that offers price alerts.
// Usage:
//   TH.Push.requestForRoute('LHR', 'BCN')
//   TH.Push.requestForDest('BCN')
//   TH.Push.requestGeneral()

(function () {
  "use strict";

  // ── VAPID public key ─────────────────────────────────────────────
  // Generate your own VAPID keys with: npx web-push generate-vapid-keys
  // Set VAPID_PUBLIC_KEY env var in Netlify and replace the value below.
  const VAPID_PUBLIC_KEY = window.TH_VAPID_KEY || "YOUR_VAPID_PUBLIC_KEY_HERE";

  // ── Convert VAPID key to Uint8Array ─────────────────────────────
  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw     = window.atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  // ── Core subscribe function ──────────────────────────────────────
  async function subscribe({ orig = "ANY", dest = "ANY", onSuccess, onError, onDenied } = {}) {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      if (onError) onError(new Error("Push not supported"));
      return false;
    }

    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        if (onDenied) onDenied();
        return false;
      }

      const reg = await navigator.serviceWorker.ready;

      // Check for existing subscription to avoid duplicates
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      // Save to backend
      await fetch("/.netlify/functions/subscribePush", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ subscription: sub.toJSON(), orig, dest }),
      });

      if (onSuccess) onSuccess({ orig, dest });
      return true;

    } catch (err) {
      console.error("TH.Push subscribe error:", err);
      if (onError) onError(err);
      return false;
    }
  }

  // ── Public API ───────────────────────────────────────────────────
  const Push = {

    // Request permission for a specific route (e.g. LHR → BCN)
    requestForRoute(orig, dest, opts = {}) {
      return subscribe({
        orig, dest,
        onSuccess: () => {
          Push._showToast(`🔔 Price alerts on for ${orig} → ${dest}`);
          if (opts.onSuccess) opts.onSuccess();
        },
        onDenied: () => Push._showToast("Notifications blocked in browser settings.", "warn"),
        onError:  (e) => Push._showToast("Couldn't enable alerts — try again.", "error"),
      });
    },

    // Request for a destination from any UK airport
    requestForDest(dest, opts = {}) {
      return subscribe({
        orig: "ANY", dest,
        onSuccess: () => {
          Push._showToast(`🔔 Alerts on for deals to ${dest} from any UK airport`);
          if (opts.onSuccess) opts.onSuccess();
        },
        onDenied: () => Push._showToast("Notifications blocked — check browser settings.", "warn"),
        onError:  () => Push._showToast("Couldn't enable alerts — try again.", "error"),
      });
    },

    // General alerts for any deal
    requestGeneral(opts = {}) {
      return subscribe({
        orig: "ANY", dest: "ANY",
        onSuccess: () => {
          Push._showToast("🔔 You'll get alerts for all TripHunt deals");
          if (opts.onSuccess) opts.onSuccess();
        },
      });
    },

    // Check if push is already enabled
    async isSubscribed() {
      if (!("serviceWorker" in navigator)) return false;
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (!reg) return false;
      const sub = await reg.pushManager.getSubscription().catch(() => null);
      return !!sub;
    },

    // Unsubscribe
    async unsubscribe() {
      if (!("serviceWorker" in navigator)) return;
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription().catch(() => null);
      if (!sub) return;
      await fetch("/.netlify/functions/subscribePush", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {});
      await sub.unsubscribe();
    },

    // Simple toast notification (UI feedback)
    _showToast(msg, type = "success") {
      const existing = document.getElementById("th-push-toast");
      if (existing) existing.remove();

      const toast = document.createElement("div");
      toast.id = "th-push-toast";
      const bg = type === "success" ? "#10b981" : type === "warn" ? "#f59e0b" : "#ef4444";
      Object.assign(toast.style, {
        position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
        background: bg, color: "#fff", padding: "12px 24px", borderRadius: "9999px",
        fontFamily: "'Outfit', sans-serif", fontSize: "14px", fontWeight: "700",
        zIndex: "9999", boxShadow: "0 4px 20px rgba(0,0,0,.4)",
        animation: "th-fade-in .3s ease",
        maxWidth: "90vw", textAlign: "center",
        transition: "opacity .3s ease",
      });
      toast.textContent = msg;

      // Inject keyframes once
      if (!document.getElementById("th-toast-kf")) {
        const style = document.createElement("style");
        style.id = "th-toast-kf";
        style.textContent = "@keyframes th-fade-in{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}";
        document.head.appendChild(style);
      }

      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    },
  };

  // ── Register SW ──────────────────────────────────────────────────
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }

  // ── Expose globally ──────────────────────────────────────────────
  window.TH = window.TH || {};
  window.TH.Push = Push;

})();
