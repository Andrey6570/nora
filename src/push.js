// Push notifications through Firebase Cloud Messaging (Android app only; the browser version has none).
// createPush takes the two things that differ between the phone and a test: is this a native app, and how to load the plugin.
import { Capacitor } from "@capacitor/core";

const text = e => String((e && (e.message || e.errorMessage || e.code)) || e || "").slice(0, 160);
export const TOKEN_WAIT_MS = 20000;

// States, as the screens show them:
//   unsupported  the browser version
//   checking / asking / registering  working
//   prompt       permission not asked yet (only when asking was not allowed)
//   denied       the user said no, or turned notifications off in the phone settings
//   ready        a token was received from Google
//   error        something failed; error holds the reason
export function createPush({ isNative, loadPlugin, setTimer = setTimeout, clearTimer = clearTimeout }) {
  async function startPush({ ask = true, onToken, onMessage, onState } = {}) {
    const set = (status, error = "") => { if (onState) onState({ status, error }); };
    if (!isNative()) { set("unsupported"); return false; }
    let timer = null;
    try {
      set("checking");
      const P = await loadPlugin();
      let perm = (await P.checkPermissions()).receive;
      if (perm === "prompt" || perm === "prompt-with-rationale") {
        if (!ask) { set("prompt"); return false; }
        set("asking");
        perm = (await P.requestPermissions()).receive;
      }
      if (perm !== "granted") { set("denied"); return false; }
      await P.removeAllListeners();
      await P.addListener("registration", t => { clearTimer(timer); set("ready"); if (onToken) onToken(t.value); });
      await P.addListener("registrationError", e => { clearTimer(timer); set("error", text(e)); });
      await P.addListener("pushNotificationReceived", n => { if (onMessage) onMessage({ title: n.title || "", body: n.body || "" }); });
      try { await P.createChannel({ id: "default", name: "Nora", importance: 4, visibility: 1 }); } catch (e) {}
      set("registering");
      // if Google never answers (no Play services, no network), say so instead of waiting for ever
      timer = setTimer(() => set("error", "no answer from Google within " + TOKEN_WAIT_MS / 1000 + " s"), TOKEN_WAIT_MS);
      await P.register();
      return true;
    } catch (e) { clearTimer(timer); set("error", text(e)); return false; }
  }

  // The permission as it is now, without asking
  async function readPermission() {
    if (!isNative()) return "unsupported";
    try { const r = (await (await loadPlugin()).checkPermissions()).receive; return r === "granted" ? "granted" : r === "denied" ? "denied" : "prompt"; }
    catch (e) { return "error"; }
  }

  async function stopPush() {
    if (!isNative()) return;
    try { const P = await loadPlugin(); await P.removeAllListeners(); await P.unregister(); } catch (e) {}
  }
  return { startPush, readPermission, stopPush };
}

const real = createPush({ isNative: () => Capacitor.isNativePlatform(), loadPlugin: async () => (await import("@capacitor/push-notifications")).PushNotifications });
export const pushSupported = () => Capacitor.isNativePlatform();
export const { startPush, readPermission, stopPush } = real;
