// Three mockup-faithful Celestial talent lattices with save-stable legacy spines.

export const CELESTIAL_TALENT_BRANCH_IDS = Object.freeze({
  WAYWARD_STAR: "wayward-star",
  HOLLOW_SUN: "hollow-sun",
  STELLAR_RAGE: "comet-engine",
  // Legacy alias retained for save-stable node and branch ids.
  COMET_ENGINE: "comet-engine",
});

function talentNode(definition) {
  return Object.freeze({
    ...definition,
    requiredLevel: 3,
    tier: definition.row,
    prerequisiteMode: definition.prerequisiteMode || "all",
    prerequisiteIds: Object.freeze([...(definition.prerequisiteIds || [])]),
  });
}

function talentBranch(id, name, completionNodeIds, nodes) {
  return Object.freeze({
    id,
    name,
    rootNodeId: nodes[0].id,
    completionNodeIds: Object.freeze([...completionNodeIds]),
    nodes: Object.freeze(nodes),
  });
}

const wayward = [
  talentNode({
    id: "wayward-star-root", branchId: "wayward-star", row: 0, lane: 0,
    kind: "ability", path: "CORE", name: "Wayward Star", abilityId: "wayward-star",
    starsCost: 0, effectId: "unlock-wayward-star",
    description: "Fire a Star that ricochets through blocks on its own. It fades or flies home when its route ends. Uses 100 GP.",
  }),
  talentNode({
    id: "wayward-stellar-bearings", branchId: "wayward-star", row: 1, lane: -1,
    kind: "upgrade", path: "MOMENTUM", name: "Stellar Bearings",
    starsCost: 50, prerequisiteIds: ["wayward-star-root"], effectId: "wayward-speed",
    description: "Every bounce speeds the Star up, making the end of its route wilder than the start.",
  }),
  talentNode({
    id: "wayward-ricochet-matrix", branchId: "wayward-star", row: 1, lane: 0,
    kind: "upgrade", path: "RICOCHET", name: "Ricochet Matrix",
    starsCost: 50, prerequisiteIds: ["wayward-star-root"], effectId: "wayward-extra-bounces",
    description: "The Star gains 2 bounces and turns toward a fresh block after every hit.",
  }),
  talentNode({
    id: "wayward-nova-lens", branchId: "wayward-star", row: 1, lane: 1,
    kind: "upgrade", path: "HOMECOMING", name: "Homeward Compass",
    starsCost: 50, prerequisiteIds: ["wayward-star-root"], effectId: "wayward-supernova-radius",
    description: "When its route ends, the Star turns around and flies back to you instead of disappearing.",
  }),
  talentNode({
    id: "wayward-echo-orbit", branchId: "wayward-star", row: 2, lane: -1,
    kind: "upgrade", path: "MOMENTUM", name: "Pursuit Loop",
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["wayward-stellar-bearings", "wayward-ricochet-matrix"],
    effectId: "wayward-lifetime", description: "The Star keeps hunting while time remains, even after reaching its normal bounce limit.",
  }),
  talentNode({
    id: "wayward-vector-command", branchId: "wayward-star", row: 2, lane: 0,
    kind: "upgrade", path: "RICOCHET", name: "Twin Orbit",
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["wayward-stellar-bearings", "wayward-ricochet-matrix", "wayward-nova-lens"],
    effectId: "wayward-extra-star", description: "Fire 2 Stars at the same time.",
  }),
  talentNode({
    id: "wayward-fracture-bloom", branchId: "wayward-star", row: 2, lane: 1,
    kind: "upgrade", path: "HOMECOMING", name: "Return Current",
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["wayward-ricochet-matrix", "wayward-nova-lens"],
    effectId: "wayward-fracture-capacity", description: "A returning Star can graze blocks on its way back to you.",
  }),
  talentNode({
    id: "wayward-perihelion-loop", branchId: "wayward-star", row: 3, lane: -1,
    kind: "capstone", path: "MOMENTUM", name: "Perihelion Loop",
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["wayward-echo-orbit", "wayward-vector-command"],
    effectId: "wayward-perihelion-mastery",
    description: "Fire another Star. Bounces build more speed and the route can continue longer. Opens another starting ability.",
  }),
  talentNode({
    id: "wayward-impact-lattice", branchId: "wayward-star", row: 3, lane: 0,
    displayRole: "bridge",
    kind: "upgrade", path: "RICOCHET", name: "Impact Lattice",
    starsCost: 100, prerequisiteIds: ["wayward-vector-command"],
    effectId: "wayward-impact-capacity", description: "Each Star can hit 6 more blocks.",
  }),
  talentNode({
    id: "wayward-supernova-core", branchId: "wayward-star", row: 3, lane: 0,
    kind: "capstone", path: "RICOCHET", name: "Guiding Core",
    starsCost: 150, prerequisiteIds: ["wayward-impact-lattice"],
    effectId: "wayward-supernova-mastery",
    description: "Fire another Star. After every bounce it sharply seeks the nearest fresh block. Opens another starting ability.",
  }),
  talentNode({
    id: "wayward-white-dwarf-shell", branchId: "wayward-star", row: 3, lane: 1,
    kind: "capstone", path: "HOMECOMING", name: "White Dwarf Shell",
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["wayward-vector-command", "wayward-fracture-bloom"],
    effectId: "wayward-white-dwarf-mastery",
    description: "Fire another Star. Returning Stars move faster and can strike more blocks on the way home. Opens another starting ability.",
  }),
  talentNode({
    id: "wayward-homebound-apex", branchId: "wayward-star", row: 4, lane: 0,
    kind: "apex", path: "ETERNAL", name: "Homebound Star",
    starsCost: 500, prerequisiteMode: "all",
    prerequisiteIds: ["wayward-perihelion-loop", "wayward-supernova-core", "wayward-white-dwarf-shell"],
    effectId: "wayward-homebound-passive",
    description: "Keep one weaker Star beside you forever. It bounces nearby, chips blocks, and always returns when it strays too far.",
  }),
];

