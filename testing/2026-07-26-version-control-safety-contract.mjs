import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const flags = new Set(process.argv.slice(2));
const maxGitBlobBytes = 95 * 1024 * 1024;
const maxLfsObjectBytes = 2 * 1024 * 1024 * 1024;

function runGit(args, input = undefined, allowFailure = false) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    input,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`git ${args.join(" ")} failed:\n${result.stderr || result.stdout}`);
  }
  return result;
}

function read(relativePath) {
  const absolutePath = resolve(root, relativePath);
  assert.ok(existsSync(absolutePath), `missing ${relativePath}`);
  return readFileSync(absolutePath, "utf8");
}

function nulPaths(output) {
  return output.split("\0").filter(Boolean);
}

const attributes = read(".gitattributes");
const ignore = read(".gitignore");
const policy = read("markdown/version-control/version-control.md");
const workflow = read(".github/workflows/repository-integrity.yml");

for (const pattern of [
  "/testing/blender-animation-lab-v1/**/*.blend",
  "/testing/unreal-survival-motion-v2/**/*.fbx",
  "/testing/unreal-survival-motion-v2/**/*.uasset",
  "/sprites/character/survival-character-fab-v1/source/**/*.png",
  "/sprites/backgrounds/world-v11-test/**/*.png",
]) {
  assert.ok(
    attributes.split(/\r?\n/).some((line) => line.startsWith(`${pattern} `) && line.includes("filter=lfs")),
    `missing scoped LFS rule: ${pattern}`,
  );
}
for (const rule of [".git-safety/", "dist-*/", "*.blend[0-9]*", "tools/video-audio-mcp/"]) {
  assert.ok(ignore.includes(rule), `missing ignore rule: ${rule}`);
}
for (const phrase of [
  "Tier 3: GitHub",
  "Fast-forward-only",
  "Repository safety reports",
  "git reflog",
  "git revert",
]) {
  assert.ok(policy.includes(phrase), `version-control policy is missing: ${phrase}`);
}
assert.match(workflow, /name:\s*Repository Integrity/);
assert.match(workflow, /2026-07-26-version-control-safety-contract\.mjs --tracked-only/);

const runtimeMediaPaths = [
  "sprites/backgrounds/world-v11-runtime-polished-v4/depth-chunks/level1-r001-c01.webp",
  "sprites/character/ual-native-player-v1/runtime/ual-native-player-v1-idle-sheet.webp",
  "testing/blender-animation-lab-v1/review-drafts/superman-flight-push-layer-v1/runtime/superman-flight-sheet.png",
  "visual-approval-previews/npc-idle-polish-v1/bobo-merchant-idle-alpha.webm",
];
const runtimeAttributes = runGit([
  "check-attr",
  "filter",
  "--",
  ...runtimeMediaPaths,
]).stdout;
assert.ok(
  !runtimeAttributes.split(/\r?\n/).some((line) => line.endsWith(": filter: lfs")),
  "browser/runtime media must remain available without an LFS download",
);

let candidatePaths;
if (flags.has("--staged")) {
  candidatePaths = nulPaths(runGit([
    "diff",
    "--cached",
    "--name-only",
    "--diff-filter=ACMR",
    "-z",
  ]).stdout);
} else if (flags.has("--tracked-only")) {
  candidatePaths = nulPaths(runGit(["ls-files", "-z"]).stdout);
} else {
  candidatePaths = nulPaths(runGit([
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
  ]).stdout);
}

const existingPaths = candidatePaths.filter((relativePath) =>
  existsSync(resolve(root, relativePath)),
);
const oversizedWorkingFiles = existingPaths.filter((relativePath) =>
  statSync(resolve(root, relativePath)).isFile() &&
  statSync(resolve(root, relativePath)).size >= maxGitBlobBytes,
);

if (oversizedWorkingFiles.length) {
  const attrInput = `${oversizedWorkingFiles.join("\n")}\n`;
  const attrOutput = runGit(["check-attr", "filter", "--stdin"], attrInput).stdout;
  const lfsPaths = new Set(
    attrOutput
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((line) => line.endsWith(": lfs"))
      .map((line) => line.slice(0, line.indexOf(": filter:"))),
  );

  for (const relativePath of oversizedWorkingFiles) {
    const bytes = statSync(resolve(root, relativePath)).size;
    assert.ok(bytes < maxLfsObjectBytes, `${relativePath} exceeds the 2 GiB LFS limit`);
    assert.ok(lfsPaths.has(relativePath), `${relativePath} must use Git LFS`);
  }
}

if (flags.has("--staged")) {
  const stagedEntries = nulPaths(runGit([
    "ls-files",
    "--stage",
    "-z",
    "--",
    ...candidatePaths,
  ]).stdout);
  const stagedObjectIds = [...new Set(stagedEntries
    .map((entry) => entry.split(/\s+/, 3)[1])
    .filter(Boolean))];
  const stagedObjectChecks = runGit(
    ["cat-file", "--batch-check=%(objecttype) %(objectname) %(objectsize)"],
    `${stagedObjectIds.join("\n")}\n`,
  ).stdout.split(/\r?\n/).filter(Boolean);
  for (const [type, objectId, size] of stagedObjectChecks
    .map((line) => line.split(/\s+/))) {
    assert.notEqual(type, "missing", `staged Git object is missing: ${objectId}`);
    if (type === "blob") {
      assert.ok(
        Number.parseInt(size, 10) < maxGitBlobBytes,
        `staged Git blob exceeds 95 MiB: ${objectId}`,
      );
    }
  }
}

const trackedBlendBackups = candidatePaths.filter((relativePath) =>
  /\.blend\d+$/i.test(relativePath),
);
assert.deepEqual(trackedBlendBackups, [], "Blender numbered autosaves must remain local");
assert.ok(
  !candidatePaths.some((relativePath) => relativePath.startsWith("tools/video-audio-mcp/")),
  "the third-party video-audio MCP checkout must not be embedded",
);

const headObjectIds = runGit(["rev-list", "--objects", "HEAD"]).stdout
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => line.split(/\s+/, 1)[0]);
const headObjectChecks = runGit(
  ["cat-file", "--batch-check=%(objecttype) %(objectname) %(objectsize)"],
  `${headObjectIds.join("\n")}\n`,
).stdout.split(/\r?\n/).filter(Boolean);
const oversizedHeadBlobs = headObjectChecks
  .map((line) => line.split(/\s+/))
  .filter(([type, , size]) =>
    type === "blob" && Number.parseInt(size, 10) >= maxGitBlobBytes,
  )
  .map(([, objectId, size]) => `${objectId} (${size} bytes)`);
assert.deepEqual(oversizedHeadBlobs, [], `HEAD contains oversized Git blobs: ${oversizedHeadBlobs.join(", ")}`);

console.log(
  `PASS: version-control safety contract; checked ${candidatePaths.length} paths, ` +
  `${oversizedWorkingFiles.length} large files use LFS`,
);
