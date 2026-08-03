import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeGameUrl,
  parseRoboplaytestConfig,
} from "../ai-tools/roboplaytest/2026-08-03-roboplaytest-config.mjs";
import { buildSummaryMarkdown } from "../ai-tools/roboplaytest/2026-08-03-roboplaytest-report.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const launchPath = path.join(ROOT, "ai-tools", "2026-08-03-roboplaytest.mjs");
const readmePath = path.join(ROOT, "ai-tools", "roboplaytest", "readme.md");
const moduleRoot = path.join(ROOT, "ai-tools", "roboplaytest");
const harnessSource = fs.readFileSync(path.join(ROOT, "testing", "JkdE2EHarness.js"), "utf8");
const deepModules = [
  "2026-08-03-roboplaytest-deep-core.mjs",
  "2026-08-03-roboplaytest-deep-ui.mjs",
  "2026-08-03-roboplaytest-deep-world.mjs",
  "2026-08-03-roboplaytest-deep-scenarios.mjs",
];

assert.equal(fs.existsSync(launchPath), true, "date-stamped launcher must exist");
assert.equal(fs.existsSync(readmePath), true, "tool directory must explain usage and limits");
for (const file of deepModules) {
  const source = fs.readFileSync(path.join(moduleRoot, file), "utf8");
  assert.ok(source.split(/\r?\n/).length <= 301, `${file} must stay within the 300-line source limit`);
}

const url = new URL(normalizeGameUrl("http://127.0.0.1:9000/?nativeDensity=1"));
assert.equal(url.searchParams.get("jkd_e2e"), "1");
assert.equal(url.searchParams.get("nativeDensity"), "0");
assert.equal(url.searchParams.get("runtimeAssetQueue"), "1");
assert.equal(url.searchParams.get("runtimeAudioQueue"), "1");

const config = parseRoboplaytestConfig([
  "--url=http://127.0.0.1:8123/",
  "--output=C:/tmp/roboplaytest-contract",
  "--headed=1",
], new Date("2026-08-03T12:00:00.000Z"));
assert.equal(config.headed, true);
assert.equal(config.profile, "deep");
assert.equal(config.schema, "dig-game-roboplaytest@2");
assert.equal(config.noServer, true);
assert.equal(config.loadTimeoutMs, 240_000);
assert.equal(config.naturalDigMs, 90_000);
assert.equal(config.performanceThresholds.frameP95WarningMs, 50);
assert.match(config.runId, /^2026-08-03T12-00-00-000Z$/);


const critical = parseRoboplaytestConfig(["--profile=critical"]);
assert.equal(critical.profile, "critical");
assert.throws(() => parseRoboplaytestConfig(["--profile=wide"]), /deep or critical/);
assert.match(harnessSource, /dialogVisible: Boolean\(scene\.overlayManager\?\.shell\?\.root\?\.visible\)/);
const summary = buildSummaryMarkdown({
  status: "warning",
  url: config.url,
  durationMs: 10,
  profile: "deep",
  phases: [{ status: "pass", category: "runtime", title: "Boot", durationMs: 5, screenshot: null }],
  issues: [{ severity: "warning", source: "contract", message: "sample" }],
});
assert.match(summary, /Status: \*\*WARNING\*\*/);
assert.match(summary, /Fresh menu, movement/);
assert.match(summary, /Profile: deep/);
assert.match(summary, /runtime: 1\/1 passed/);
assert.match(summary, /\*\*WARNING\*\* \[contract\] sample/);

console.log("roboplaytest contract: PASS");
