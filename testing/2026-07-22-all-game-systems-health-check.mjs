import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const THIS_FILE = fileURLToPath(import.meta.url);
const ENTRY_FILE = path.join(ROOT, "main.js");
const SYSTEM_SOURCE_ROOTS = ["systems", "sound"];
const EXTERNAL_SYSTEM_ROOTS = ["world", "player", "ui"];
const SCRIPT_EXTENSIONS = new Set([".js", ".mjs"]);

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

function relative(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function discoverSystemModules() {
  const files = SYSTEM_SOURCE_ROOTS.flatMap(root => (
    walkFiles(path.join(ROOT, root), file => path.extname(file) === ".js")
  ));
  for (const root of EXTERNAL_SYSTEM_ROOTS) {
    files.push(...walkFiles(
      path.join(ROOT, root),
      file => path.basename(file).endsWith("System.js"),
    ));
  }
  return [...new Set(files.map(file => path.resolve(file)))].sort();
}

function extractModuleSpecifiers(source) {
  const specifiers = new Set();
  const patterns = [
    /^\s*import\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/gm,
    /^\s*export\s+(?:\*|\{[\s\S]*?\})\s+from\s+["']([^"']+)["']/gm,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.add(match[1]);
  }
  return [...specifiers];
}

function resolveLocalImport(importer, specifier) {
  if (!specifier.startsWith(".")) return { external: true };
  const cleanSpecifier = specifier.split(/[?#]/, 1)[0];
  const unresolved = path.resolve(path.dirname(importer), cleanSpecifier);
  const candidates = path.extname(unresolved)
    ? [unresolved]
    : [unresolved, `${unresolved}.js`, `${unresolved}.mjs`, path.join(unresolved, "index.js")];
  const resolved = candidates.find(candidate => existsSync(candidate) && statSync(candidate).isFile());
  return resolved ? { resolved } : { unresolved };
}

function hasExactWorkspaceCase(file) {
  const workspaceRelative = path.relative(ROOT, file);
  if (workspaceRelative.startsWith("..") || path.isAbsolute(workspaceRelative)) return true;
  let cursor = ROOT;
  for (const segment of workspaceRelative.split(path.sep)) {
    if (!readdirSync(cursor).includes(segment)) return false;
    cursor = path.join(cursor, segment);
  }
  return true;
}

function inspectGraph(seeds) {
  const visited = new Set();
  const problems = [];
  const visit = file => {
    const resolvedFile = path.resolve(file);
    if (visited.has(resolvedFile) || !SCRIPT_EXTENSIONS.has(path.extname(resolvedFile))) return;
    visited.add(resolvedFile);
    const source = readFileSync(resolvedFile, "utf8");
    for (const specifier of extractModuleSpecifiers(source)) {
      const result = resolveLocalImport(resolvedFile, specifier);
      if (result.external) continue;
      if (!result.resolved) {
        problems.push(`${relative(resolvedFile)} -> ${specifier} (missing)`);
        continue;
      }
      if (!hasExactWorkspaceCase(result.resolved)) {
        problems.push(`${relative(resolvedFile)} -> ${specifier} (filename case mismatch)`);
      }
      visit(result.resolved);
    }
  };
  seeds.forEach(visit);
  return { visited, problems: [...new Set(problems)] };
}

function installBrowserStubs() {
  const storage = new Map();
  globalThis.window = globalThis;
  globalThis.location = { search: "" };
  globalThis.addEventListener = () => {};
  globalThis.removeEventListener = () => {};
  globalThis.localStorage = {
    getItem: key => storage.get(String(key)) ?? null,
    setItem: (key, value) => storage.set(String(key), String(value)),
    removeItem: key => storage.delete(String(key)),
    clear: () => storage.clear(),
  };
  globalThis.document = {
    addEventListener() {},
    removeEventListener() {},
    createElement: () => ({ style: {}, appendChild() {}, remove() {} }),
    body: { appendChild() {} },
  };
  class Scene {}
  class Game {
    constructor(config) {
      this.config = config;
    }
  }
  globalThis.Phaser = {
    AUTO: 0,
    WEBGL: 1,
    Scene,
    Game,
    Scale: { FIT: 0, CENTER_BOTH: 0 },
    BlendModes: { ADD: 1, SCREEN: 2 },
    Scenes: { Events: { UPDATE: "update", POST_UPDATE: "postupdate", SHUTDOWN: "shutdown" } },
    Animations: { Events: { ANIMATION_UPDATE: "animationupdate" } },
    Loader: { Events: { COMPLETE: "complete" } },
    Textures: { FilterMode: { LINEAR: 1, NEAREST: 0 } },
    Input: { Keyboard: { KeyCodes: {}, JustDown: () => false } },
    Math: {
      Clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
      Linear: (from, to, amount) => from + (to - from) * amount,
      Between: (min, max) => Math.round((min + max) / 2),
      FloatBetween: (min, max) => (min + max) / 2,
      DegToRad: degrees => degrees * Math.PI / 180,
      Vector2: class Vector2 { constructor(x = 0, y = 0) { this.x = x; this.y = y; } },
    },
  };
}

function syntaxProblem(file) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status === 0) return null;
  return (result.stderr || result.stdout || `exit ${result.status}`).trim().split(/\r?\n/)[0];
}

function lifecycleWarnings(source) {
  const warnings = [];
  const normalized = source.replace(/\?\.\s*\(/g, "(").replace(/\?\./g, ".");
  if (/\baddEventListener\s*\(/.test(normalized) && !/\bremoveEventListener\s*\(/.test(normalized)) {
    warnings.push("registers DOM listeners without visible cleanup symmetry");
  }
  const listenerOwners = new Set(
    [...normalized.matchAll(/\b(this(?:\.[A-Za-z_$][\w$]*)*?)\.on\s*\(/g)]
      .map(match => match[1]),
  );
  for (const owner of listenerOwners) {
    if (normalized.includes(`${owner}.off(`) || normalized.includes(`${owner}.destroy(`)) continue;
    const shutdownOwned = normalized.includes(`${owner}.once(`) && normalized.includes("SHUTDOWN");
    if (!shutdownOwned) warnings.push(`${owner} listener has no visible off/destroy symmetry`);
  }
  if (/\bsetInterval\s*\(/.test(source) && !/\bclearInterval\s*\(/.test(source)) {
    warnings.push("starts an interval without visible cleanup symmetry");
  }
  return warnings;
}

function focusedTestReferences(systemFiles) {
  const testFiles = readdirSync(path.join(ROOT, "testing"), { withFileTypes: true })
    .filter(entry => entry.isFile() && [".js", ".mjs", ".py"].includes(path.extname(entry.name)))
    .map(entry => path.join(ROOT, "testing", entry.name))
    .filter(file => path.resolve(file) !== path.resolve(THIS_FILE));
  const tests = testFiles.map(file => ({ file, source: readFileSync(file, "utf8") }));
  return new Map(systemFiles.map(file => {
    const token = path.basename(file);
    const sourcePath = relative(file);
    const references = tests.filter(test => (
      test.source.includes(token) || test.source.includes(sourcePath)
    ));
    return [file, references.map(test => relative(test.file))];
  }));
}

installBrowserStubs();
const systemFiles = discoverSystemModules();
const systemGraph = inspectGraph(systemFiles);
const entryGraph = inspectGraph([ENTRY_FILE]);
const focusedReferences = focusedTestReferences(systemFiles);
const failures = [];
const warnings = [];
const results = [];

if (systemFiles.length === 0) failures.push("system discovery returned zero modules");
for (const problem of systemGraph.problems) failures.push(`system dependency: ${problem}`);
for (const problem of entryGraph.problems) failures.push(`production entry: ${problem}`);

for (const file of systemFiles) {
  const source = readFileSync(file, "utf8");
  const errors = [];
  const syntax = syntaxProblem(file);
  if (syntax) errors.push(`syntax: ${syntax}`);
  let exports = [];
  try {
    const namespace = await import(pathToFileURL(file).href);
    exports = Object.keys(namespace);
    if (exports.length === 0) errors.push("module has no exports");
    if (path.basename(file).endsWith("System.js")
      && !Object.values(namespace).some(value => typeof value === "function")) {
      errors.push("system-named module has no callable export");
    }
  } catch (error) {
    errors.push(`module load: ${error?.message || error}`);
  }
  const moduleWarnings = lifecycleWarnings(source);
  if (!entryGraph.visited.has(file)) moduleWarnings.push("not reachable from main.js");
  errors.forEach(error => failures.push(`${relative(file)}: ${error}`));
  moduleWarnings.forEach(warning => warnings.push(`${relative(file)}: ${warning}`));
  results.push({
    file,
    errors,
    warnings: moduleWarnings,
    exports,
    focusedTests: focusedReferences.get(file) || [],
  });
}

let entryLoaded = false;
try {
  await import(pathToFileURL(ENTRY_FILE).href);
  entryLoaded = Array.isArray(globalThis.window.__phaserGame?.config?.scene)
    && globalThis.window.__phaserGame.config.scene.length > 0;
  if (!entryLoaded) failures.push("main.js loaded without constructing a scene-bearing Phaser.Game config");
} catch (error) {
  failures.push(`main.js module load: ${error?.message || error}`);
}

for (const result of results) {
  const status = result.errors.length ? "FAIL" : result.warnings.length ? "WARN" : "PASS";
  const notes = [...result.errors, ...result.warnings].join("; ") || "healthy";
  console.log(
    `[${status}] ${relative(result.file)} | exports=${result.exports.length}`
      + ` focused-tests=${result.focusedTests.length} | ${notes}`,
  );
}

const summary = {
  modules: systemFiles.length,
  syntaxPassed: results.filter(result => !result.errors.some(error => error.startsWith("syntax:"))).length,
  moduleLoadsPassed: results.filter(result => !result.errors.some(error => error.startsWith("module load:"))).length,
  runtimeReachable: results.filter(result => entryGraph.visited.has(result.file)).length,
  focusedTestReferenced: results.filter(result => result.focusedTests.length > 0).length,
  productionEntryLoaded: entryLoaded,
  warnings: warnings.length,
  failures: failures.length,
};

console.log(`SYSTEM_HEALTH_SUMMARY ${JSON.stringify(summary)}`);
if (warnings.length) console.warn(`System health warnings:\n- ${warnings.join("\n- ")}`);
if (failures.length) {
  console.error(`System health failures:\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("All game systems health check passed with no blocking failures.");
}
