import { candidate as c, local as l } from "./atlas-schema.js";

export const ABILITIES = Object.freeze([
  c("thunder-ground", "abilities", "Thunder ground strike", "Standing 2H Magic Area Attack 01", "Approved two-hand ground-directed cast.", "128670914", "thunder", { localGif: l("library", "thunder-strike"), tags: ["magic", "current"] }),
  c("push-start", "abilities", "Wall brace entry", "Push Start", "Authored weight transfer into a two-hand push.", "118350901", "wall", { tags: ["wall", "transition"] }),
  c("push-loop", "abilities", "Wall brace/push loop", "Pushing", "Sustained two-hand pressure and pelvis drive.", "118350902", "wall", { tags: ["wall", "loop"] }),
  c("push-stop", "abilities", "Wall brace recovery", "Push Stop", "Planted recovery out of the push loop.", "118350903", "wall", { tags: ["wall", "transition"] }),
  c("climb-cycle", "abilities", "Vertical climb loop", "Climbing", "General repeated climb cycle.", "100670901", "wall", { tags: ["climb", "loop"] }),
  c("climb-down", "abilities", "Vertical descend loop", "Climbing Down", "Controlled downward traversal cycle.", "130060901", "wall", { tags: ["climb", "descent"] }),
  c("climb-up-wall", "abilities", "Wall ascent", "Climbing Up Wall", "Purpose-built wall climbing motion.", "118630901", "wall", { tags: ["wall", "climb"] }),
  c("climb-down-wall", "abilities", "Wall descent", "Climbing Down Wall", "Matched wall descent motion.", "118630902", "wall", { tags: ["wall", "climb"] }),
  c("freehang-climb", "abilities", "Ledge recovery", "Freehang Climb", "Hanging-to-standing ledge recovery.", "118480901", "wall", { tags: ["ledge", "transition"] }),
  c("ladder-start", "abilities", "Ladder entry", "Start Climbing Ladder", "Standing entry into a ladder cycle.", "136460901", "wall", { tags: ["ladder", "transition"] }),
  c("ladder-loop", "abilities", "Ladder loop", "Climbing Ladder", "Repeated ladder ascent cycle.", "136460902", "wall", { tags: ["ladder", "loop"] }),
  c("ladder-top", "abilities", "Ladder exit", "Climbing To Top", "Ladder-to-standing recovery.", "136460903", "wall", { tags: ["ladder", "transition"] }),
  c("stand-to-roll", "abilities", "Teleport/evade roll", "Stand To Roll", "Compact standing dive roll preserving the current ability role.", "118140901", "teleport", { tags: ["roll", "root-motion"] }),
  c("dive-roll", "abilities", "Evade roll alternative", "Dive Roll", "Low forward roll with stronger momentum.", "116440901", "teleport", { tags: ["roll", "root-motion"] }),
  c("quick-roll-run", "abilities", "Roll to movement", "Quick Roll To Run", "Fast recovery directly into locomotion.", "120430901", "teleport", { tags: ["roll", "transition"] }),
  c("dodge-left", "abilities", "Directional evade", "Standing Dodge Left", "Planted left dodge prospect.", "127690917", "teleport", { tags: ["dodge", "directional"] }),
  c("dodge-right", "abilities", "Directional evade", "Standing Dodge Right", "Planted right dodge prospect.", "127690918", "teleport", { tags: ["dodge", "directional"] }),
  c("dodge-back", "abilities", "Directional evade", "Standing Dodge Backward", "Backward evade with readable recovery.", "127690915", "teleport", { tags: ["dodge", "directional"] }),
]);
