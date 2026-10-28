// Firestore rules against the local emulator. Run with: npm run test:rules
import test, { before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc, deleteDoc, arrayRemove, deleteField } from "firebase/firestore";

let env;
const as = uid => env.authenticatedContext(uid).firestore();
const seed = fn => env.withSecurityRulesDisabled(ctx => fn(ctx.firestore()));
const pairDoc = (members, extra = {}) => ({ members, names: Object.fromEntries(members.map(m => [m, m])), inviteCode: "CODE42", createdAt: 1, scale: 10, ...extra });
const task = { title: "Посуда", minutes: 15, difficulty: 1, repeat: "daily", full: false, createdBy: "a", createdAt: 1 };

before(async () => {
  env = await initializeTestEnvironment({ projectId: "nora-test", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
});
after(() => env.cleanup());
beforeEach(() => env.clearFirestore());

test("a user creates a pair only for themselves and without stars", async () => {
  await assertSucceeds(setDoc(doc(as("a"), "pairs/p"), pairDoc(["a"])));
  await assertFails(setDoc(doc(as("a"), "pairs/q"), pairDoc(["a", "b"])));
  await assertFails(setDoc(doc(as("a"), "pairs/r"), pairDoc(["a"], { pot: 100 })));
  await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), "pairs/s"), pairDoc(["a"])));
});

test("only members read a pair", async () => {
  await seed(db => setDoc(doc(db, "pairs/p"), pairDoc(["a", "b"])));
  await assertSucceeds(getDoc(doc(as("b"), "pairs/p")));
  await assertFails(getDoc(doc(as("x"), "pairs/p")));
});

test("the second partner joins with the code, a third cannot", async () => {
  await seed(db => setDoc(doc(db, "pairs/p"), pairDoc(["a"])));
  await assertFails(updateDoc(doc(as("b"), "pairs/p"), { members: ["a", "b"], "names.b": "B", joinProof: "WRONG" }));
  await assertSucceeds(updateDoc(doc(as("b"), "pairs/p"), { members: ["a", "b"], "names.b": "B", joinProof: "CODE42" }));
  await assertFails(updateDoc(doc(as("c"), "pairs/p"), { members: ["a", "b", "c"], "names.c": "C", joinProof: "CODE42" }));
});

test("members change settings but never stars, and only their own name", async () => {
  await seed(db => setDoc(doc(db, "pairs/p"), pairDoc(["a", "b"])));
  await assertSucceeds(updateDoc(doc(as("a"), "pairs/p"), { "names.a": "Андрей", scale: 15 }));
  await assertFails(updateDoc(doc(as("a"), "pairs/p"), { "names.b": "Not you" }));
  await assertFails(updateDoc(doc(as("a"), "pairs/p"), { pot: 999 }));
  await assertFails(updateDoc(doc(as("a"), "pairs/p"), { "balances.a": 999 }));
  await assertFails(updateDoc(doc(as("x"), "pairs/p"), { scale: 15 }));
});

test("deleting an account removes only one's own name, then leaves", async () => {
  await seed(db => setDoc(doc(db, "pairs/p"), pairDoc(["a", "b"])));
  await assertFails(updateDoc(doc(as("a"), "pairs/p"), { "names.b": deleteField() }));
  await assertSucceeds(updateDoc(doc(as("a"), "pairs/p"), { "names.a": deleteField() }));
  await assertSucceeds(updateDoc(doc(as("a"), "pairs/p"), { members: arrayRemove("a") }));
  await assertSucceeds(deleteDoc(doc(as("a"), "users/a")));
});

test("a partner leaves alone and cannot remove the other", async () => {
  await seed(db => setDoc(doc(db, "pairs/p"), pairDoc(["a", "b"])));
  await assertFails(updateDoc(doc(as("a"), "pairs/p"), { members: arrayRemove("b") }));
  await assertSucceeds(updateDoc(doc(as("a"), "pairs/p"), { members: arrayRemove("a") }));
  await assertFails(deleteDoc(doc(as("b"), "pairs/p")));
});

test("invites: created by a member for the pair's current code", async () => {
  await seed(db => setDoc(doc(db, "pairs/p"), pairDoc(["a"])));
  await assertFails(setDoc(doc(as("a"), "invites/OTHER"), { pid: "p" }));
  await assertFails(setDoc(doc(as("x"), "invites/CODE42"), { pid: "p" }));
  await assertSucceeds(setDoc(doc(as("a"), "invites/CODE42"), { pid: "p" }));
  await assertSucceeds(getDoc(doc(as("b"), "invites/CODE42")));
});

