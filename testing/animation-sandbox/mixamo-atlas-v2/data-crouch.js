import { candidate as c, local as l } from "./atlas-schema.js";

export const CROUCH = Object.freeze([
  c("crouch-enter", "crouch", "Standing to duck", "Standing Idle To Crouch", "Approved entry into the low hitbox state.", "128670929", "crouch", { localGif: l("library", "crouch-enter"), tags: ["transition", "hitbox"] }),
  c("crouch-idle", "crouch", "Duck hold", "Crouch Idle", "Neutral approved crouch hold.", "128670901", "crouch", { localGif: l("library", "crouch-idle"), tags: ["loop", "hitbox"] }),
  c("crouch-exit", "crouch", "Duck to standing", "Crouch To Standing Idle", "Approved recovery out of the low hitbox state.", "128670902", "crouch", { localGif: l("library", "crouch-exit"), tags: ["transition", "hitbox"] }),
  c("crouched-walk", "crouch", "Low movement loop", "Crouched Walking", "Dedicated crouch stride instead of sliding the hold pose.", "101610901", "crouch", { localGif: l("locomotion", "crouch-walk"), tags: ["loop", "shortlist"] }),
  c("crouch-walk-forward", "crouch", "Low movement alternative", "Crouch Walk Forward", "Forward low walk from the matched crouch family.", "128670906", "crouch", { tags: ["loop", "family-match"] }),
  c("crouch-walk-back", "crouch", "Low reverse movement", "Crouch Walk Back", "Matched backwards low walk.", "128670905", "crouch", { tags: ["reverse", "family-match"] }),
  c("crouch-walk-left", "crouch", "Low strafe", "Crouch Walk Left", "Left low strafe for wall and narrow-space testing.", "128670907", "crouch", { tags: ["strafe"] }),
  c("crouch-walk-right", "crouch", "Low strafe", "Crouch Walk Right", "Right low strafe for wall and narrow-space testing.", "128670908", "crouch", { tags: ["strafe"] }),
  c("standing-to-crouch-alt", "crouch", "Standing to duck alternative", "Standing To Crouch", "Second authored entry for hitbox timing comparison.", "127690972", "crouch", { tags: ["transition", "hitbox"] }),
  c("crouch-to-standing-alt", "crouch", "Duck to standing alternative", "Crouch To Standing", "Second recovery option for posture continuity.", "127690945", "crouch", { tags: ["transition", "hitbox"] }),
  c("crouch-looking", "crouch", "Duck fidget", "Crouch Idle 03 Looking Over", "Occasional low-state observation fidget.", "127690944", "crouch", { tags: ["fidget"] }),
  c("idle-crouching", "crouch", "Duck hold alternative", "Idle Crouching", "Compact low idle source prospect.", "128620950", "crouch", { tags: ["loop"] }),
  c("crouched-sneak-left", "crouch", "Low sneak", "Crouched Sneaking Left", "Low leftward sneak with softer footfall.", "118220903", "crouch", { tags: ["sneak", "strafe"] }),
  c("crouched-sneak-right", "crouch", "Low sneak", "Crouched Sneaking Right", "Low rightward sneak with softer footfall.", "118220902", "crouch", { tags: ["sneak", "strafe"] }),
]);
