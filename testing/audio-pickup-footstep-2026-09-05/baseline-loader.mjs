// Run the saved pre-cleanup modules without swapping any live workspace files.
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const before = fileURLToPath(new URL("before/", import.meta.url));
registerHooks({ load(url, context, nextLoad) {
  if (url.startsWith("file:")) {
    const name = relative(root, fileURLToPath(url));
    const candidate = resolve(before, name.replaceAll("\\", "__").replaceAll("/", "__"));
    if (existsSync(candidate) && /\.m?js$/.test(candidate)) {
      return { format: "module", source: readFileSync(candidate, "utf8"), shortCircuit: true };
    }
  }
  return nextLoad(url, context);
} });
