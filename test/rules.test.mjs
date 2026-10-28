// Firestore rules against the local emulator. Run with: npm run test:rules
import test, { before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc, deleteDoc, arrayRemove } from "firebase/firestore";

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
});

test("a profile is private", async () => {
  await assertSucceeds(setDoc(doc(as("a"), "users/a"), { pairId: "p", lang: "el" }));
  await assertFails(getDoc(doc(as("b"), "users/a")));
  await assertFails(setDoc(doc(as("a"), "users/a"), { pairId: "p", admin: true }));
});
