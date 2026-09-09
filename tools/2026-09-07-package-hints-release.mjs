import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
const root = process.cwd(), work = path.join(root, ".tmp/hints-wiki-release");
const patch = JSON.parse(await fs.readFile(path.join(work, "patch-manifest.json"), "utf8"));
const output = path.join(work, "upload");
const files = {};
const hash = data => createHash("sha256").update(data).digest("hex");
async function write(relative, data) {
  const target = path.join(output, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data); files[relative] = hash(data);
}
for (const [relative, info] of Object.entries(patch.files)) {
  const data = await fs.readFile(path.join(work, "candidate", relative));
  if (hash(data) !== info.after) throw new Error(`Candidate drift: ${relative}`);
  await write(`game/${relative}`, data);
  await write(`game/${relative}.gz`, gzipSync(data, { level: 9 }));
}
async function wikiFiles(relative = "") {
  for (const entry of await fs.readdir(path.join(root, "game/undersstar-wiki", relative), { withFileTypes: true })) {
    const file = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await wikiFiles(file);
    else if (entry.isFile()) await write(`wiki/${file}`, await fs.readFile(path.join(root, "game/undersstar-wiki", file)));
    else throw new Error(`Unexpected wiki entry: ${file}`);
  }
}
await wikiFiles();
const manifest = { ...patch, gameFiles: patch.files, files,
  wikiBefore: JSON.parse(await fs.readFile(path.join(work, "before-wiki-hashes.json"), "utf8")) };
await fs.writeFile(path.join(output, "release-manifest.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ patchId: patch.patchId, gameModulesAndMetadata: Object.keys(patch.files).length,
  files: Object.keys(files).length, output }));
