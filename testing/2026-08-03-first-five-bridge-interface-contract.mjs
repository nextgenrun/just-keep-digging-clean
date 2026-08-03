import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { FirstFiveMinutesTutorialBridge } from
  "../systems/onboarding/FirstFiveMinutesTutorialBridge.js";

const townSource = await readFile(
  new URL("../systems/onboarding/TownSquareTutorialSystem.js", import.meta.url),
  "utf8",
);
const calledMethods = [
  ...townSource.matchAll(/this\.firstFive\.([A-Za-z0-9_]+)\s*\(/g),
].map((match) => match[1]);

assert.ok(calledMethods.length > 0, "TownSquare tutorial should use the bridge");
for (const method of new Set(calledMethods)) {
  assert.equal(
    typeof FirstFiveMinutesTutorialBridge.prototype[method],
    "function",
    `TownSquare tutorial calls missing FirstFive bridge method: ${method}`,
  );
}
assert.doesNotMatch(
  townSource,
  /firstFive\.onFlightUnlocked/,
  "the removed legacy flight-unlock UI hook must not block PlayScene setup",
);

console.log("FIRST_FIVE_BRIDGE_INTERFACE_CONTRACT_OK");
