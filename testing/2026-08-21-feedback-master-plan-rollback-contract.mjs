import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const rollback = await readFile(
  new URL("../tools/version-control/2026-08-21-rollback-feedback-master-plan.ps1", import.meta.url),
  "utf8",
);
const ledger = await readFile(
  new URL("../markdown/feedback-based-ai-planning/2026-08-21-implementation-ledger.md", import.meta.url),
  "utf8",
);
const toolReadme = await readFile(
  new URL("../tools/version-control/readme.md", import.meta.url),
  "utf8",
);

for (const required of [
  "Invoke-FeedbackMasterPlanRollback",
  "RedirectStandardOutput",
  "RedirectStandardError",
  "$startInfo.Arguments",
  "Windows PowerShell 5.1",
  "safety/2026-08-20-pre-feedback-master-plan",
  "ExpectedTargetCommit",
  "merge-base --is-ancestor",
  "--min-parents=2",
  "--porcelain=v1",
  "switch\", \"-c",
  "revert\", \"--no-commit",
  "write-tree",
  "Rollback tree mismatch",
  "codex/rollback-feedback-master-plan-",
]) {
  assert.ok(rollback.includes(required), `rollback function missing: ${required}`);
}

assert.doesNotMatch(rollback, /reset\s+--hard/i);
assert.doesNotMatch(rollback, /push\s+--force/i);
assert.doesNotMatch(rollback, /Remove-Item|rm\s+-rf/i);
assert.match(rollback, /if \(-not \$Apply\)[\s\S]*ConvertTo-Json/);
assert.match(rollback, /if \(\$dirty\)[\s\S]*Rollback refused/);
assert.match(rollback, /rollbackTree -ne \$baselineTree/);

assert.match(ledger, /db3a318cabc8c00a22beb86903a5d209d6b2192c/);
assert.match(ledger, /140 total obligations/);
assert.match(ledger, /2026-08-21-rollback-feedback-master-plan\.ps1/);
assert.match(toolReadme, /Rollback the feedback master plan/);

console.log("FEEDBACK_MASTER_PLAN_ROLLBACK_CONTRACT_OK");
