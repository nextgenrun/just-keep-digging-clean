import { sanitizeHardcoreModeData } from "../../values/hardcoreMode.js";

function withTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeoutId = globalThis.setTimeout?.(
      () => reject(new Error("life-state-save-timeout")),
      Math.max(1, Number(timeoutMs) || 1),
    );
    Promise.resolve(promise).then(
      value => {
        globalThis.clearTimeout?.(timeoutId);
        resolve(value);
      },
      error => {
        globalThis.clearTimeout?.(timeoutId);
        reject(error);
      },
    );
  });
}

function waitForPresentationDelay(delayMs) {
  const duration = Math.max(0, Number(delayMs) || 0);
  if (duration === 0 || typeof globalThis.setTimeout !== "function") {
    return Promise.resolve();
  }
  return new Promise(resolve => globalThis.setTimeout(resolve, duration));
}

function boundedTransactionId(value) {
  return typeof value === "string" ? value.trim().slice(0, 128) : "";
}

export function createHardcoreDeathTransactionId(scene, context = {}) {
  const supplied = boundedTransactionId(context.transactionId);
  if (supplied) return supplied;
  const slot = Math.max(1, Math.floor(Number(scene.saveSlot) || 1));
  const deaths = Math.max(
    0,
    Math.floor(Number(scene._hardcoreRuntime?.system?.state?.deaths) || 0),
  );
  const timestamp = Math.max(0, Math.floor(Number(context.nowMs) || Date.now()));
  const random = globalThis.crypto?.randomUUID?.()
    || Math.random().toString(36).slice(2, 10);
  return boundedTransactionId(
    `hardcore-death:${slot}:${deaths + 1}:${timestamp}:${random}`,
  );
}

export function verifyHardcoreDeathCommit(scene, transactionId, expectedData) {
  const store = scene.dugTileSaveStore;
  if (
    !store
    || typeof store.loadFromLocalStorage !== "function"
    || typeof store.normalizePayload !== "function"
  ) {
    return Object.freeze({ ok: true, skipped: true, reason: "store-unavailable" });
  }
  const payload = store.normalizePayload(store.loadFromLocalStorage());
  const expected = sanitizeHardcoreModeData(expectedData);
  const actual = sanitizeHardcoreModeData(payload?.hardcoreModeData);
  const checks = Object.freeze({
    transactionId: payload?.revisionMetadata?.transactionId === transactionId,
    mode: actual.mode === expected.mode,
    livesRemaining: actual.livesRemaining === expected.livesRemaining,
    freeReviveAvailable:
      actual.freeReviveAvailable === expected.freeReviveAvailable,
    deaths: actual.deaths === expected.deaths,
    exhausted: actual.exhausted === expected.exhausted,
  });
  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
  return Object.freeze({
    ok: failed.length === 0,
    skipped: false,
    failed: Object.freeze(failed),
    revision: payload?.revisionMetadata?.revision || 0,
  });
}

async function commitThroughCoordinator(scene, transactionId) {
  const coordinator = scene.gameSaveCoordinator;
  if (typeof coordinator?.transaction === "function") {
    const result = await coordinator.transaction({
      id: transactionId,
      reason: "hardcore-death-life-state",
      mutate: () => true,
    });
    if (result === false) throw new Error("death-transaction-blocked");
    return result;
  }
  scene.queueDugTilesSave?.("hardcore-death-life-state");
  const saved = await scene.flushDugTilesSave?.({
    scheduled: false,
    force: true,
    reason: "hardcore-death-life-state",
  });
  if (saved === false) throw new Error("flush-returned-false");
  return saved;
}

export async function persistHardcoreDeathTransaction(scene, options) {
  const transactionId = boundedTransactionId(options?.transactionId);
  if (!transactionId) throw new Error("hardcore-death-transaction-id-required");
  await withTimeout(
    commitThroughCoordinator(scene, transactionId),
    options.timeoutMs,
  );
  const verification = verifyHardcoreDeathCommit(
    scene,
    transactionId,
    options.expectedData,
  );
  if (!verification.ok) {
    throw new Error(`death-save-readback-mismatch:${verification.failed.join(",")}`);
  }
  await waitForPresentationDelay(options.returnDelayMs);
  return verification;
}
