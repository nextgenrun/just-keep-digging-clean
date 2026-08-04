// Three mockup-faithful Celestial talent lattices with save-stable legacy spines.

export const CELESTIAL_TALENT_BRANCH_IDS = Object.freeze({
  WAYWARD_STAR: "wayward-star",
  HOLLOW_SUN: "hollow-sun",
  COMET_ENGINE: "comet-engine",
});

function talentNode(definition) {
  return Object.freeze({
    ...definition,
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
    requiredLevel: 20, starsCost: 0, effectId: "unlock-wayward-star",
    description: "Unlock the Wayward Star ability.",
  }),
  talentNode({
    id: "wayward-stellar-bearings", branchId: "wayward-star", row: 1, lane: -1,
    kind: "upgrade", path: "MOMENTUM", name: "Stellar Bearings", requiredLevel: 25,
    starsCost: 50, prerequisiteIds: ["wayward-star-root"], effectId: "wayward-speed",
    description: "Increase Wayward Star travel speed without removing its caps.",
  }),
  talentNode({
    id: "wayward-ricochet-matrix", branchId: "wayward-star", row: 1, lane: 0,
    kind: "upgrade", path: "RICOCHET", name: "Ricochet Matrix", requiredLevel: 25,
    starsCost: 50, prerequisiteIds: ["wayward-star-root"], effectId: "wayward-extra-bounces",
    description: "Add two bounded ricochets.",
  }),
  talentNode({
    id: "wayward-nova-lens", branchId: "wayward-star", row: 1, lane: 1,
    kind: "upgrade", path: "SUPERNOVA", name: "Nova Lens", requiredLevel: 25,
    starsCost: 50, prerequisiteIds: ["wayward-star-root"], effectId: "wayward-supernova-radius",
    description: "Increase final detonation radius by one tile.",
  }),
  talentNode({
    id: "wayward-echo-orbit", branchId: "wayward-star", row: 2, lane: -1,
    kind: "upgrade", path: "MOMENTUM", name: "Echo Orbit", requiredLevel: 30,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["wayward-stellar-bearings", "wayward-ricochet-matrix"],
    effectId: "wayward-lifetime", description: "Keep the star active for one extra second.",
  }),
  talentNode({
    id: "wayward-vector-command", branchId: "wayward-star", row: 2, lane: 0,
    kind: "upgrade", path: "RICOCHET", name: "Vector Command", requiredLevel: 30,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["wayward-stellar-bearings", "wayward-ricochet-matrix", "wayward-nova-lens"],
    effectId: "wayward-extra-redirect", description: "Add one controlled redirection.",
  }),
  talentNode({
    id: "wayward-fracture-bloom", branchId: "wayward-star", row: 2, lane: 1,
    kind: "upgrade", path: "SUPERNOVA", name: "Fracture Bloom", requiredLevel: 30,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["wayward-ricochet-matrix", "wayward-nova-lens"],
    effectId: "wayward-fracture-capacity", description: "Add four capped impact targets.",
  }),
  talentNode({
    id: "wayward-perihelion-loop", branchId: "wayward-star", row: 3, lane: -1.5,
    kind: "capstone", path: "MOMENTUM", name: "Perihelion Loop", requiredLevel: 40,
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["wayward-echo-orbit", "wayward-vector-command"],
    effectId: "wayward-perihelion-mastery",
    description: "Master momentum, add two bounces and one redirect, and unlock another Engine root.",
  }),
  talentNode({
    id: "wayward-impact-lattice", branchId: "wayward-star", row: 3, lane: -0.5,
    kind: "upgrade", path: "RICOCHET", name: "Impact Lattice", requiredLevel: 35,
    starsCost: 100, prerequisiteIds: ["wayward-vector-command"],
    effectId: "wayward-impact-capacity", description: "Add six capped impact targets.",
  }),
  talentNode({
    id: "wayward-supernova-core", branchId: "wayward-star", row: 3, lane: 0.5,
    kind: "capstone", path: "RICOCHET", name: "Supernova Core", requiredLevel: 40,
    starsCost: 150, prerequisiteIds: ["wayward-impact-lattice"],
    effectId: "wayward-supernova-mastery",
    description: "Complete the legacy ricochet route and unlock another Engine root.",
  }),
  talentNode({
    id: "wayward-white-dwarf-shell", branchId: "wayward-star", row: 3, lane: 1.5,
    kind: "capstone", path: "SUPERNOVA", name: "White Dwarf Shell", requiredLevel: 40,
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["wayward-vector-command", "wayward-fracture-bloom"],
    effectId: "wayward-white-dwarf-mastery",
    description: "Master detonation, add impact capacity and radius, and unlock another Engine root.",
  }),
];

