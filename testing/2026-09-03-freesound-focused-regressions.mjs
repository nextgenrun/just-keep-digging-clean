import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

// The earlier focused list plus the current approval, timing and volume gates.
const root = new URL("../", import.meta.url);
const previous = JSON.parse(readFileSync(new URL("testing/audio-review-2026-09-03/focused-regressions.json", root)));
const tests = [...new Set([...previous.results.map(row => row.test),
  "2026-09-03-freesound-audio-timing-contract.mjs", "2026-09-03-freesound-audio-volume-contract.mjs"] )];
const results = tests.map(test => {
  const result = spawnSync(process.execPath, [new URL(`testing/${test}`, root).pathname.replace(/^\/(\w:)/, "$1")],
    { encoding: "utf8", timeout: 60000 });
  const passed = result.status === 0;
  console.log(`${passed ? "PASS" : "FAIL"} ${test}`);
  return { test, passed, exitCode: result.status, output: `${result.stdout || ""}${result.stderr || ""}`.trim() };
});
const report = { scope: "Focused audio, movement and threat regressions; not full repository health", checkedAt: new Date().toISOString(),
  total: results.length, passed: results.every(row => row.passed), results };
writeFileSync(new URL("testing/audio-review-2026-09-03/freesound-focused-regressions.json", root), JSON.stringify(report, null, 2) + "\n");
if (!report.passed) {
  for (const row of results.filter(result => !result.passed)) console.error(row.output);
  process.exitCode = 1;
}
