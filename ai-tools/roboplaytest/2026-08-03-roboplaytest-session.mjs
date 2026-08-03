import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const MIME_TYPES = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".webm": "video/webm",
  ".webp": "image/webp",
});

function loadDependency(name, explicitPath) {
  const attempts = [name, explicitPath].filter(Boolean);
  const errors = [];
  for (const candidate of attempts) {
    try {
      return require(candidate);
    } catch (error) {
      errors.push(`${candidate}: ${error.message}`);
    }
  }
  throw new Error(`Unable to load ${name}. Tried:\n${errors.join("\n")}`);
}

function resolveRequestPath(root, requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://local/").pathname);
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const resolved = path.resolve(root, relative);
  const rootPrefix = `${path.resolve(root)}${path.sep}`;
  return resolved.startsWith(rootPrefix) ? resolved : null;
}

function sendFile(request, response, filePath, stat) {
  const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  const range = request.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
  response.setHeader("Content-Type", contentType);
  response.setHeader("Accept-Ranges", "bytes");
  response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Number(range[2]) : stat.size - 1;
    if (start > end || end >= stat.size) {
      response.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
      response.end();
      return;
    }
    response.writeHead(206, {
      "Content-Length": end - start + 1,
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
    });
    if (request.method === "HEAD") response.end();
    else fs.createReadStream(filePath, { start, end }).pipe(response);
    return;
  }
  response.writeHead(200, { "Content-Length": stat.size });
  if (request.method === "HEAD") response.end();
  else fs.createReadStream(filePath).pipe(response);
}

async function startStaticServer(config) {
  const target = new URL(config.url);
  if (config.noServer || !["127.0.0.1", "localhost"].includes(target.hostname)) return null;
  const reachable = await fetch(target, { method: "HEAD" }).then(r => r.ok).catch(() => false);
  if (reachable) return null;

  const port = Number(target.port || 80);
  const server = http.createServer((request, response) => {
    const filePath = resolveRequestPath(config.root, request.url || "/");
    if (!filePath) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    fs.stat(filePath, (error, stat) => {
      if (error || !stat.isFile()) response.writeHead(404).end("Not found");
      else sendFile(request, response, filePath, stat);
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, target.hostname, resolve);
  });
  return server;
}

async function analyzePng(buffer, sharpPath) {
  let sharp;
  try {
    sharp = loadDependency("sharp", sharpPath);
  } catch (_) {
    return { available: false };
  }
  const { data, info } = await sharp(buffer)
    .resize(160, 90, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let sum = 0;
  let squareSum = 0;
  let nearBlack = 0;
  const buckets = new Set();
  for (let index = 0; index < data.length; index += info.channels) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sum += luminance;
    squareSum += luminance * luminance;
    if (luminance < 8) nearBlack += 1;
    buckets.add(`${r >> 4},${g >> 4},${b >> 4}`);
  }
  const pixels = data.length / info.channels;
  const mean = sum / pixels;
  return {
    available: true,
    meanLuminance: Number(mean.toFixed(2)),
    luminanceStdDev: Number(Math.sqrt(Math.max(0, squareSum / pixels - mean * mean)).toFixed(2)),
    nearBlackRatio: Number((nearBlack / pixels).toFixed(4)),
    colorBucketCount: buckets.size,
  };
}

export async function createRoboplaytestSession(config) {
  const server = await startStaticServer(config);
  const { chromium } = loadDependency("playwright", config.playwrightPath);
  const browserEvents = [];
  const browser = await chromium.launch({
    executablePath: config.edgePath,
    headless: !config.headed,
    args: [
      "--use-angle=swiftshader",
      "--autoplay-policy=no-user-gesture-required",
      "--disable-background-timer-throttling",
    ],
  });
  const context = await browser.newContext({ viewport: config.viewport });
  const page = await context.newPage();
  page.on("console", message => {
    if (["warning", "error"].includes(message.type())) {
      browserEvents.push({ kind: `console:${message.type()}`, message: message.text(), at: new Date().toISOString() });
    }
  });
  page.on("pageerror", error => {
    browserEvents.push({ kind: "pageerror", message: error.message, stack: error.stack, at: new Date().toISOString() });
  });
  page.on("requestfailed", request => {
    const failure = request.failure()?.errorText || "unknown";
    if (failure === "net::ERR_ABORTED" && ["media", "image"].includes(request.resourceType())) return;
    browserEvents.push({
      kind: "requestfailed",
      message: `${request.method()} ${request.url()} — ${failure}`,
      at: new Date().toISOString(),
    });
  });
  page.on("response", response => {
    if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) {
      browserEvents.push({ kind: "http", message: `${response.status()} ${response.url()}`, at: new Date().toISOString() });
    }
  });

  return {
    browser,
    browserEvents,
    context,
    page,
    async capture(filePath) {
      const buffer = await page.screenshot({ path: filePath, fullPage: true });
      return {
        path: filePath,
        bytes: buffer.length,
        sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
        visual: await analyzePng(buffer, config.sharpPath),
      };
    },
    async close() {
      await browser.close().catch(() => undefined);
      if (server) await new Promise(resolve => server.close(resolve));
    },
  };
}
