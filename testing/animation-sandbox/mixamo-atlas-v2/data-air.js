import { candidate as c, local as l } from "./atlas-schema.js";

export const AIR = Object.freeze([
  c("flight-loop", "air", "Controlled flight loop", "Flying", "Approved relaxed airborne hover/travel loop.", "111080901", "flight", { localGif: l("library", "flight-loop"), tags: ["loop", "current"] }),
  c("falling-idle", "air", "Uncontrolled descent", "Falling Idle", "Mid-air falling loop kept separate from controlled Flight.", "118120901", "flight", { localGif: l("locomotion", "falling-loop"), tags: ["loop", "descent"] }),
  c("hard-landing-approved", "air", "Hard landing", "Jumping Down From Higher Level", "Approved heavy impact and recovery candidate.", "135970901", "landing", { localGif: l("library", "hard-landing"), tags: ["impact", "current"] }),
  c("flight-exit", "air", "Flight exit to descent", "Jumping Down", "Game-blend transition from falling idle into descent/landing.", "118110905", "landing", { tags: ["transition", "no-jump"] }),
  c("falling-to-landing", "air", "Descent to landing", "Falling To Landing", "Direct descent-to-contact bridge.", "118110902", "landing", { tags: ["transition", "contact"] }),
  c("falling-to-roll-a", "air", "Descent recovery", "Falling To Roll", "Landing that preserves momentum through a roll.", "118130901", "landing", { tags: ["transition", "root-motion"] }),
  c("falling-to-roll-b", "air", "Descent recovery alternative", "Falling To Roll", "Second fall-to-roll timing and contact variant.", "118130902", "landing", { tags: ["transition", "root-motion"] }),
  c("hard-landing-a", "air", "Hard landing alternative", "Hard Landing", "Direct hard impact with grounded recovery.", "118150901", "landing", { tags: ["impact", "contact"] }),
  c("hard-landing-b", "air", "Hard landing alternative", "Hard Landing", "Second hard impact variant for recovery timing.", "118150902", "landing", { tags: ["impact", "contact"] }),
  c("jump-down-menacing", "air", "Drop landing", "Jumping Down", "Menacing drop useful as a strong descent upper bound.", "130150901", "landing", { tags: ["descent", "contact"] }),
  c("jump-down-short", "air", "Short drop landing", "Jumping Down", "Shorter drop and settle prospect.", "101770905", "landing", { tags: ["descent", "contact"] }),
  c("landing-neutral", "air", "Light landing", "Landing", "Neutral low-impact landing source.", "115080901", "landing", { tags: ["contact", "light"] }),
  c("land-to-idle", "air", "Landing to idle", "Fall A Land To Standing Idle 01", "Authored contact and settle directly into idle.", "127690913", "landing", { tags: ["transition", "settle"] }),
  c("land-to-run", "air", "Landing to movement", "Fall A Land To Run Forward", "Preserves momentum into locomotion after contact.", "127690914", "landing", { tags: ["transition", "run"] }),
  c("swing-to-land", "air", "Flight/traversal landing", "Swing To Land", "Airborne traversal into a controlled planted landing.", "120470901", "landing", { tags: ["transition", "contact"] }),
  c("unarmed-jump-reference", "air", "Full jump deformation reference", "Unarmed Jump", "Mesh and motion reference only; it is not a gameplay state.", "128650940", "landing", { localGif: l("locomotion", "jump-full"), referenceOnly: true, tags: ["future-only", "no-gameplay"] }),
]);
