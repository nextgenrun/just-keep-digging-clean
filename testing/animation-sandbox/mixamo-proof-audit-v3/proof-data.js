import { GROUPS } from "../mixamo-atlas-v2/atlas-schema.js";
import { GROUND } from "../mixamo-atlas-v2/data-ground.js";
import { CROUCH } from "../mixamo-atlas-v2/data-crouch.js";
import { AIR } from "../mixamo-atlas-v2/data-air.js";
import { COMBAT } from "../mixamo-atlas-v2/data-combat.js";
import { ABILITIES } from "../mixamo-atlas-v2/data-abilities.js";
import { REACTIONS } from "../mixamo-atlas-v2/data-reactions.js";
import { IDLES } from "../mixamo-atlas-v2/data-idle.js";

const sourceFamily = (path) => {
  if (path.includes("mixamo-library-v1")) return "library";
  if (path.includes("mixamo-punch-sequence")) return "combat";
  if (path.includes("mixamo-locomotion")) return "locomotion";
  return "atlas";
};

const recommendation = (candidate) => {
  const selected = {
    "standard-walk": "PROMISING WALK",
    "slow-run": "BEST RUN BRIDGE",
    "unarmed-run": "RUN ALTERNATIVE",
    "crouched-walk": "USEFUL ADDITION",
    "falling-idle": "DESCENT ROLE",
    "unarmed-jump-reference": "JUMP CHALLENGER",
  };
  if (selected[candidate.id]) return selected[candidate.id];
  if (["walk-start", "walk-stop", "crouch-enter", "crouch-idle", "crouch-exit", "flight-loop", "hard-landing-approved", "thunder-ground", "hurricane-quickslash"].includes(candidate.id)) return "CURRENT · KEEP";
  return candidate.group === "combat" ? "V4 COMBAT PROOF" : "V4 PROOF";
};

const currentCanon = (candidate) => candidate.id === "unarmed-jump-reference"
  ? {
      currentKey: "jump",
      role: "Fixed 1.2-tile jump",
      description: "Full jump-motion challenger beside the current fixed Space jump.",
      tags: ["jump", "deformation", "current-state"],
      referenceOnly: false,
    }
  : {};

const proofs = [...GROUND, ...CROUCH, ...AIR, ...COMBAT, ...ABILITIES, ...REACTIONS, ...IDLES]
  .filter((candidate) => candidate.stage === "v4")
  .map((candidate) => {
    const name = candidate.localGif.split("/").pop();
    return Object.freeze({
      ...candidate,
      ...currentCanon(candidate),
      preview: `./previews/${sourceFamily(candidate.localGif)}-${name}`,
      recommendation: recommendation(candidate),
      infiniteReplay: true,
    });
  });

export const PROOF_GROUPS = Object.freeze(GROUPS.filter((group) => proofs.some((proof) => proof.group === group.id)));
export const PROOFS = Object.freeze(proofs);
