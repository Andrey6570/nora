// Push notifications through Firebase Cloud Messaging (Android app only; the browser version has none).
import { Capacitor } from "@capacitor/core";

export const pushSupported = () => Capacitor.isNativePlatform();
async function plugin() { return (await import("@capacitor/push-notifications")).PushNotifications; }

// Asks for permission and gets this device's token; onToken is called with it (again whenever it changes).
// onMessage is called with {title, body} when a notification arrives while the app is open.
export async function startPush(onToken, onMessage) {
  if (!pushSupported()) return false;
  try {
    const P = await plugin();
    let perm = await P.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") perm = await P.requestPermissions();
    if (perm.receive !== "granted") return false;
    await P.removeAllListeners();
    await P.addListener("registration", t => onToken(t.value));
    await P.addListener("registrationError", () => {});
    await P.addListener("pushNotificationReceived", n => onMessage && onMessage({ title: n.title || "", body: n.body || "" }));
    try { await P.createChannel({ id: "default", name: "Nora", importance: 4, visibility: 1 }); } catch (e) {}
    await P.register();
    return true;
  } catch (e) { return false; }
}
export async function stopPush() {
  if (!pushSupported()) return;
  try { const P = await plugin(); await P.removeAllListeners(); await P.unregister(); } catch (e) {}
}
