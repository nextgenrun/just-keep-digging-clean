import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const ROBOPLAYTEST_ROOT = path.resolve(HERE, "../..");
export const ROBOPLAYTEST_SCHEMA = "dig-game-roboplaytest@2";
export const DEFAULT_EDGE_PATH = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
export const DEFAULT_PLAYWRIGHT_PATH = path.join(
  os.homedir(),
  ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
export const DEFAULT_SHARP_PATH = path.join(
  os.homedir(),
  ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp",
);

const HELP = `
Dig Game RoboPlaytest

Usage:
  node ai-tools/2026-08-03-roboplaytest.mjs [options]

Options:
  --url=<url>                 Existing game URL (default starts an isolated local server)
  --output=<directory>        Artifact directory (default: OS temp directory)
  --edge=<path>               Edge/Chromium executable
  --profile=<deep|critical|opening|ui|human> Coverage profile (default: deep)
  --viewport-width=<number>  Browser viewport width (default: 1280)
  --viewport-height=<number> Browser viewport height (default: 720)
  --tutorial=<guided|skip>    Fresh-save opening route (default: skip)
  --headed=1                  Show the automated browser
  --no-server=1               Never start the built-in local server
  --load-timeout-ms=<number>  Boot/world-load timeout (default: 240000)
  --phase-timeout-ms=<number> Per-action timeout (default: 30000)
  --natural-dig-ms=<number>   Maximum real-input mining hold (default: 90000)
  --goal-money=<number>       Human campaign wallet goal in M (default: 2000)
  --human-cycles=<number>     Maximum mine/sell campaign cycles (default: 36)
  --fail-on-warning=1         Return failure when only warnings were found
  --help                      Show this help

The default deep run uses a clean browser context and ?jkd_e2e=1, so real
browser saves are not read or changed. It combines real keyboard play with
catalog, UI, environment, event, progression, save-contract, and visual sweeps.
Long progression spans are accelerated and marked in report.json. Use
--profile=critical for only the beginning-to-end critical path.
`.trim();

function optionMap(argv) {
  const result = new Map();
  for (const entry of argv) {
    if (!entry.startsWith("--")) continue;
    const separator = entry.indexOf("=");
    if (separator < 0) result.set(entry.slice(2), "1");
    else result.set(entry.slice(2, separator), entry.slice(separator + 1));
  }
  return result;
}

function integerOption(options, name, fallback, minimum) {
  const raw = options.get(name);
  if (raw === undefined) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < minimum) {
    throw new Error(`--${name} must be an integer >= ${minimum}`);
  }
  return value;
}

function booleanOption(options, name, fallback = false) {
  const raw = options.get(name);
  if (raw === undefined) return fallback;
  return !["0", "false", "off", "no"].includes(String(raw).toLowerCase());
}

function createRunId(now = new Date()) {
  return now.toISOString().replace(/[:.]/g, "-");
}

export function normalizeGameUrl(rawUrl, gameplayProfile = "full-review") {
  const url = new URL(rawUrl);
  url.searchParams.set("jkd_e2e", "1");
  url.searchParams.set("nativeDensity", "0");
  url.searchParams.set("runtimeAssetQueue", "1");
  url.searchParams.set("runtimeAudioQueue", "1");
  url.searchParams.set("gameplayProfile", gameplayProfile);
  return url.toString();
}

export function parseRoboplaytestConfig(argv = process.argv.slice(2), now = new Date()) {
  const options = optionMap(argv);
  if (options.has("help")) return { help: true, helpText: HELP };

  const runId = createRunId(now);
  const suppliedUrl = options.get("url");
  const profile = String(options.get("profile") || "deep").toLowerCase();
  if (!["deep", "critical", "opening", "ui", "human"].includes(profile)) {
    throw new Error("--profile must be deep, critical, opening, ui, or human");
  }
  const tutorial = String(options.get("tutorial") || "skip").toLowerCase();
  if (!["guided", "skip"].includes(tutorial)) {
    throw new Error("--tutorial must be guided or skip");
  }
  const baseUrl = suppliedUrl || "http://127.0.0.1:8092/";
  const output = path.resolve(
    options.get("output") || path.join(os.tmpdir(), "dig-game-roboplaytest", runId),
  );

  return {
    help: false,
    schema: ROBOPLAYTEST_SCHEMA,
    runId,
    root: ROBOPLAYTEST_ROOT,
    url: normalizeGameUrl(
      baseUrl,
      profile === "opening" || profile === "human" ? "demo" : "full-review",
    ),
    output,
    edgePath: path.resolve(options.get("edge") || DEFAULT_EDGE_PATH),
    headed: booleanOption(options, "headed"),
    noServer: booleanOption(options, "no-server", Boolean(suppliedUrl)),
    profile,
    tutorial,
    failOnWarning: booleanOption(options, "fail-on-warning"),
    loadTimeoutMs: integerOption(options, "load-timeout-ms", 240_000, 10_000),
    phaseTimeoutMs: integerOption(options, "phase-timeout-ms", 30_000, 1_000),
    naturalDigMs: integerOption(options, "natural-dig-ms", 90_000, 1_000),
    goalMoney: integerOption(options, "goal-money", 2_000, 100),
    humanCycles: integerOption(options, "human-cycles", 36, 4),
    playwrightPath: options.get("playwright") || DEFAULT_PLAYWRIGHT_PATH,
    sharpPath: options.get("sharp") || DEFAULT_SHARP_PATH,
    viewport: Object.freeze({
      width: integerOption(options, "viewport-width", 1280, 800),
      height: integerOption(options, "viewport-height", 720, 600),
    }),
    performanceThresholds: Object.freeze({
      frameP95WarningMs: 50,
      onePercentLowWarningFps: 20,
    }),
  };
}

export function roboplaytestHelp() {
  return HELP;
}
