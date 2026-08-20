import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PROOFS, PROOF_GROUPS } from "./animation-sandbox/mixamo-proof-audit-v3/proof-data.js";
import { CURRENT } from "./animation-sandbox/mixamo-atlas-v2/current-assets.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "animation-sandbox/mixamo-proof-audit-v3");
const page = await readFile(resolve(root, "index.html"), "utf8");
const review = await readFile(resolve(root, "review.js"), "utf8");
const manifest = JSON.parse(await readFile(resolve(root, "previews/manifest.json"), "utf8"));

assert.equal(PROOFS.length, 44, "audit must contain exactly 44 matched proofs");
assert.equal(new Set(PROOFS.map((proof) => proof.id)).size, 44, "proof ids must be unique");
assert.ok(PROOF_GROUPS.length >= 5, "audit should retain multiple game families");
assert.ok(PROOFS.every((proof) => proof.stage === "v4"), "generic/source scouts cannot enter proof audit");
assert.ok(PROOFS.every((proof) => proof.infiniteReplay === true), "all proof rows must declare infinite replay");
assert.ok(PROOFS.every((proof) => proof.preview.startsWith("./previews/")), "all proof media must be local V3 previews");
assert.ok(PROOFS.every((proof) => CURRENT[proof.currentKey]), "every proof needs an exact current runtime reference");
assert.equal(PROOFS.find((proof) => proof.id === "unarmed-jump-reference")?.currentKey, "jump", "jump challenger must use the current fixed jump reference");
assert.equal(PROOFS.find((proof) => proof.id === "unarmed-jump-reference")?.referenceOnly, false, "fixed jump is a current gameplay state");

assert.equal(manifest.reviewOnly, true);
assert.equal(manifest.productionChanged, false);
assert.equal(manifest.runtimeWired, false);
assert.equal(Object.keys(manifest.previews).length, 44);

for (const proof of PROOFS) {
  const name = proof.preview.split("/").pop();
  const entry = manifest.previews[name];
  assert.ok(entry, `missing preview manifest entry: ${name}`);
  assert.equal(entry.infiniteReplay, true, `${name} must be marked infinite`);
  const file = resolve(root, "previews", name);
  assert.ok((await stat(file)).size > 1000, `${name} is unexpectedly small`);
  const gif = await readFile(file);
  const extension = gif.indexOf(Buffer.from("NETSCAPE2.0", "ascii"));
  assert.ok(extension >= 0, `${name} is missing a GIF loop extension`);
  assert.deepEqual([...gif.subarray(extension + 11, extension + 16)], [3, 1, 0, 0, 0], `${name} is not encoded for infinite replay`);
}

assert.match(page, /Generic Mixamo characters are excluded/);
assert.match(page, /no runtime wiring/i);
assert.match(review, /productionChanged:\s*false/);
assert.match(review, /runtimeWired:\s*false/);
assert.match(review, /genericPreviewCount:\s*0/);
assert.doesNotMatch(review, /sourceGif/);
assert.doesNotMatch(page + review, /no player jump|no gameplay state/i);

console.log(`MIXAMO_PROOF_AUDIT_V3_OK proofs=${PROOFS.length} families=${PROOF_GROUPS.length} infinite=${PROOFS.length} generic=0 productionChanged=false runtimeWired=false`);
