import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE_PATH = path.join(ROOT, "testing", "2026-08-12-architecture-baseline.json");
const SOURCE_ROOTS = Object.freeze(["values", "systems", "sound", "world", "player", "ui"]);
const LAYERS = Object.freeze({ values: 0, systems: 1, sound: 1, world: 2, player: 2, ui: 3 });
const SKIP_DIRECTORIES = new Set(["archive", "generated", "library-v2", "playlists", "soundEffects", "voice-lines"]);
const MAX_MODULE_LINES = 300;
const ALLOWED_STORAGE_WRITERS = new Set([
  "systems/UserSettings.js",
  "systems/save-system/SaveBackupManager.js",
  "world/model/DugTilesSaveStore.js",
]);
const IMPORT_PATTERNS = Object.freeze([
  /^\s*import\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/gm,
  /^\s*export\s+(?:\*|\{[\s\S]*?\})\s+from\s+["']([^"']+)["']/gm,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
]);

function toRelative(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function walk(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(target));
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(path.resolve(target));
  }
  return files;
}

function readSource(file) {
  return readFileSync(file, "utf8");
}

function extractSpecifiers(source) {
  const values = new Set();
  for (const pattern of IMPORT_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) values.add(match[1]);
  }
  return [...values];
}

function resolveImport(importer, specifier) {
  if (!specifier.startsWith(".")) return null;
  const clean = specifier.split(/[?#]/, 1)[0];
  const unresolved = path.resolve(path.dirname(importer), clean);
  const candidates = path.extname(unresolved)
    ? [unresolved]
    : [unresolved, `${unresolved}.js`, `${unresolved}.mjs`, path.join(unresolved, "index.js")];
  return candidates.find(candidate => existsSync(candidate) && statSync(candidate).isFile()) || "";
}

function buildGraph(files) {
  const fileSet = new Set(files);
  const graph = new Map(files.map(file => [file, []]));
  const missing = [];
  const layerViolations = [];
  for (const file of files) {
    for (const specifier of extractSpecifiers(readSource(file))) {
      const target = resolveImport(file, specifier);
      if (target === null) continue;
      if (!target) {
        missing.push(`${toRelative(file)} -> ${specifier}`);
        continue;
      }
      if (fileSet.has(target)) graph.get(file).push(target);
      const sourceRoot = toRelative(file).split("/", 1)[0];
      const targetRoot = toRelative(target).split("/", 1)[0];
      if (LAYERS[targetRoot] > LAYERS[sourceRoot]) {
        layerViolations.push(`${toRelative(file)} -> ${toRelative(target)}`);
      }
    }
  }
  return { graph, missing: [...new Set(missing)].sort(), layerViolations: [...new Set(layerViolations)].sort() };
}

function findCycles(graph) {
  const state = new Map();
  const stack = [];
  const cycles = new Set();
  const visit = file => {
    if (state.get(file) === 2) return;
    if (state.get(file) === 1) {
      const start = stack.indexOf(file);
      cycles.add([...stack.slice(start), file].map(toRelative).join(" -> "));
      return;
    }
    state.set(file, 1);
    stack.push(file);
    for (const target of graph.get(file) || []) visit(target);
    stack.pop();
    state.set(file, 2);
  };
  for (const file of graph.keys()) visit(file);
  return [...cycles].sort();
}

function reachableFromEntry(graph) {
  const entry = path.join(ROOT, "main.js");
  const reached = new Set();
  const pending = [entry];
  while (pending.length) {
    const file = pending.pop();
    if (reached.has(file) || !existsSync(file)) continue;
    reached.add(file);
    for (const specifier of extractSpecifiers(readSource(file))) {
      const target = resolveImport(file, specifier);
      if (target) pending.push(target);
    }
  }
  return reached;
}

function countMatches(source, pattern) {
  pattern.lastIndex = 0;
  return [...source.matchAll(pattern)].length;
}

function classifyUnreachable(relativePath) {
  if (/review|mockup|legacy/i.test(relativePath)) return "review-only";
  if (/secondWorld|levelTwo|heaven|arcCore|screenRecord/i.test(relativePath)) return "gated";
  return "gated";
}

function createSnapshot(files, graphData) {
  const reached = reachableFromEntry(graphData.graph);
  const oversizedModules = {};
  const stateWriterCounts = {};
  const localStorageWriterCounts = {};
  const unreachableModules = {};
  for (const file of files) {
    const relativePath = toRelative(file);
    const source = readSource(file);
    const lines = source.split(/\r?\n/).length;
    if (lines > MAX_MODULE_LINES) oversizedModules[relativePath] = lines;
    const stateWrites = countMatches(source, /\.(?:gameState|paused|isInDialogue|isInShop)\s*=(?!=)/g);
    if (stateWrites) stateWriterCounts[relativePath] = stateWrites;
    const storageWrites = countMatches(
      source,
      /\blocalStorage\b[\s\S]{0,80}?\??\.(?:setItem|removeItem)\??\s*\(/g,
    );
    if (storageWrites) localStorageWriterCounts[relativePath] = storageWrites;
    if (!reached.has(file)) unreachableModules[relativePath] = classifyUnreachable(relativePath);
  }
  return {
    schemaVersion: 1,
    oversizedModules,
    layerViolations: graphData.layerViolations,
    stateWriterCounts,
    localStorageWriterCounts,
    unreachableModules,
  };
}

function assertNoNewMapEntries(actual, expected, label) {
  const newEntries = Object.keys(actual).filter(key => !(key in expected));
  assert.deepEqual(newEntries, [], `New ${label}: ${newEntries.join(", ")}`);
  const increases = Object.entries(actual)
    .filter(([key, value]) => Number.isFinite(value) && value > Number(expected[key]));
  assert.deepEqual(increases, [], `${label} increased: ${JSON.stringify(increases)}`);
}

const files = SOURCE_ROOTS.flatMap(root => walk(path.join(ROOT, root))).sort();
const graphData = buildGraph(files);
const snapshot = createSnapshot(files, graphData);

if (process.argv.includes("--print-baseline")) {
  console.log(JSON.stringify(snapshot, null, 2));
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
assert.deepEqual(graphData.missing, [], `Missing imports: ${graphData.missing.join(", ")}`);
assert.deepEqual(findCycles(graphData.graph), [], "Circular module dependencies detected");
assert.deepEqual(
  snapshot.layerViolations.filter(item => !baseline.layerViolations.includes(item)),
  [],
  "New import-direction violation detected",
);
assertNoNewMapEntries(snapshot.oversizedModules, baseline.oversizedModules, "oversized modules");
assertNoNewMapEntries(snapshot.stateWriterCounts, baseline.stateWriterCounts, "direct scene-state writers");
assertNoNewMapEntries(snapshot.localStorageWriterCounts, baseline.localStorageWriterCounts, "localStorage writers");
assert.deepEqual(
  Object.keys(snapshot.localStorageWriterCounts)
    .filter(relativePath => !ALLOWED_STORAGE_WRITERS.has(relativePath)),
  [],
  "Direct localStorage writes must stay inside settings or save repositories",
);
assertNoNewMapEntries(snapshot.unreachableModules, baseline.unreachableModules, "unclassified unreachable modules");

console.log(`ARCHITECTURE_RATCHET_OK modules=${files.length} layers=${snapshot.layerViolations.length} oversized=${Object.keys(snapshot.oversizedModules).length} unreachable=${Object.keys(snapshot.unreachableModules).length}`);
