import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TESTING_ROOT = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TESTING_ROOT, "..");
const SYSTEM_ROOTS = ["systems", "sound"];
const EXTERNAL_SYSTEM_ROOTS = ["world", "player", "ui"];
const EXCLUDED_TEST_TOKEN = "all-game-systems";

function walkFiles(directory, include) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(target, include));
    else if (entry.isFile() && include(target)) files.push(target);
  }
  return files;
}

const systemFiles = [
  ...SYSTEM_ROOTS.flatMap(root => walkFiles(
    path.join(ROOT, root),
    file => path.extname(file) === ".js",
  )),
  ...EXTERNAL_SYSTEM_ROOTS.flatMap(root => walkFiles(
    path.join(ROOT, root),
    file => path.basename(file).endsWith("System.js"),
  )),
];
const systemTokens = [...new Set(systemFiles.map(file => path.basename(file, ".js")))].sort();
const focusedTests = readdirSync(TESTING_ROOT, { withFileTypes: true })
  .filter(entry => (
    entry.isFile()
    && path.extname(entry.name) === ".mjs"
    && !entry.name.includes(EXCLUDED_TEST_TOKEN)
  ))
  .map(entry => {
    const file = path.join(TESTING_ROOT, entry.name);
    const source = readFileSync(file, "utf8");
    const systems = systemTokens.filter(token => source.includes(token));
    return { file, systems };
  })
  .filter(test => test.systems.length > 0);

const coveredSystems = new Set();
const failures = [];
let passed = 0;
for (const test of focusedTests) {
  test.systems.forEach(system => coveredSystems.add(system));
  const result = spawnSync(process.execPath, [test.file], { encoding: "utf8" });
  if (result.status === 0) {
    passed += 1;
    console.log(`[PASS] ${path.basename(test.file)} | systems=${test.systems.join(",")}`);
    continue;
  }
  const detail = (result.stderr || result.stdout || `exit ${result.status}`).trim();
  failures.push({ file: path.basename(test.file), systems: test.systems, detail });
  console.error(`[FAIL] ${path.basename(test.file)} | systems=${test.systems.join(",")}\n${detail}`);
}

const summary = {
  systemModules: systemFiles.length,
  behaviorReferencedSystems: coveredSystems.size,
  contracts: focusedTests.length,
  passed,
  failed: failures.length,
};
console.log(`SYSTEM_FOCUSED_CONTRACT_SUMMARY ${JSON.stringify(summary)}`);
if (failures.length) process.exitCode = 1;
