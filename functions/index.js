// Server side of Nora: awards stars, delivers warm signals with push, cleans up a pair both partners have left.
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as h from "./handlers.js";

initializeApp();
const deps = { db: getFirestore(), messaging: getMessaging() };

// The database lives in the multi-region eur3, but functions need a single region: europe-west1 is part of eur3.
// The Firestore triggers themselves are placed in eur3 automatically.
const region = "europe-west1";
const LOG = "pairs/{pid}/log/{logId}", PAIR = "pairs/{pid}", SIGNAL = "pairs/{pid}/signals/{id}", ORDER = "pairs/{pid}/orders/{id}";

export const logCreated = onDocumentCreated({ document: LOG, region }, e => h.onLogCreated(deps, { pid: e.params.pid, logId: e.params.logId, data: e.data && e.data.data() }));
export const logDeleted = onDocumentDeleted({ document: LOG, region }, e => h.onLogDeleted(deps, { pid: e.params.pid, data: e.data && e.data.data() }));
export const pairUpdated = onDocumentUpdated({ document: PAIR, region }, e => h.onPairUpdated(deps, { pid: e.params.pid, after: e.data && e.data.after.data() }));
export const signalCreated = onDocumentCreated({ document: SIGNAL, region }, e => h.onSignalCreated(deps, { pid: e.params.pid, id: e.params.id, data: e.data && e.data.data() }));
export const orderCreated = onDocumentCreated({ document: ORDER, region }, e => h.onOrderCreated(deps, { pid: e.params.pid, id: e.params.id, data: e.data && e.data.data() }));
export const orderUpdated = onDocumentUpdated({ document: ORDER, region }, e => h.onOrderUpdated(deps, { pid: e.params.pid, id: e.params.id, before: e.data && e.data.before.data(), after: e.data && e.data.after.data() }));
