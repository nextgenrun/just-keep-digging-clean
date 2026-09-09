import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WORLDROOT_GATE_B_CONFIG } from "../values/worldrootModuleArt.js";
import { WORLDROOT_WHITEBOX_CONFIG } from "../values/worldrootWhitebox.js";
import { runWorldrootNativeModuleBuilder } from
  "./2026-08-30-worldroot-native-module-builder.mjs";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const result = await runWorldrootNativeModuleBuilder({
  config: WORLDROOT_GATE_B_CONFIG,
  whiteboxConfig: WORLDROOT_WHITEBOX_CONFIG,
  projectRoot,
});
console.log(JSON.stringify(result, null, 2));
