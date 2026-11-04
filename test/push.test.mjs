import test from "node:test";
import assert from "node:assert/strict";
import { createPush, TOKEN_WAIT_MS } from "../src/push.js";

// A stand-in for the native plugin: remembers what was called and plays the answers it is told to.
function fakePlugin({ permission = "prompt", askResult = "granted", register = "token", throwAt = "" } = {}) {
  const calls = [], listeners = {};
  const boom = name => { if (throwAt === name) throw new Error(name + " failed"); };
  const P = {
    calls, listeners,
    checkPermissions: async () => { calls.push("check"); boom("check"); return { receive: permission }; },
    requestPermissions: async () => { calls.push("request"); boom("request"); return { receive: askResult }; },
    removeAllListeners: async () => { calls.push("clear"); },
    addListener: async (n, f) => { listeners[n] = f; calls.push("on:" + n); },
    createChannel: async () => { calls.push("channel"); boom("channel"); },
    register: async () => {
      calls.push("register"); boom("register");
      if (register === "token") listeners.registration({ value: "TOKEN-1" });
      if (register === "error") listeners.registrationError({ message: "SERVICE_NOT_AVAILABLE" });
    },
    unregister: async () => { calls.push("unregister"); }
  };
  return P;
}
const run = async (plugin, { native = true, ask = true } = {}) => {
  const timers = [], states = [], tokens = [], cleared = [];
  const push = createPush({ isNative: () => native, loadPlugin: async () => plugin, setTimer: (f, ms) => { timers.push([f, ms]); return timers.length; }, clearTimer: id => cleared.push(id) });
  const ok = await push.startPush({ ask, onToken: t => tokens.push(t), onState: s => states.push(s.status + (s.error ? ":" + s.error : "")) });
  return { ok, states, tokens, timers, cleared, push };
};

test("first start: asks for the permission, then registers and gets the token", async () => {
  const P = fakePlugin(), r = await run(P);
  assert.equal(r.ok, true);
  assert.deepEqual(P.calls, ["check", "request", "clear", "on:registration", "on:registrationError", "on:pushNotificationReceived", "channel", "register"]);
  assert.deepEqual(r.states, ["checking", "asking", "registering", "ready"]);
  assert.deepEqual(r.tokens, ["TOKEN-1"]);
  assert.equal(r.timers[0][1], TOKEN_WAIT_MS);
  assert.equal(r.cleared.length, 1); // the waiting timer is cancelled once the token is there
});

test("already allowed: no question, straight to the token", async () => {
  const P = fakePlugin({ permission: "granted" }), r = await run(P);
  assert.equal(P.calls.includes("request"), false);
  assert.deepEqual(r.states, ["checking", "registering", "ready"]);
});

test("the user says no: the state says denied and nothing else is set up", async () => {
  for (const [permission, askResult] of [["prompt", "denied"], ["denied", ""]]) {
    const P = fakePlugin({ permission, askResult }), r = await run(P);
    assert.equal(r.ok, false);
    assert.equal(r.states.at(-1), "denied");
    assert.equal(P.calls.includes("register"), false);
  }
});

test("without asking: a fresh phone stays at 'prompt' and is not asked", async () => {
  const P = fakePlugin(), r = await run(P, { ask: false });
  assert.equal(r.ok, false);
  assert.equal(r.states.at(-1), "prompt");
  assert.equal(P.calls.includes("request"), false);
  // but if it was allowed in the phone settings meanwhile, it registers without a question
  const G = fakePlugin({ permission: "granted" }), g = await run(G, { ask: false });
  assert.equal(g.states.at(-1), "ready");
});

test("an error anywhere is shown with its reason instead of being swallowed", async () => {
  for (const step of ["check", "request", "register"]) {
    const r = await run(fakePlugin({ throwAt: step }));
    assert.equal(r.ok, false, step);
    assert.match(r.states.at(-1), new RegExp("^error:" + step + " failed"), step);
  }
  // a channel that cannot be created does not stop the registration
  assert.equal((await run(fakePlugin({ throwAt: "channel" }))).states.at(-1), "ready");
  // Google refuses the registration
  const e = await run(fakePlugin({ register: "error" }));
  assert.equal(e.states.at(-1), "error:SERVICE_NOT_AVAILABLE");
});

test("no answer from Google: after the wait the state becomes an error", async () => {
  const r = await run(fakePlugin({ register: "silence" }));
  assert.equal(r.states.at(-1), "registering");
  r.timers[0][0]();
  assert.match(r.states.at(-1), /^error:no answer from Google within 20 s/);
});

test("the browser version has no push and says so; the permission can be read without asking", async () => {
  const r = await run(fakePlugin(), { native: false });
  assert.deepEqual([r.ok, r.states], [false, ["unsupported"]]);
  const mk = perm => createPush({ isNative: () => true, loadPlugin: async () => fakePlugin({ permission: perm }) });
  assert.deepEqual(await Promise.all(["granted", "denied", "prompt", "prompt-with-rationale"].map(p => mk(p).readPermission())), ["granted", "denied", "prompt", "prompt"]);
  assert.equal(await createPush({ isNative: () => false, loadPlugin: async () => null }).readPermission(), "unsupported");
  assert.equal(await createPush({ isNative: () => true, loadPlugin: async () => fakePlugin({ throwAt: "check" }) }).readPermission(), "error");
});

test("a message that arrives while the app is open is passed on", async () => {
  const P = fakePlugin(), got = [];
  const push = createPush({ isNative: () => true, loadPlugin: async () => P, setTimer: () => 1, clearTimer: () => {} });
  await push.startPush({ onMessage: m => got.push(m) });
  P.listeners.pushNotificationReceived({ title: "Андрей", body: "Люблю тебя" });
  P.listeners.pushNotificationReceived({});
  assert.deepEqual(got, [{ title: "Андрей", body: "Люблю тебя" }, { title: "", body: "" }]);
});

test("messaging adapter: token and errors reach the listeners, notifications are unwrapped", async () => {
  const { messagingAdapter } = await import("../src/push.js");
  const seen = {};
  const M = (token, fail) => ({ checkPermissions: async () => ({ receive: "granted" }), requestPermissions: async () => ({ receive: "granted" }), removeAllListeners: async () => {},
    addListener: async (n, f) => { seen[n] = f; }, createChannel: async () => {}, getToken: async () => { if (fail) throw new Error("no apns"); return { token }; }, deleteToken: async () => { seen.deleted = true; } });
  const a = messagingAdapter(M("FCM-1")), got = [];
  await a.addListener("registration", t => got.push(t.value));
  await a.addListener("pushNotificationReceived", n => got.push(n.title));
  await a.register(); seen.notificationReceived({ notification: { title: "Hi" } });
  assert.deepEqual(got, ["FCM-1", "Hi"]);
  const b = messagingAdapter(M("", true)), errs = [];
  await b.addListener("registrationError", e => errs.push(e.message)); await b.register();
  assert.deepEqual(errs, ["no apns"]);
  await a.unregister(); assert.equal(seen.deleted, true);
});
