import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithCredential, signOut } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, persistentSingleTabManager } from "firebase/firestore";
import { Capacitor } from "@capacitor/core";
import { firebaseConfig } from "./config.js";

export const configured = !!firebaseConfig.apiKey;
export const app = configured ? initializeApp(firebaseConfig) : null;
const native = Capacitor.isNativePlatform();
// In the phone app (WKWebView) the default setup is slow to start: the web sign-in pop-up resolver loads extra pages, several-tab
// coordination waits on locks, and Firestore tries its streaming channel first and only falls back to long polling after a timeout.
export const auth = configured ? (native ? initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] }) : getAuth(app)) : null;
export const db = configured ? initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: native ? persistentSingleTabManager() : persistentMultipleTabManager() }),
  ...(Capacitor.getPlatform() === "ios" ? { experimentalForceLongPolling: true } : { experimentalAutoDetectLongPolling: true })
}) : null;

export async function googleSignIn() {
  if (Capacitor.isNativePlatform()) {
    const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
    const res = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
    const cred = GoogleAuthProvider.credential(res.credential && res.credential.idToken, res.credential && res.credential.accessToken);
    return signInWithCredential(auth, cred);
  }
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export const isIOS = () => Capacitor.getPlatform() === "ios";

// Sign in with Apple (App Store guideline 4.8): native sheet, then the Apple credential is handed to Firebase.
export async function appleSignIn() {
  const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
  const res = await FirebaseAuthentication.signInWithApple({ skipNativeAuth: true });
  const c = res.credential || {};
  const cred = new OAuthProvider("apple.com").credential({ idToken: c.idToken, rawNonce: c.nonce });
  return signInWithCredential(auth, cred);
}

// Fresh sign-in with whichever provider the current account uses (needed before deleting the account).
export function reSignIn() {
  const ids = ((auth.currentUser && auth.currentUser.providerData) || []).map(x => x.providerId);
  return ids.includes("apple.com") ? appleSignIn() : googleSignIn();
}

export async function appSignOut() {
  if (Capacitor.isNativePlatform()) {
    try { const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication"); await FirebaseAuthentication.signOut(); } catch (e) {}
  }
  await signOut(auth);
}
