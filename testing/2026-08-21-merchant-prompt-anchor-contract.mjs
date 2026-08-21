import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  NPC_ACTIVITY_CONFIG,
  resolveNpcPromptY,
} from "../values/npcActivityConfig.js";

const groundY = 1000;
const productionSpriteSize = 94 * NPC_ACTIVITY_CONFIG.render.displayScale;
const legacyY = groundY
  - productionSpriteSize
  - NPC_ACTIVITY_CONFIG.render.promptGapPx;
const promptY = resolveNpcPromptY(groundY, productionSpriteSize);
assert.equal(promptY, groundY - NPC_ACTIVITY_CONFIG.render.promptGroundOffsetPx);
assert.ok(promptY > legacyY + 40, "prompt must move materially closer to the merchant");
assert.ok(groundY - promptY >= 94, "prompt must remain above the planted body focus");
assert.ok(groundY - promptY <= 120, "prompt must stay near the interaction focus");

assert.equal(
  resolveNpcPromptY(groundY, 50),
  groundY - 50 - NPC_ACTIVITY_CONFIG.render.promptGapPx,
  "small/fallback sprites must never push the prompt below their legacy top edge",
);

const managerSource = await readFile(
  new URL("../world/playScene/NPCManager.js", import.meta.url),
  "utf8",
);
assert.match(managerSource, /resolveNpcPromptY\(/);
assert.match(managerSource, /merchantInteractionRangeTiles/);
assert.doesNotMatch(managerSource, /pos\.y - spriteSize - NPC_ACTIVITY_CONFIG\.render\.promptGapPx/);

console.log("MERCHANT_PROMPT_ANCHOR_CONTRACT_OK");
