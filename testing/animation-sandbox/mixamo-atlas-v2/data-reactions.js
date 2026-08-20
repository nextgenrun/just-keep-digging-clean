import { candidate as c } from "./atlas-schema.js";

export const REACTIONS = Object.freeze([
  c("hit-neutral", "reactions", "General hit reaction", "Hit Reaction", "Neutral impact response for the default damage state.", "113860902", "hit", { tags: ["hit", "recovery"] }),
  c("hit-left", "reactions", "Directional hit", "Reaction", "Readable hit from the left side.", "100540901", "hit", { tags: ["hit", "left"] }),
  c("hit-right", "reactions", "Directional hit", "Reaction", "Readable hit from the right side.", "100530901", "hit", { tags: ["hit", "right"] }),
  c("hit-small-front", "reactions", "Small front hit", "Standing React Small From Front", "Compact front impact without a full state break.", "128670943", "hit", { tags: ["hit", "small"] }),
  c("hit-small-back", "reactions", "Small back hit", "Standing React Small From Back", "Compact rear impact and recovery.", "128670942", "hit", { tags: ["hit", "small"] }),
  c("hit-small-left", "reactions", "Small left hit", "Standing React Small From Left", "Small left-side directional response.", "128670944", "hit", { tags: ["hit", "small"] }),
  c("hit-small-right", "reactions", "Small right hit", "Standing React Small From Right", "Small right-side directional response.", "128670945", "hit", { tags: ["hit", "small"] }),
  c("hit-large-front", "reactions", "Heavy front hit", "Standing React Large From Front", "Large front impact for severe feedback.", "128670939", "hit", { tags: ["hit", "large"] }),
  c("hit-large-back", "reactions", "Heavy back hit", "Standing React Large From Back", "Large rear impact for severe feedback.", "128670938", "hit", { tags: ["hit", "large"] }),
  c("hit-large-left", "reactions", "Heavy left hit", "Standing React Large From Left", "Large left-side impact response.", "128670940", "hit", { tags: ["hit", "large"] }),
  c("hit-large-right", "reactions", "Heavy right hit", "Standing React Large From Right", "Large right-side impact response.", "128670941", "hit", { tags: ["hit", "large"] }),
  c("hit-legs", "reactions", "Low hit reaction", "Hit On Legs", "Low impact that tests knee and pelvis deformation.", "126610901", "hit", { tags: ["hit", "low"] }),
  c("death-neutral", "reactions", "Death", "Death", "Neutral standing death without weapon posture.", "116070901", "death", { tags: ["death", "final-pose"] }),
  c("death-forward", "reactions", "Directional death", "Standing React Death Forward", "Forward directional death and settle.", "128670935", "death", { tags: ["death", "directional"] }),
]);