const hollow = [
  talentNode({
    id: "hollow-sun-root", branchId: "hollow-sun", row: 0, lane: 0,
    kind: "ability", path: "CORE", name: "Hollow Sun", abilityId: "hollow-sun",
    requiredLevel: 20, starsCost: 0, effectId: "unlock-hollow-sun",
    description: "Unlock the Hollow Sun ability.",
  }),
  talentNode({
    id: "hollow-orbit-anchor", branchId: "hollow-sun", row: 1, lane: -1,
    kind: "upgrade", path: "FIELD", name: "Orbit Anchor", requiredLevel: 25,
    starsCost: 50, prerequisiteIds: ["hollow-sun-root"], effectId: "hollow-placement-range",
    description: "Place the gravity core one tile farther away.",
  }),
  talentNode({
    id: "hollow-gravity-well", branchId: "hollow-sun", row: 1, lane: 0,
    kind: "upgrade", path: "COLLAPSE", name: "Gravity Well", requiredLevel: 25,
    starsCost: 50, prerequisiteIds: ["hollow-sun-root"], effectId: "hollow-pulse-radius",
    description: "Widen every bounded gravity pulse by one tile.",
  }),
  talentNode({
    id: "hollow-echo-seed", branchId: "hollow-sun", row: 1, lane: 1,
    kind: "upgrade", path: "TIME", name: "Echo Seed", requiredLevel: 25,
    starsCost: 50, prerequisiteIds: ["hollow-sun-root"], effectId: "hollow-extra-pulse",
    description: "Append a fourth bounded gravity pulse.",
  }),
  talentNode({
    id: "hollow-tidal-lens", branchId: "hollow-sun", row: 2, lane: -1,
    kind: "upgrade", path: "FIELD", name: "Tidal Lens", requiredLevel: 30,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["hollow-orbit-anchor", "hollow-gravity-well"],
    effectId: "hollow-tidal-radius", description: "Add one tile to every pulse radius.",
  }),
  talentNode({
    id: "hollow-event-horizon", branchId: "hollow-sun", row: 2, lane: 0,
    kind: "upgrade", path: "COLLAPSE", name: "Event Horizon", requiredLevel: 30,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["hollow-orbit-anchor", "hollow-gravity-well", "hollow-echo-seed"],
    effectId: "hollow-impact-capacity", description: "Add eight capped impact targets.",
  }),
  talentNode({
    id: "hollow-dark-reservoir", branchId: "hollow-sun", row: 2, lane: 1,
    kind: "upgrade", path: "TIME", name: "Dark Reservoir", requiredLevel: 30,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["hollow-gravity-well", "hollow-echo-seed"],
    effectId: "hollow-reservoir-capacity", description: "Add six capped impact targets.",
  }),
  talentNode({
    id: "hollow-abyssal-field", branchId: "hollow-sun", row: 3, lane: -1.5,
    kind: "capstone", path: "FIELD", name: "Abyssal Field", requiredLevel: 40,
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["hollow-tidal-lens", "hollow-event-horizon"],
    effectId: "hollow-abyssal-mastery",
    description: "Master the field, add impact and implosion reach, and unlock another Engine root.",
  }),
  talentNode({
    id: "hollow-collapse-cycle", branchId: "hollow-sun", row: 3, lane: -0.5,
    kind: "upgrade", path: "COLLAPSE", name: "Collapse Cycle", requiredLevel: 35,
    starsCost: 100, prerequisiteIds: ["hollow-event-horizon"],
    effectId: "hollow-pulse-tempo", description: "Tighten the gravity pulse cycle.",
  }),
  talentNode({
    id: "hollow-singularity-core", branchId: "hollow-sun", row: 3, lane: 0.5,
    kind: "capstone", path: "COLLAPSE", name: "Singularity Core", requiredLevel: 40,
    starsCost: 150, prerequisiteIds: ["hollow-collapse-cycle"],
    effectId: "hollow-implosion-mastery",
    description: "Complete the legacy collapse route and unlock another Engine root.",
  }),
  talentNode({
    id: "hollow-chronosphere", branchId: "hollow-sun", row: 3, lane: 1.5,
    kind: "capstone", path: "TIME", name: "Chronosphere", requiredLevel: 40,
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["hollow-event-horizon", "hollow-dark-reservoir"],
    effectId: "hollow-chronosphere-mastery",
    description: "Master pulse timing, add impact capacity, and unlock another Engine root.",
  }),
];

