// Provides isolated Edge launch and CDP helpers for the surface hero landmarks live visual QA runner.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DEFAULT_EDGE_PATHS = Object.freeze([
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
]);

export function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

export function findEdge(supplied = "") {
  if (supplied && fs.existsSync(supplied)) return supplied;
  const found = DEFAULT_EDGE_PATHS.find(candidate => fs.existsSync(candidate));
  if (!found) throw new Error("Microsoft Edge executable not found");
  return found;
}

export function launchSurfaceHeroQaEdge({
  edgePath = "",
  port,
  width = 1600,
  height = 900,
}) {
  const profileDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "surface-hero-landmarks-v4-edge-"),
  );
  return spawn(findEdge(edgePath), [
    "--headless=new",
    "--no-first-run",
    "--disable-background-networking",
    "--disable-renderer-backgrounding",
    "--disable-background-timer-throttling",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    `--window-size=${width},${height}`,
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "about:blank",
  ], {
    windowsHide: true,
    stdio: "ignore",
  });
}

export async function waitForTarget(port, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const page = targets.find(target => target.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch (error) {
      lastError = error;
    }
    await delay(150);
  }
  throw new Error(`Edge debugging target unavailable: ${lastError?.message || "timeout"}`);
}

export class CdpClient {
  constructor(webSocketUrl) {
    this.socket = new WebSocket(webSocketUrl);
    this.sequence = 0;
    this.pending = new Map();
    this.events = [];
    this.socket.onmessage = event => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) pending?.reject(new Error(message.error.message));
        else pending?.resolve(message.result);
        return;
      }
      this.events.push(message);
    };
  }

  async connect() {
    if (this.socket.readyState !== WebSocket.OPEN) {
      await new Promise((resolve, reject) => {
        this.socket.onopen = resolve;
        this.socket.onerror = () => reject(new Error("CDP WebSocket failed"));
      });
    }
    await this.send("Page.enable");
    await this.send("Runtime.enable");
    await this.send("Log.enable");
    return this;
  }

  send(method, params = {}) {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description
        || result.exceptionDetails.text
        || "Runtime evaluation failed",
      );
    }
    return result.result?.value;
  }

  async waitFor(expression, label, timeoutMs = 90000) {
    const deadline = Date.now() + timeoutMs;
    let lastError = null;
    while (Date.now() < deadline) {
      try {
        if (await this.evaluate(expression)) return true;
      } catch (error) {
        lastError = error;
      }
      await delay(250);
    }
    throw new Error(`${label} timed out: ${lastError?.message || "not ready"}`);
  }

  async screenshot(filePath) {
    const capture = await this.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    });
    fs.writeFileSync(filePath, Buffer.from(capture.data, "base64"));
  }

  close() {
    this.socket.close();
  }
}
