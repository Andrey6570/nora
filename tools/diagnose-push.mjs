// One-off check of push notifications on the live project, run by .github/workflows/diagnose-push.yml with the deploy
// service account. It prints only counts, languages and error codes: never tokens, names or message texts.
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { execFileSync } from "node:child_process";

initializeApp();
const db = getFirestore();
const lines = [];
const out = s => lines.push(s);

const pairs = await db.collection("pairs").get();
out(`pairs: ${pairs.size}`);
let n = 0;
for (const p of pairs.docs) {
  const d = p.data(), members = (d.members || []).length;
  const devs = await db.collection(`pairs/${p.id}/devices`).get();
  const sigs = await db.collection(`pairs/${p.id}/signals`).get();
  const byUid = {};
  devs.docs.forEach(x => { const v = x.data(); const k = (d.members || []).indexOf(v.uid); byUid["member" + k] = (byUid["member" + k] || 0) + 1; });
  out(`pair ${++n}: members=${members} devices=${devs.size} ${JSON.stringify(byUid)} langs=${[...new Set(devs.docs.map(x => x.data().lang))].join("/")} tokenLengths=${devs.docs.map(x => (x.data().token || "").length).join(",")} lastResults=${devs.docs.map(x => (x.data().lastResult && (x.data().lastResult.ok ? "ok" : x.data().lastResult.code)) || "-").join(",")} signalsRecent=${sigs.size} sigDay=${JSON.stringify(Object.fromEntries(Object.entries(d.sigDay || {}).map(([k, v], i) => ["m" + i, v])))}`);
}

// what the server functions wrote in the last three days: severity counts and the distinct error texts (cut short)
try {
  const raw = execFileSync("gcloud", ["logging", "read", 'resource.type="cloud_run_revision" AND severity>=WARNING', "--freshness=3d", "--limit=200", "--format=json"], { encoding: "utf8", maxBuffer: 20e6 });
  const logs = JSON.parse(raw || "[]"), seen = new Map();
  for (const l of logs) {
    const svc = (l.resource && l.resource.labels && l.resource.labels.service_name) || "?";
    const msg = String(l.textPayload || (l.jsonPayload && (l.jsonPayload.message || JSON.stringify(l.jsonPayload))) || (l.protoPayload && l.protoPayload.status && l.protoPayload.status.message) || "").replace(/\s+/g, " ").slice(0, 220);
    const key = `${l.severity} ${svc}: ${msg}`;
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  out(`warnings/errors in function logs (3 days): ${logs.length}`);
  [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, c]) => out(`  x${c} ${k}`));
} catch (e) { out("logs: could not read (" + String(e.message).split("\n")[0].slice(0, 160) + ")"); }

// which functions exist and where
try {
  const raw = execFileSync("gcloud", ["functions", "list", "--v2", "--format=value(name,state,environment)"], { encoding: "utf8" });
  out("functions: " + raw.trim().split("\n").map(s => s.split("/").pop().replace(/\s+/g, " ")).join(" | "));
} catch (e) { out("functions list: " + String(e.message).split("\n")[0].slice(0, 160)); }

console.log(lines.join("\n"));
// annotations are readable from the API without opening the log
console.log("::notice title=push diagnosis::" + lines.join("%0A").slice(0, 3800));
