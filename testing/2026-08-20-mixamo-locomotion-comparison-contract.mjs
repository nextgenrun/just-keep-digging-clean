import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const draftRoot = path.join(root, "testing/blender-animation-lab-v1/review-drafts/mixamo-locomotion-comparison-v1");
const pageRoot = path.join(root, "testing/animation-sandbox/mixamo-locomotion-comparison-v1");
const config = JSON.parse(fs.readFileSync(path.join(draftRoot, "config.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(draftRoot, "renders/candidate-runtime/manifest.json"), "utf8"));
const report = JSON.parse(fs.readFileSync(path.join(draftRoot, "renders/raw-1024/render-report.json"), "utf8"));

const expectedClips = ["walk-loop", "run-loop", "crouch-walk", "jump-full", "falling-loop"];
assert.equal(config.reviewOnly, true);
assert.equal(config.productionChanged, false);
assert.equal(config.runtimeWired, false);
assert.deepEqual(Object.keys(config.clips), expectedClips);
assert.equal(manifest.productionChanged, false);
assert.equal(manifest.runtimeWired, false);
assert.equal(report.productionChanged, false);
assert.equal(report.sourceBlendChanged, false);

for (const id of expectedClips) {
  const spec = config.clips[id];
  const packed = manifest.clips[id];
  const rendered = report.clips[id];
  assert.ok(spec && packed && rendered, `${id}: complete config/render/pack record`);
  assert.ok(fs.existsSync(path.join(root, "testing/blender-animation-lab-v1/review-drafts/mixamo-library-v1/source-fbx", spec.source)), `${id}: source FBX exists`);
  for (const name of [packed.file, packed.preview, packed.contactSheet]) {
    assert.ok(fs.existsSync(path.join(draftRoot, "renders/candidate-runtime", name)), `${id}: ${name} exists`);
  }
  assert.equal(packed.maximumSuspiciousGreenPixels, 0, `${id}: no green-finger regression`);
  assert.ok(packed.minimumRawEdgeMarginPx >= 4, `${id}: no alpha clipping`);
  assert.ok(rendered.alignmentResidualWorld <= .22, `${id}: retarget residual gate`);
  assert.equal(packed.sourceRenderSizePx, 1024, `${id}: high-resolution source render`);
  assert.equal(packed.packedFrameSizePx, 256, `${id}: runtime-scale review pack`);
  assert.equal(packed.downsamplePasses, 1, `${id}: one downsample only`);
}

for (const relative of [
  "readme.md",
  "renders/readme.md",
  "renders/raw-1024/readme.md",
  "renders/candidate-runtime/readme.md",
]) assert.ok(fs.existsSync(path.join(draftRoot, relative)), `documented directory: ${relative}`);

const html = fs.readFileSync(path.join(pageRoot, "index.html"), "utf8");
const js = fs.readFileSync(path.join(pageRoot, "review.js"), "utf8");
assert.match(html, /review only · no runtime wiring/i);
assert.match(html, /Idle → startup → walk → run → slowdown → idle/);
assert.match(html, /Game scale 101–123 px/);
assert.match(js, /const storageKey = "dig-game-mixamo-locomotion-comparison-v1"/);
assert.match(js, /There is no current player jump mechanic/);
assert.equal((js.match(/\{ id: "/g) || []).length, 13, "all 13 locomotive review rows are present");

const runtimeRoots = ["js", "classes", "managers", "scenes", "systems", "values"];
const forbidden = ["mixamo-locomotion-comparison-v1", "survival-character-mixamo-locomotion-v1"];
function sourceFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : /\.(?:js|mjs)$/.test(entry.name) ? [target] : [];
  });
}
for (const file of runtimeRoots.flatMap(directory => sourceFiles(path.join(root, directory)))) {
  const source = fs.readFileSync(file, "utf8");
  for (const token of forbidden) assert.ok(!source.includes(token), `review candidate leaked into runtime: ${path.relative(root, file)} (${token})`);
}

console.log(`MIXAMO_LOCOMOTION_COMPARISON_OK clips=${expectedClips.length} rows=13 productionChanged=false runtimeWired=false`);