test("tasks: members only, with valid fields", async () => {
  await seed(db => setDoc(doc(db, "pairs/p"), pairDoc(["a", "b"])));
  await assertSucceeds(setDoc(doc(as("b"), "pairs/p/tasks/t"), task));
  await assertFails(setDoc(doc(as("x"), "pairs/p/tasks/t2"), task));
  await assertFails(setDoc(doc(as("a"), "pairs/p/tasks/t3"), { ...task, minutes: 9999 }));
  await assertFails(setDoc(doc(as("a"), "pairs/p/tasks/t4"), { ...task, stars: 50 }));
});

test("marks: own, without stars, claimed once, taken back only by the author", async () => {
  await seed(db => setDoc(doc(db, "pairs/p"), pairDoc(["a", "b"])));
  const id = "pairs/p/log/t_do_2026-10-28";
  await assertFails(setDoc(doc(as("a"), id), { uid: "b", day: "2026-10-28", at: 1 }));
  await assertFails(setDoc(doc(as("a"), id), { uid: "a", day: "2026-10-28", at: 1, stars: 9 }));
  await assertSucceeds(setDoc(doc(as("a"), id), { uid: "a", day: "2026-10-28", at: 1 }));
  await assertFails(setDoc(doc(as("b"), id), { uid: "b", day: "2026-10-28", at: 2 }));
  await assertFails(deleteDoc(doc(as("b"), id)));
  await assertSucceeds(deleteDoc(doc(as("a"), id)));
  await assertSucceeds(setDoc(doc(as("b"), "pairs/p/log/u_do_once"), { uid: "b", day: "2026-10-28", at: 1, once: true, together: true }));
  await assertFails(setDoc(doc(as("b"), "pairs/p/log/v_do_once"), { uid: "b", day: "2026-10-28", at: 1, together: "yes" }));
});

test("signals: from me, a known shape, never changed or deleted by clients", async () => {
  await seed(db => setDoc(doc(db, "pairs/p"), pairDoc(["a", "b"])));
  const sig = { from: "a", kind: "message", key: "love", day: "2026-10-28", at: 1 };
  await assertSucceeds(setDoc(doc(as("a"), "pairs/p/signals/s1"), sig));
  await assertSucceeds(setDoc(doc(as("b"), "pairs/p/signals/s2"), { from: "b", kind: "reaction", key: "heart", ref: "t_do_once", day: "2026-10-28", at: 1 }));
  await assertSucceeds(getDoc(doc(as("b"), "pairs/p/signals/s1")));
  await assertFails(setDoc(doc(as("b"), "pairs/p/signals/s3"), sig));
  await assertFails(setDoc(doc(as("a"), "pairs/p/signals/s4"), { ...sig, kind: "ad" }));
  await assertFails(setDoc(doc(as("a"), "pairs/p/signals/s5"), { ...sig, extra: 1 }));
  await assertFails(setDoc(doc(as("x"), "pairs/p/signals/s6"), { ...sig, from: "x" }));
  await assertFails(getDoc(doc(as("x"), "pairs/p/signals/s1")));
  await assertFails(updateDoc(doc(as("a"), "pairs/p/signals/s1"), { key: "miss" }));
  await assertFails(deleteDoc(doc(as("a"), "pairs/p/signals/s1")));
  await assertFails(updateDoc(doc(as("a"), "pairs/p"), { "sigDay.a": { day: "x", message: 0, reaction: 0 } }));
});

test("devices: own token only, not readable from the app, deleted by the owner", async () => {
  await seed(db => setDoc(doc(db, "pairs/p"), pairDoc(["a", "b"])));
  const dev = { uid: "a", token: "tok", lang: "el", at: 1 };
  await assertSucceeds(setDoc(doc(as("a"), "pairs/p/devices/d1"), dev));
  await assertFails(setDoc(doc(as("b"), "pairs/p/devices/d2"), dev));
  await assertFails(setDoc(doc(as("a"), "pairs/p/devices/d3"), { ...dev, lang: "fr" }));
  await assertFails(getDoc(doc(as("a"), "pairs/p/devices/d1")));
  await assertFails(deleteDoc(doc(as("b"), "pairs/p/devices/d1")));
  await assertSucceeds(deleteDoc(doc(as("a"), "pairs/p/devices/d1")));
});