const hollow = [
  talentNode({
    id: "hollow-sun-root", branchId: "hollow-sun", row: 0, lane: 0,
    kind: "ability", path: "CORE", name: "Hollow Sun", abilityId: "hollow-sun",
    starsCost: 0, effectId: "unlock-hollow-sun",
    description: "Create 3 black holes that pulse in a wave, softly follow you, and move toward every punch. Uses 100 GP.",
  }),
  talentNode({
    id: "hollow-orbit-anchor", branchId: "hollow-sun", row: 1, lane: -1,
    kind: "upgrade", path: "FIELD", name: "Orbit Anchor",
    starsCost: 50, prerequisiteIds: ["hollow-sun-root"], effectId: "hollow-placement-range",
    description: "The cluster holds farther ahead of you and keeps its formation while you move.",
  }),
  talentNode({
    id: "hollow-gravity-well", branchId: "hollow-sun", row: 1, lane: 0,
    kind: "upgrade", path: "COLLAPSE", name: "Gravity Well",
    starsCost: 50, prerequisiteIds: ["hollow-sun-root"], effectId: "hollow-pulse-radius",
    description: "Every pulse reaches 1 tile farther.",
  }),
  talentNode({
    id: "hollow-echo-seed", branchId: "hollow-sun", row: 1, lane: 1,
    kind: "upgrade", path: "TIME", name: "Echo Seed",
    starsCost: 50, prerequisiteIds: ["hollow-sun-root"], effectId: "hollow-extra-pulse",
    description: "Create 1 more black hole.",
  }),
  talentNode({
    id: "hollow-tidal-lens", branchId: "hollow-sun", row: 2, lane: -1,
    kind: "upgrade", path: "FIELD", name: "Tidal Lens",
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["hollow-orbit-anchor", "hollow-gravity-well"],
    effectId: "hollow-tidal-radius", description: "Every punch pushes the cluster farther, and it catches up to you more quickly.",
  }),
  talentNode({
    id: "hollow-event-horizon", branchId: "hollow-sun", row: 2, lane: 0,
    kind: "upgrade", path: "COLLAPSE", name: "Event Horizon",
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["hollow-orbit-anchor", "hollow-gravity-well", "hollow-echo-seed"],
    effectId: "hollow-impact-capacity", description: "Every third punch commands the nearest black hole to release an extra small pulse.",
  }),
  talentNode({
    id: "hollow-dark-reservoir", branchId: "hollow-sun", row: 2, lane: 1,
    kind: "upgrade", path: "TIME", name: "Dark Reservoir",
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["hollow-gravity-well", "hollow-echo-seed"],
    effectId: "hollow-reservoir-capacity", description: "Each black hole stores one delayed afterpulse before it collapses.",
  }),
  talentNode({
    id: "hollow-abyssal-field", branchId: "hollow-sun", row: 3, lane: -1,
    kind: "capstone", path: "FIELD", name: "Abyssal Field",
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["hollow-tidal-lens", "hollow-event-horizon"],
    effectId: "hollow-abyssal-mastery",
    description: "Every hole ends with a wide blast that can hit 18 blocks. Opens another starting ability.",
  }),
  talentNode({
    id: "hollow-collapse-cycle", branchId: "hollow-sun", row: 3, lane: 0,
    displayRole: "bridge",
    kind: "upgrade", path: "COLLAPSE", name: "Collapse Cycle",
    starsCost: 100, prerequisiteIds: ["hollow-event-horizon"],
    effectId: "hollow-collapse-pulse",
    description: "Create the holes faster and shorten the wait between pulses.",
  }),
  talentNode({
    id: "hollow-singularity-core", branchId: "hollow-sun", row: 3, lane: 0,
    kind: "capstone", path: "COLLAPSE", name: "Singularity Core",
    starsCost: 150, prerequisiteIds: ["hollow-collapse-cycle"],
    effectId: "hollow-implosion-mastery",
    description: "Every final blast can hit up to 30 blocks. Opens another starting ability.",
  }),
  talentNode({
    id: "hollow-chronosphere", branchId: "hollow-sun", row: 3, lane: 1,
    kind: "capstone", path: "TIME", name: "Chronosphere",
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["hollow-event-horizon", "hollow-dark-reservoir"],
    effectId: "hollow-chronosphere-mastery",
    description: "Each hole gains a sixth pulse, hits 2 more blocks per pulse, and lasts 2.5 seconds longer. Opens another starting ability.",
  }),
  talentNode({
    id: "hollow-eternal-eclipse", branchId: "hollow-sun", row: 4, lane: 0,
    kind: "apex", path: "ETERNAL", name: "Eternal Eclipse",
    starsCost: 500, prerequisiteMode: "all",
    prerequisiteIds: ["hollow-abyssal-field", "hollow-singularity-core", "hollow-chronosphere"],
    effectId: "hollow-umbra-passive",
    description: "Keep one small Hollow Sun beside you forever. It follows softly and releases a weak pulse as you keep digging.",
  }),
];

