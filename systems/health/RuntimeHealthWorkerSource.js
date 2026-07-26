export function runtimeHealthWorkerMain() {
  let timer = null;
  let lastHeartbeatAtMs = Date.now();
  let frozenAfterMs = 9000;
  let sampleEveryMs = 1000;
  let paused = false;
  let alertSent = false;
  let reporting = null;

  async function reportFrozen(stalledForMs) {
    const event = {
      code: "health-worker-main-thread-frozen",
      severity: "error",
      message: "Health Worker detected a frozen main thread",
      context: { stalledForMs, source: "runtime-health-worker" },
    };
    self.postMessage({ type: "runtime-health-finding", finding: event });
    if (!reporting?.endpoint || typeof fetch !== "function") return;
    try {
      await fetch(reporting.endpoint, {
        method: reporting.method,
        headers: { "Content-Type": reporting.contentType },
        body: JSON.stringify({
          schemaVersion: reporting.schemaVersion,
          buildId: reporting.buildId,
          source: "runtime-health-worker",
          event,
        }),
        credentials: "same-origin",
      });
    } catch {
      // A health worker must never fail because the optional alert endpoint is down.
    }
  }

  function sample() {
    if (paused || alertSent) return;
    const stalledForMs = Date.now() - lastHeartbeatAtMs;
    if (stalledForMs < frozenAfterMs) return;
    alertSent = true;
    void reportFrozen(stalledForMs);
  }

  self.onmessage = event => {
    const message = event.data || {};
    if (message.type === "start") {
      frozenAfterMs = message.frozenAfterMs;
      sampleEveryMs = message.sampleEveryMs;
      reporting = message.reporting || null;
      lastHeartbeatAtMs = Date.now();
      if (timer !== null) clearInterval(timer);
      timer = setInterval(sample, sampleEveryMs);
      return;
    }
    if (message.type === "heartbeat") {
      lastHeartbeatAtMs = Date.now();
      paused = Boolean(message.paused);
      alertSent = false;
      return;
    }
    if (message.type === "stop" && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function buildRuntimeHealthWorkerSource() {
  return `(${runtimeHealthWorkerMain.toString()})();`;
}
