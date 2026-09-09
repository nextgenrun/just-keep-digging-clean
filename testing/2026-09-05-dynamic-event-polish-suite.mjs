import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const tests = [
  "2026-09-05-wurm-variants-contract.mjs",
  "2026-09-05-earthquake-local-hazards-contract.mjs",
  "2026-09-05-shadow-mining-and-event-health-contract.mjs",
  "2026-09-05-event-feedback-controls-contract.mjs",
  "2026-09-06-dynamic-event-outcomes-contract.mjs",
  "2026-09-05-dynamic-event-admission-contract.mjs",
  "2026-07-26-graveborer-wurm-contract.mjs",
  "2026-07-28-graveborer-wurm-hud-contract.mjs",
  "2026-07-30-random-world-events-contract.mjs",
  "2026-08-30-shadow-miner-runtime-contract.mjs",
  "2026-08-30-shadow-miner-dynamic-behavior-contract.mjs",
  "2026-08-30-shadow-miner-presence-contract.mjs",
  "2026-08-30-earthquake-event-cohesion-contract.mjs",
  "2026-07-26-earthquake-feedback-lifecycle-contract.mjs",
];
const results = tests.map(file => {
  const result = spawnSync(process.execPath, ["testing/" + file], { encoding: "utf8", timeout: 120000 });
  return { file, passed: result.status === 0, exitCode: result.status,
    output: result.stdout.trim(), error: result.stderr.trim() };
});
const report = { createdAt: new Date().toISOString(), scope: "Focused controller and presentation contracts",
  browserEvidence: "testing/dynamic-event-sandbox/2026-09-05-polish-browser-proof.json",
  results, passed: results.filter(result => result.passed).length, total: results.length };
writeFileSync("testing/dynamic-event-sandbox/2026-09-05-polish-contract-results.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: report.passed, total: report.total,
  failures: results.filter(result => !result.passed) }, null, 2));
process.exitCode = report.passed === report.total ? 0 : 1;