const rage = [
  talentNode({
    id: "comet-engine-root", branchId: "comet-engine", row: 0, lane: 0,
    kind: "ability", path: "CORE", name: "Stellar Lance", abilityId: "comet-engine",
    starsCost: 0, effectId: "unlock-stellar-rage",
    description: "For 15 seconds, every punch fires a 5-tile wave. Only leftover damage from a broken block carries forward. Uses 100 GP.",
  }),
  talentNode({
    id: "comet-ignition-coil", branchId: "comet-engine", row: 1, lane: -1,
    kind: "upgrade", path: "POWER", name: "Lance Core",
    starsCost: 50, prerequisiteIds: ["comet-engine-root"], effectId: "rage-damage-i",
    description: "Each Lance deals 100% of your dig damage instead of 75%.",
  }),
  talentNode({
    id: "comet-bore-drive", branchId: "comet-engine", row: 1, lane: 0,
    kind: "upgrade", path: "RANGE", name: "Longshot Chamber",
    starsCost: 50, prerequisiteIds: ["comet-engine-root"], effectId: "rage-speed-i",
    description: "After traveling 3 tiles, each Lance shifts into a stronger, brighter form.",
  }),
  talentNode({
    id: "comet-fracture-nose", branchId: "comet-engine", row: 1, lane: 1,
    kind: "upgrade", path: "RHYTHM", name: "Resonant Trigger",
    starsCost: 50, prerequisiteIds: ["comet-engine-root"], effectId: "rage-duration-i",
    description: "Every fourth punch fires a wider Resonant Lance.",
  }),
  talentNode({
    id: "comet-longburn-reservoir", branchId: "comet-engine", row: 2, lane: -1,
    kind: "upgrade", path: "POWER", name: "Piercing Charge",
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["comet-ignition-coil", "comet-bore-drive"],
    effectId: "rage-damage-ii", description: "Blocks broken by one Lance store power for your next punch.",
  }),
  talentNode({
    id: "comet-rider-plating", branchId: "comet-engine", row: 2, lane: 0,
    kind: "upgrade", path: "RANGE", name: "Deep Flight",
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["comet-ignition-coil", "comet-bore-drive", "comet-fracture-nose"],
    effectId: "rage-speed-ii", description: "Each Lance travels 1 tile farther.",
  }),
  talentNode({
    id: "comet-wide-wake", branchId: "comet-engine", row: 2, lane: 1,
    kind: "upgrade", path: "RHYTHM", name: "Star Reservoir",
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["comet-bore-drive", "comet-fracture-nose"],
    effectId: "rage-duration-ii", description: "Breaking blocks adds a little time to the current activation, up to a firm limit.",
  }),
  talentNode({
    id: "comet-aphelion-drive", branchId: "comet-engine", row: 3, lane: -1,
    kind: "capstone", path: "POWER", name: "Worldpiercer",
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["comet-longburn-reservoir", "comet-rider-plating"],
    effectId: "rage-damage-capstone",
    description: "Each Lance deals 25% more dig damage. Opens another starting ability.",
  }),
  talentNode({
    id: "comet-impact-wake", branchId: "comet-engine", row: 3, lane: 0,
    displayRole: "bridge",
    kind: "upgrade", path: "RANGE", name: "Far Horizon",
    starsCost: 100, prerequisiteIds: ["comet-rider-plating"],
    effectId: "rage-speed-bridge", description: "Each Lance travels 1 tile farther.",
  }),
  talentNode({
    id: "comet-zenith-drive", branchId: "comet-engine", row: 3, lane: 0,
    kind: "capstone", path: "RANGE", name: "Trident Break",
    starsCost: 150, prerequisiteIds: ["comet-impact-wake"],
    effectId: "rage-limit-break",
    description: "Fire 3 parallel Lances with every dig. Opens another starting ability.",
  }),
  talentNode({
    id: "comet-shockfront", branchId: "comet-engine", row: 3, lane: 1,
    kind: "capstone", path: "RHYTHM", name: "Endless Volley",
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["comet-rider-plating", "comet-wide-wake"],
    effectId: "rage-duration-capstone",
    description: "During the final 3 seconds, every punch fires an extra lane on both sides. Opens another starting ability.",
  }),
  talentNode({
    id: "comet-echo-arsenal", branchId: "comet-engine", row: 4, lane: 0,
    kind: "apex", path: "ETERNAL", name: "Echo Arsenal",
    starsCost: 500, prerequisiteMode: "all",
    prerequisiteIds: ["comet-aphelion-drive", "comet-zenith-drive", "comet-shockfront"],
    effectId: "rage-echo-passive",
    description: "Every punch always fires a short, weak Echo Lance. Activating Stellar Lance replaces it with the full volley.",
  }),
];

export const CELESTIAL_TALENT_BRANCHES = Object.freeze([
  talentBranch("wayward-star", "WAYWARD STAR", [
    "wayward-perihelion-loop", "wayward-supernova-core", "wayward-white-dwarf-shell",
  ], wayward),
  talentBranch("hollow-sun", "HOLLOW SUN", [
    "hollow-abyssal-field", "hollow-singularity-core", "hollow-chronosphere",
  ], hollow),
  talentBranch("comet-engine", "STELLAR LANCE", [
    "comet-aphelion-drive", "comet-zenith-drive", "comet-shockfront",
  ], rage),
]);
