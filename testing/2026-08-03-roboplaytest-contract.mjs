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
const driverSource = fs.readFileSync(
  path.join(moduleRoot, "2026-08-03-roboplaytest-driver.mjs"),
  "utf8",
);
const guidedOpeningSource = fs.readFileSync(
  path.join(moduleRoot, "2026-08-13-roboplaytest-guided-opening.mjs"),
  "utf8",
);
const humanCampaignSource = fs.readFileSync(
  path.join(moduleRoot, "2026-08-14-roboplaytest-human-campaign.mjs"),
  "utf8",
);
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
assert.equal(url.searchParams.get("gameplayProfile"), "full-review");

const config = parseRoboplaytestConfig([
  "--url=http://127.0.0.1:8123/",
  "--output=C:/tmp/roboplaytest-contract",
  "--headed=1",
], new Date("2026-08-03T12:00:00.000Z"));
assert.equal(config.headed, true);
assert.equal(config.profile, "deep");
assert.equal(config.tutorial, "skip");
assert.equal(config.schema, "dig-game-roboplaytest@2");
assert.equal(config.noServer, true);
assert.equal(config.loadTimeoutMs, 240_000);
assert.equal(config.naturalDigMs, 90_000);
assert.equal(config.performanceThresholds.frameP95WarningMs, 50);
assert.match(config.runId, /^2026-08-03T12-00-00-000Z$/);

const guidedConfig = parseRoboplaytestConfig(["--tutorial=guided"]);
assert.equal(guidedConfig.tutorial, "guided");
assert.throws(() => parseRoboplaytestConfig(["--tutorial=fast"]), /guided or skip/);


const critical = parseRoboplaytestConfig(["--profile=critical"]);
assert.equal(critical.profile, "critical");
const opening = parseRoboplaytestConfig(["--profile=opening"]);
assert.equal(opening.profile, "opening");
assert.equal(new URL(opening.url).searchParams.get("gameplayProfile"), "demo");
const ui = parseRoboplaytestConfig(["--profile=ui"]);
assert.equal(ui.profile, "ui");
const human = parseRoboplaytestConfig(["--profile=human", "--goal-money=2000"]);
assert.equal(human.profile, "human");
assert.equal(human.goalMoney, 2000);
assert.equal(human.humanStage, "full");
assert.equal(new URL(human.url).searchParams.get("gameplayProfile"), "demo");
const focusedHuman = parseRoboplaytestConfig(["--profile=human", "--human-stage=abilities"]);
assert.equal(focusedHuman.humanStage, "abilities");
assert.throws(() => parseRoboplaytestConfig(["--human-stage=fast"]), /full or abilities/);
assert.throws(() => parseRoboplaytestConfig(["--profile=wide"]), /deep, critical, opening, ui, or human/);
assert.match(harnessSource, /dialogVisible: Boolean\(scene\.overlayManager\?\.shell\?\.root\?\.visible\)/);
assert.match(harnessSource, /isLocalGameplayProfileHost/);
assert.match(harnessSource, /__DIG_GAME_PRODUCTION__ === true/);
assert.match(driverSource, /prepareGuidedTutorialMineTarget/);
assert.match(guidedOpeningSource, /stage === "dig"/);
assert.match(humanCampaignSource, /humanPress\(driver\.page, "e", 1_000\)/);
assert.match(humanCampaignSource, /closeAfter: nextMerchant !== merchant/);
assert.doesNotMatch(humanCampaignSource, /\["gearMerchant", "bronzePickaxe"\]/);
assert.match(humanCampaignSource, /getGemPowerExact\(\) >= abilities\.getThunderStrikeCost\(\)/);
assert.match(humanCampaignSource, /TILE_TYPES\.GEM_POWER_BLOCK/);
assert.match(humanCampaignSource, /Mining a Gem Power block did not restore Gem Power/);
assert.match(humanCampaignSource, /for \(let attempt = 0; attempt < 3; attempt \+= 1\)/);
assert.match(humanCampaignSource, /__roboplaytestGemPowerRestores/);
assert.match(humanCampaignSource, /Quick Slash release/);
assert.match(humanCampaignSource, /idle action lane before Thunder Strike/);
assert.match(humanCampaignSource, /Thunder Strike paid impact/);
assert.match(humanCampaignSource, /human-abilities-focused/);
assert.match(humanCampaignSource, /state\.level >= 20/);
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
