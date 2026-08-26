import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { COMPLEX_DIG_ANIMATIONS } from "../values/complexDigAnimations.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDirectory = join(
  root,
  "testing/blender-animation-lab-v1/review-drafts/mixamo-punch-sequence-sandbox-v1/renders/candidate",
);
const runtimeDirectory = join(
  root,
  "sprites/character/survival-character-blender-v2/runtime",
);
const sourceManifest = JSON.parse(await readFile(join(sourceDirectory, "manifest.json"), "utf8"));
const sourceIds = Object.freeze({
  cross: "cross",
  jab: "jab",
  roundhouse: "kick-roundhouse",
  jabElbow: "jab-elbow",
  lowKick: "kick-low",
  highKick: "kick-high",
  spinningBackKick: "kick-spinning-back",
  elbowUppercut: "elbow-uppercut",
  singleElbow: "elbow-single",
  hook: "hook",
  uppercut: "uppercut",
});

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const clips = {};
for (const [configId, sourceId] of Object.entries(sourceIds)) {
  const clip = COMPLEX_DIG_ANIMATIONS.clips[configId];
  const source = sourceManifest.clips[sourceId];
  if (!clip || !source) throw new Error(`Missing complex-dig source mapping: ${configId}`);
  const sourceBytes = await readFile(join(sourceDirectory, source.file));
  const sourceSha256 = sha256(sourceBytes);
  if (sourceSha256 !== source.sheetSha256) {
    throw new Error(`${source.file} no longer matches the reviewed source manifest`);
  }
  const runtimeBytes = await readFile(join(runtimeDirectory, clip.fileName));
  const runtimeSha256 = sha256(runtimeBytes);
  clips[configId] = {
    sourceId,
    sourceFile: source.file,
    runtimeFile: clip.fileName,
    sheetKey: clip.sheetKey,
    animationKey: clip.animationKey,
    frames: clip.frames,
    frameRate: clip.frameRate,
    contact: clip.contact,
    origin: clip.origin,
    runtimeBytes: runtimeBytes.length,
    sha256: runtimeSha256,
    sourceSha256,
    runtimeToneMatchedInPiskel: true,
    sourceRenderSizePx: source.sourceRenderSizePx,
    packedFrameSizePx: source.packedFrameSizePx,
    downsamplePasses: source.downsamplePasses,
    maximumSuspiciousGreenPixels: source.maximumSuspiciousGreenPixels,
    piskelSource: `${COMPLEX_DIG_ANIMATIONS.visualPolish.editableSourceDirectory}/${clip.id}.piskel`,
  };
}

const output = {
  version: COMPLEX_DIG_ANIMATIONS.version,
  generatedAt: "2026-08-21",
  runtimeWired: true,
  enabledByDefault: COMPLEX_DIG_ANIMATIONS.enabledByDefault,
  rollbackQuery: `?${COMPLEX_DIG_ANIMATIONS.rollbackQuery}=0`,
  runtimeGlobal: COMPLEX_DIG_ANIMATIONS.runtimeGlobal,
  hotkey: "Ctrl+Alt+9",
  gameplayAuthority: "Existing target tile, collider, first-contact cooldown/cost and action cadence remain authoritative; authored multi-contact clips expose each reviewed hit without duplicating Heavy Punch or ability cost.",
  displaySizePx: COMPLEX_DIG_ANIMATIONS.displaySizePx,
  visualPolish: {
    ...COMPLEX_DIG_ANIMATIONS.visualPolish,
    report: `${COMPLEX_DIG_ANIMATIONS.visualPolish.editableSourceDirectory}/complex-dig-piskel-polish-v2-report.json`,
  },
  sideSequence: COMPLEX_DIG_ANIMATIONS.sideSequence,
  upSequence: COMPLEX_DIG_ANIMATIONS.upSequence,
  sourceManifest: relative(root, join(sourceDirectory, "manifest.json")).replaceAll("\\", "/"),
  clips,
};
await writeFile(
  join(runtimeDirectory, "mixamo-complex-dig-runtime-v1-manifest.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(`COMPLEX_DIG_RUNTIME_MANIFEST_OK clips=${Object.keys(clips).length}`);