const comet = [
  talentNode({
    id: "comet-engine-root", branchId: "comet-engine", row: 0, lane: 0,
    kind: "ability", path: "CORE", name: "Comet Engine", abilityId: "comet-engine",
    requiredLevel: 20, starsCost: 0, effectId: "unlock-comet-engine",
    description: "Unlock the Comet Engine ability.",
  }),
  talentNode({
    id: "comet-ignition-coil", branchId: "comet-engine", row: 1, lane: -1,
    kind: "upgrade", path: "VELOCITY", name: "Ignition Coil", requiredLevel: 25,
    starsCost: 50, prerequisiteIds: ["comet-engine-root"], effectId: "comet-ignition-speed",
    description: "Increase tunnel travel speed by one tile per second.",
  }),
  talentNode({
    id: "comet-bore-drive", branchId: "comet-engine", row: 1, lane: 0,
    kind: "upgrade", path: "BORE", name: "Bore Drive", requiredLevel: 25,
    starsCost: 50, prerequisiteIds: ["comet-engine-root"], effectId: "comet-travel-capacity",
    description: "Extend the protected tunnel route by four tiles.",
  }),
  talentNode({
    id: "comet-fracture-nose", branchId: "comet-engine", row: 1, lane: 1,
    kind: "upgrade", path: "SHOCK", name: "Fracture Nose", requiredLevel: 25,
    starsCost: 50, prerequisiteIds: ["comet-engine-root"], effectId: "comet-fracture-capacity",
    description: "Add three capped impact targets.",
  }),
  talentNode({
    id: "comet-longburn-reservoir", branchId: "comet-engine", row: 2, lane: -1,
    kind: "upgrade", path: "VELOCITY", name: "Longburn Reservoir", requiredLevel: 30,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["comet-ignition-coil", "comet-bore-drive"],
    effectId: "comet-longburn-lifetime", description: "Keep the drive active for 300 ms longer.",
  }),
  talentNode({
    id: "comet-rider-plating", branchId: "comet-engine", row: 2, lane: 0,
    kind: "upgrade", path: "BORE", name: "Rider Plating", requiredLevel: 30,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["comet-ignition-coil", "comet-bore-drive", "comet-fracture-nose"],
    effectId: "comet-ride-control", description: "Improve launch control during the bounded ride.",
  }),
  talentNode({
    id: "comet-wide-wake", branchId: "comet-engine", row: 2, lane: 1,
    kind: "upgrade", path: "SHOCK", name: "Wide Wake", requiredLevel: 30,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["comet-bore-drive", "comet-fracture-nose"],
    effectId: "comet-wide-wake-pattern", description: "Trigger protected side bursts more often.",
  }),
  talentNode({
    id: "comet-aphelion-drive", branchId: "comet-engine", row: 3, lane: -1.5,
    kind: "capstone", path: "VELOCITY", name: "Aphelion Drive", requiredLevel: 40,
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["comet-longburn-reservoir", "comet-rider-plating"],
    effectId: "comet-aphelion-mastery",
    description: "Master velocity, extend speed, travel, and impacts, and unlock another Engine root.",
  }),
  talentNode({
    id: "comet-impact-wake", branchId: "comet-engine", row: 3, lane: -0.5,
    kind: "upgrade", path: "BORE", name: "Impact Wake", requiredLevel: 35,
    starsCost: 100, prerequisiteIds: ["comet-rider-plating"],
    effectId: "comet-impact-capacity", description: "Add six capped impact targets.",
  }),
  talentNode({
    id: "comet-zenith-drive", branchId: "comet-engine", row: 3, lane: 0.5,
    kind: "capstone", path: "BORE", name: "Zenith Drive", requiredLevel: 40,
    starsCost: 150, prerequisiteIds: ["comet-impact-wake"],
    effectId: "comet-drive-mastery",
    description: "Complete the legacy bore route and unlock another Engine root.",
  }),
  talentNode({
    id: "comet-shockfront", branchId: "comet-engine", row: 3, lane: 1.5,
    kind: "capstone", path: "SHOCK", name: "Shockfront", requiredLevel: 40,
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["comet-rider-plating", "comet-wide-wake"],
    effectId: "comet-shockfront-mastery",
    description: "Master the wake, extend travel and impacts, and unlock another Engine root.",
  }),
];

export const CELESTIAL_TALENT_BRANCHES = Object.freeze([
  talentBranch("wayward-star", "WAYWARD STAR", [
    "wayward-perihelion-loop", "wayward-supernova-core", "wayward-white-dwarf-shell",
  ], wayward),
  talentBranch("hollow-sun", "HOLLOW SUN", [
    "hollow-abyssal-field", "hollow-singularity-core", "hollow-chronosphere",
  ], hollow),
  talentBranch("comet-engine", "COMET ENGINE", [
    "comet-aphelion-drive", "comet-zenith-drive", "comet-shockfront",
  ], comet),
]);
