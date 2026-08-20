import { candidate as c, local as l } from "./atlas-schema.js";

export const IDLES = Object.freeze([
  c("idle-looking", "idle", "Occasional idle fidget", "Unarmed Idle Looking Ver. 1", "Approved restrained looking fidget, not a permanent base idle.", "128650938", "idle", { localGif: l("library", "idle-fidget"), tags: ["fidget", "current"] }),
  c("breathing-idle", "idle", "Base idle prospect", "Breathing Idle", "Restrained breathing loop with minimal silhouette noise.", "107900901", "idle", { tags: ["loop", "subtle"] }),
  c("neutral-idle", "idle", "Base idle prospect", "Neutral Idle", "General neutral standing hold.", "115170901", "idle", { tags: ["loop", "neutral"] }),
  c("standing-idle", "idle", "Base idle prospect", "Standing Idle", "Relaxed standing posture source.", "131220901", "idle", { tags: ["loop"] }),
  c("unarmed-idle", "idle", "Base idle prospect", "Unarmed Idle", "Matched idle from the unarmed locomotive family.", "128650937", "idle", { tags: ["loop", "family-match"] }),
  c("unarmed-idle-01", "idle", "Base idle alternative", "Unarmed Idle 01", "Second restrained unarmed idle.", "128690951", "idle", { tags: ["loop"] }),
  c("idle-looking-2", "idle", "Occasional idle fidget", "Unarmed Idle Looking Ver. 2", "Second observation fidget for sparse variation.", "128650939", "idle", { tags: ["fidget"] }),
  c("fight-to-idle", "idle", "Combat recovery", "Fight Idle To Standing Idle", "Authored recovery from combat guard to neutral.", "124300901", "idle", { tags: ["transition", "combat"] }),
  c("idle-to-fight", "idle", "Combat ready entry", "Standing Idle To Fight Idle", "Authored neutral-to-guard transition.", "124200901", "idle", { tags: ["transition", "combat"] }),
  c("action-to-idle", "idle", "Action recovery", "Action Idle To Standing Idle", "General action-ready recovery into the base idle.", "124320901", "idle", { tags: ["transition"] }),
  c("injured-idle", "idle", "Low-health idle", "Injured Idle", "Optional damaged-state posture without changing gameplay authority.", "125300901", "idle", { tags: ["state", "injured"] }),
  c("kneeling-idle", "idle", "Context idle", "Kneeling Idle", "Kneeling hold useful for interaction or recovery review.", "126720901", "idle", { tags: ["context"] }),
]);
