import { candidate as c, local as l } from "./atlas-schema.js";

const proof = (id, role, title, description, currentKey = "digSide", tags = []) =>
  c(id, "combat", role, title, description, null, currentKey, {
    localGif: l("combat", id), tags,
  });

export const COMBAT = Object.freeze([
  proof("jab", "Fast side opener", "Jab Punch", "Compact fast contact for rhythmic side digging.", "digSide", ["punch", "contact"]),
  proof("cross", "Side power follow-up", "Cross Punch", "Rear-hand power beat for the second combo strike.", "digSide", ["punch", "contact"]),
  proof("hook", "Rotational finisher", "Hook Punch", "Heavy hip-driven finisher silhouette.", "digSide", ["punch", "finisher"]),
  proof("uppercut", "Upward strike", "Uppercut", "The strongest single rising candidate for dig up.", "digUp", ["punch", "up"]),
  proof("body-low", "Downward strike", "Low Body Punch", "Low-line body drop useful for dig down testing.", "digDown", ["punch", "down"]),
  proof("jab-cross", "Native two-hit chain", "Boxing Jab–Cross", "Authored shoulder and pelvis continuity across two contacts.", "digSide", ["combo", "native"]),
  proof("four-combo", "Native four-hit chain", "Four-Punch Combo", "Four contacts with continuous guard recovery.", "digSide", ["combo", "native"]),
  proof("eight-combo", "Rapid pressure chain", "Eight-Punch Combo", "Fast upper-bound rhythm test for held mining.", "digSide", ["combo", "upper-bound"]),
  proof("boxing-lead-jab", "Alternate opener", "Boxing Lead Jab", "Tighter lead-hand jab variant.", "digSide", ["boxing"]),
  proof("boxing-back-cross", "Alternate follow-up", "Boxing Back Cross", "Rear-hand cross with a compact guard return.", "digSide", ["boxing"]),
  proof("boxing-lead-hook", "Compact connector", "Boxing Lead Hook", "Short rotational hook between combo beats.", "digSide", ["boxing"]),
  proof("boxing-back-uppercut", "Rising finisher", "Boxing Back Uppercut", "Rear-hand uppercut alternative for dig up.", "digUp", ["boxing", "up"]),
  proof("elbow-single", "Close heavy contact", "Single Elbow", "Short-range heavy elbow for side digging.", "digSide", ["elbow"]),
  proof("jab-elbow", "Native two-contact chain", "Jab To Elbow Punch", "Compact jab flowing directly into an elbow.", "digSide", ["combo", "elbow"]),
  proof("elbow-uppercut", "Native rising chain", "Elbow Uppercut Combo", "Elbow setup flowing into the selected upward strike family.", "digUp", ["combo", "up"]),
  proof("kick-low", "Low interruption strike", "Low MMA Kick", "Low-line kick for side or down-biased digging.", "digDown", ["kick", "low"]),
  proof("kick-side", "Long lateral strike", "MMA Side Kick", "Long readable side silhouette.", "digSide", ["kick", "side"]),
  proof("kick-roundhouse", "Rotational strike", "MMA Roundhouse", "Mid-height rotation selected as a side finisher.", "digSide", ["kick", "finisher"]),
  proof("kick-high", "High-line strike", "High MMA Kick", "Tall kick for upward/side combo contrast.", "digUp", ["kick", "high"]),
  proof("kick-spinning-back", "Power finisher", "Spinning Back Kick", "Full-turn heavy finisher with clear anticipation.", "digSide", ["kick", "finisher"]),
  proof("kick-front-snap", "Fast stop-kick", "Lead Front Snap Kick", "Linear fast kick with a short recovery.", "digSide", ["kick", "fast"]),
  proof("leg-sweep", "Ground circular strike", "Back Leg Sweep", "Low circular attack for dig-down silhouette testing.", "digDown", ["kick", "low"]),
  proof("knee-muay-thai", "Close knee strike", "Muay Thai Knee", "Single compact knee impact.", "digSide", ["knee"]),
  proof("knee-triple-uppercut", "Native pressure chain", "Triple Knee To Uppercut", "Four-contact authored sequence ending upward.", "digUp", ["combo", "knee"]),
  c("hurricane-quickslash", "combat", "Quickslash", "Hurricane Kick", "Approved rotational Quickslash replacement proof.", "110960901", "digSide", { localGif: l("library", "hurricane-quickslash"), tags: ["ability", "current"] }),
  c("melee-horizontal", "combat", "Tool-shaped side strike", "Standing Melee Attack Horizontal", "Horizontal axe arc closely aligned to a side tile.", "128650913", "digSide", { tags: ["axe", "prop-hands"] }),
  c("melee-downward", "combat", "Tool-shaped down strike", "Standing Melee Attack Downward", "Purpose-built downward axe mechanics.", "128650912", "digDown", { tags: ["axe", "down"] }),
  c("melee-backhand", "combat", "Tool-shaped up strike", "Standing Melee Attack Backhand", "Rising backhand arc for the tile above.", "128650911", "digUp", { tags: ["axe", "up"] }),
  c("melee-360-low", "combat", "Circular low finisher", "Standing Melee Attack 360 Low", "Low circular tool arc for combo finishing.", "128650915", "digDown", { tags: ["axe", "finisher"] }),
  c("melee-360-high", "combat", "Circular high finisher", "Standing Melee Attack 360 High", "High circular tool arc for side/up finishing.", "128650914", "digUp", { tags: ["axe", "finisher"] }),
  c("melee-combo-two", "combat", "Native two-hit tool chain", "Standing Melee Combo Attack Ver. 1", "Two authored axe contacts without an idle reset.", "128650918", "digSide", { tags: ["axe", "combo"] }),
  c("melee-combo-three", "combat", "Native three-hit tool chain", "Standing Melee Combo Attack Ver. 2", "Three authored axe contacts for held digging rhythm.", "128650919", "digSide", { tags: ["axe", "combo"] }),
]);
