import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "values", "tiledWorldOverrideData.js");
const apply = process.argv.includes("--apply");
const marker = "  runs: Object.freeze([";

const source = fs.readFileSync(target, "utf8");
const start = source.indexOf(marker);
if (start < 0) throw new Error("TILED override run list was not found");
const bodyStart = start + marker.length;
const bodyEnd = source.indexOf("  ]),", bodyStart);
if (bodyEnd < 0) throw new Error("TILED override run list terminator was not found");

const body = source.slice(bodyStart, bodyEnd);
const matches = [...body.matchAll(/-?\d+/g)];
if (matches.length % 3 !== 0) {
  throw new Error(`Expected flat run triples, found ${matches.length} values`);
}

const replacements = matches.filter((match, index) => (
  index % 3 === 2 && (match[0] === "27" || match[0] === "28")
));

if (!apply) {
  if (replacements.length > 0) {
    throw new Error(`${replacements.length} retired geode run(s) remain in ${target}`);
  }
  console.log("TILED_OVERRIDE_GEODE_SOURCE_CHECK_OK");
  process.exit(0);
}

let migratedBody = body;
for (const match of replacements.reverse()) {
  migratedBody = `${migratedBody.slice(0, match.index)}2${migratedBody.slice(match.index + match[0].length)}`;
}
const migratedSource = `${source.slice(0, bodyStart)}${migratedBody}${source.slice(bodyEnd)}`;
fs.writeFileSync(target, migratedSource);
console.log(`TILED_OVERRIDE_GEODE_SOURCE_MIGRATED=${replacements.length}`);