test("rewards: members manage the catalogue with valid fields", async () => {
  await seed(db => setDoc(doc(db, "pairs/p"), pairDoc(["a", "b"])));
  const r = { title: "Ужин вдвоём", cost: 40, scope: "joint", createdBy: "a", createdAt: 1 };
  await assertSucceeds(setDoc(doc(as("b"), "pairs/p/rewards/r1"), r));
  await assertFails(setDoc(doc(as("x"), "pairs/p/rewards/r2"), r));
  await assertFails(setDoc(doc(as("a"), "pairs/p/rewards/r3"), { ...r, cost: 0 }));
  await assertFails(setDoc(doc(as("a"), "pairs/p/rewards/r4"), { ...r, scope: "everyone" }));
  await assertFails(setDoc(doc(as("a"), "pairs/p/rewards/r5"), { ...r, cost: 1.5 }));
  await assertSucceeds(deleteDoc(doc(as("a"), "pairs/p/rewards/r1")));
});

test("orders: asked by the buyer, priced by the server, agreed by the partner", async () => {
  await seed(async db => {
    await setDoc(doc(db, "pairs/p"), pairDoc(["a", "b"]));
    await setDoc(doc(db, "pairs/p/orders/prop"), { uid: "a", kind: "reward", ref: "r", at: 1, status: "proposed", cost: 40, title: "x", joint: true });
    await setDoc(doc(db, "pairs/p/orders/done"), { uid: "a", kind: "reward", ref: "r", at: 1, status: "bought", cost: 10, title: "x", joint: false });
    await setDoc(doc(db, "pairs/p/orders/game"), { uid: "a", kind: "game", ref: "wishes", at: 1, status: "bought", cost: 20, title: "wishes", joint: true });
  });
  await assertSucceeds(setDoc(doc(as("a"), "pairs/p/orders/n1"), { uid: "a", kind: "reward", ref: "r", at: 1 }));
  await assertFails(setDoc(doc(as("a"), "pairs/p/orders/n2"), { uid: "b", kind: "reward", ref: "r", at: 1 }));
  await assertFails(setDoc(doc(as("a"), "pairs/p/orders/n3"), { uid: "a", kind: "reward", ref: "r", at: 1, cost: 1 }));
  await assertFails(setDoc(doc(as("a"), "pairs/p/orders/n4"), { uid: "a", kind: "reward", ref: "r", at: 1, status: "bought" }));
  await assertFails(setDoc(doc(as("x"), "pairs/p/orders/n5"), { uid: "x", kind: "reward", ref: "r", at: 1 }));
  // agreement: only the partner, only their own id
  await assertFails(updateDoc(doc(as("a"), "pairs/p/orders/prop"), { approvedBy: "a" }));
  await assertFails(updateDoc(doc(as("b"), "pairs/p/orders/prop"), { approvedBy: "a" }));
  await assertFails(updateDoc(doc(as("b"), "pairs/p/orders/prop"), { approvedBy: "b", cost: 1 }));
  await assertSucceeds(updateDoc(doc(as("b"), "pairs/p/orders/prop"), { approvedBy: "b" }));
  // a bought reward can be marked used, but its price and status cannot be touched
  await assertSucceeds(updateDoc(doc(as("b"), "pairs/p/orders/done"), { used: true }));
  await assertFails(updateDoc(doc(as("a"), "pairs/p/orders/done"), { status: "proposed" }));
  await assertFails(updateDoc(doc(as("a"), "pairs/p/orders/done"), { cost: 0 }));
  await assertFails(updateDoc(doc(as("a"), "pairs/p/orders/game"), { used: true }));
  // only a proposal can be withdrawn or declined
  await assertFails(deleteDoc(doc(as("a"), "pairs/p/orders/done")));
  await assertSucceeds(deleteDoc(doc(as("b"), "pairs/p/orders/prop")));
  await assertFails(getDoc(doc(as("x"), "pairs/p/orders/done")));
  // the unlocked games and the pot stay with the server
  await assertFails(updateDoc(doc(as("a"), "pairs/p"), { "games.wishes": true }));
});

test("a profile is private", async () => {
  await assertSucceeds(setDoc(doc(as("a"), "users/a"), { pairId: "p", lang: "el" }));
  await assertFails(getDoc(doc(as("b"), "users/a")));
  await assertFails(setDoc(doc(as("a"), "users/a"), { pairId: "p", admin: true }));
});
