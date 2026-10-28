// Server side of Nora: awards stars and cleans up a pair both partners have left.
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as h from "./handlers.js";

initializeApp();
const deps = { db: getFirestore() };

// Firestore triggers must run where the database lives: the multi-region eur3 (Europe).
const region = "eur3";
const LOG = "pairs/{pid}/log/{logId}", PAIR = "pairs/{pid}";

export const logCreated = onDocumentCreated({ document: LOG, region }, e => h.onLogCreated(deps, { pid: e.params.pid, logId: e.params.logId, data: e.data && e.data.data() }));
export const logDeleted = onDocumentDeleted({ document: LOG, region }, e => h.onLogDeleted(deps, { pid: e.params.pid, data: e.data && e.data.data() }));
export const pairUpdated = onDocumentUpdated({ document: PAIR, region }, e => h.onPairUpdated(deps, { pid: e.params.pid, after: e.data && e.data.after.data() }));
