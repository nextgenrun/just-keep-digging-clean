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
    requiredLevel: 3, starsCost: 0, effectId: "unlock-wayward-star",
    description: "Unlock the Wayward Star ability.",
  }),
  talentNode({
    id: "wayward-stellar-bearings", branchId: "wayward-star", row: 1, lane: -1,
    kind: "upgrade", path: "MOMENTUM", name: "Stellar Bearings", requiredLevel: 4,
    starsCost: 50, prerequisiteIds: ["wayward-star-root"], effectId: "wayward-speed",
    description: "Wayward Star travels 0.8 tiles per second faster, capped at 10.",
  }),
  talentNode({
    id: "wayward-ricochet-matrix", branchId: "wayward-star", row: 1, lane: 0,
    kind: "upgrade", path: "RICOCHET", name: "Ricochet Matrix", requiredLevel: 4,
    starsCost: 50, prerequisiteIds: ["wayward-star-root"], effectId: "wayward-extra-bounces",
    description: "Add 2 ricochets to every Wayward Star activation.",
  }),
  talentNode({
    id: "wayward-nova-lens", branchId: "wayward-star", row: 1, lane: 1,
    kind: "upgrade", path: "SUPERNOVA", name: "Nova Lens", requiredLevel: 4,
    starsCost: 50, prerequisiteIds: ["wayward-star-root"], effectId: "wayward-supernova-radius",
    description: "Increase the final detonation radius by 1 tile.",
  }),
  talentNode({
    id: "wayward-echo-orbit", branchId: "wayward-star", row: 2, lane: -1,
    kind: "upgrade", path: "MOMENTUM", name: "Echo Orbit", requiredLevel: 4,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["wayward-stellar-bearings", "wayward-ricochet-matrix"],
    effectId: "wayward-lifetime", description: "Keep Wayward Star active for 1 extra second.",
  }),
  talentNode({
    id: "wayward-vector-command", branchId: "wayward-star", row: 2, lane: 0,
    kind: "upgrade", path: "RICOCHET", name: "Vector Command", requiredLevel: 4,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["wayward-stellar-bearings", "wayward-ricochet-matrix", "wayward-nova-lens"],
    effectId: "wayward-extra-redirect", description: "Add 1 controlled redirection per activation.",
  }),
  talentNode({
    id: "wayward-fracture-bloom", branchId: "wayward-star", row: 2, lane: 1,
    kind: "upgrade", path: "SUPERNOVA", name: "Fracture Bloom", requiredLevel: 4,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["wayward-ricochet-matrix", "wayward-nova-lens"],
    effectId: "wayward-fracture-capacity", description: "Add 4 impact targets per activation.",
  }),
  talentNode({
    id: "wayward-perihelion-loop", branchId: "wayward-star", row: 3, lane: -1,
    kind: "capstone", path: "MOMENTUM", name: "Perihelion Loop", requiredLevel: 5,
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["wayward-echo-orbit", "wayward-vector-command"],
    effectId: "wayward-perihelion-mastery",
    description: "Add 2 ricochets and 1 redirect, then unlock another Engine root choice.",
  }),
  talentNode({
    id: "wayward-impact-lattice", branchId: "wayward-star", row: 3, lane: 0,
    displayRole: "bridge",
    kind: "upgrade", path: "RICOCHET", name: "Impact Lattice", requiredLevel: 5,
    starsCost: 100, prerequisiteIds: ["wayward-vector-command"],
    effectId: "wayward-impact-capacity", description: "Add 6 impact targets per activation.",
  }),
  talentNode({
    id: "wayward-supernova-core", branchId: "wayward-star", row: 3, lane: 0,
    kind: "capstone", path: "RICOCHET", name: "Supernova Core", requiredLevel: 5,
    starsCost: 150, prerequisiteIds: ["wayward-impact-lattice"],
    effectId: "wayward-supernova-mastery",
    description: "Add 4 impact targets and 1 tile of detonation radius; unlock another root.",
  }),
  talentNode({
    id: "wayward-white-dwarf-shell", branchId: "wayward-star", row: 3, lane: 1,
    kind: "capstone", path: "SUPERNOVA", name: "White Dwarf Shell", requiredLevel: 5,
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["wayward-vector-command", "wayward-fracture-bloom"],
    effectId: "wayward-white-dwarf-mastery",
    description: "Add 6 impact targets and 1 tile of detonation radius; unlock another root.",
  }),
];

const hollow = [
  talentNode({
    id: "hollow-sun-root", branchId: "hollow-sun", row: 0, lane: 0,
    kind: "ability", path: "CORE", name: "Hollow Sun", abilityId: "hollow-sun",
    requiredLevel: 3, starsCost: 0, effectId: "unlock-hollow-sun",
    description: "Unlock the Hollow Sun ability.",
  }),
  talentNode({
    id: "hollow-orbit-anchor", branchId: "hollow-sun", row: 1, lane: -1,
    kind: "upgrade", path: "FIELD", name: "Orbit Anchor", requiredLevel: 4,
    starsCost: 50, prerequisiteIds: ["hollow-sun-root"], effectId: "hollow-placement-range",
    description: "Place the Hollow Sun gravity core 1 tile farther away.",
  }),
  talentNode({
    id: "hollow-gravity-well", branchId: "hollow-sun", row: 1, lane: 0,
    kind: "upgrade", path: "COLLAPSE", name: "Gravity Well", requiredLevel: 4,
    starsCost: 50, prerequisiteIds: ["hollow-sun-root"], effectId: "hollow-pulse-radius",
    description: "Increase every gravity-pulse radius by 1 tile.",
  }),
  talentNode({
    id: "hollow-echo-seed", branchId: "hollow-sun", row: 1, lane: 1,
    kind: "upgrade", path: "TIME", name: "Echo Seed", requiredLevel: 4,
    starsCost: 50, prerequisiteIds: ["hollow-sun-root"], effectId: "hollow-extra-pulse",
    description: "Add a fourth gravity pulse at 3.4 seconds with a 5-tile radius.",
  }),
  talentNode({
    id: "hollow-tidal-lens", branchId: "hollow-sun", row: 2, lane: -1,
    kind: "upgrade", path: "FIELD", name: "Tidal Lens", requiredLevel: 4,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["hollow-orbit-anchor", "hollow-gravity-well"],
    effectId: "hollow-tidal-radius", description: "Add another 1 tile to every pulse radius.",
  }),
  talentNode({
    id: "hollow-event-horizon", branchId: "hollow-sun", row: 2, lane: 0,
    kind: "upgrade", path: "COLLAPSE", name: "Event Horizon", requiredLevel: 4,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["hollow-orbit-anchor", "hollow-gravity-well", "hollow-echo-seed"],
    effectId: "hollow-impact-capacity", description: "Add 8 impact targets per activation.",
  }),
  talentNode({
    id: "hollow-dark-reservoir", branchId: "hollow-sun", row: 2, lane: 1,
    kind: "upgrade", path: "TIME", name: "Dark Reservoir", requiredLevel: 4,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["hollow-gravity-well", "hollow-echo-seed"],
    effectId: "hollow-reservoir-capacity", description: "Add 6 impact targets per activation.",
  }),
  talentNode({
    id: "hollow-abyssal-field", branchId: "hollow-sun", row: 3, lane: -1,
    kind: "capstone", path: "FIELD", name: "Abyssal Field", requiredLevel: 5,
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["hollow-tidal-lens", "hollow-event-horizon"],
    effectId: "hollow-abyssal-mastery",
    description: "Add 4 impacts plus a 4-target, 1-tile implosion; unlock another root.",
  }),
  talentNode({
    id: "hollow-collapse-cycle", branchId: "hollow-sun", row: 3, lane: 0,
    displayRole: "bridge",
    kind: "upgrade", path: "COLLAPSE", name: "Collapse Cycle", requiredLevel: 5,
    starsCost: 100, prerequisiteIds: ["hollow-event-horizon"],
    effectId: "hollow-pulse-tempo", description: "Trigger every gravity pulse 22% sooner.",
  }),
  talentNode({
    id: "hollow-singularity-core", branchId: "hollow-sun", row: 3, lane: 0,
    kind: "capstone", path: "COLLAPSE", name: "Singularity Core", requiredLevel: 5,
    starsCost: 150, prerequisiteIds: ["hollow-collapse-cycle"],
    effectId: "hollow-implosion-mastery",
    description: "Add a 6-target implosion within 2 tiles and unlock another root.",
  }),
  talentNode({
    id: "hollow-chronosphere", branchId: "hollow-sun", row: 3, lane: 1,
    kind: "capstone", path: "TIME", name: "Chronosphere", requiredLevel: 5,
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["hollow-event-horizon", "hollow-dark-reservoir"],
    effectId: "hollow-chronosphere-mastery",
    description: "Trigger pulses 18% sooner, add 4 impacts, and unlock another root.",
  }),
];

const comet = [
  talentNode({
    id: "comet-engine-root", branchId: "comet-engine", row: 0, lane: 0,
    kind: "ability", path: "CORE", name: "Comet Engine", abilityId: "comet-engine",
    requiredLevel: 3, starsCost: 0, effectId: "unlock-comet-engine",
    description: "Unlock the Comet Engine ability.",
  }),
  talentNode({
    id: "comet-ignition-coil", branchId: "comet-engine", row: 1, lane: -1,
    kind: "upgrade", path: "VELOCITY", name: "Ignition Coil", requiredLevel: 4,
    starsCost: 50, prerequisiteIds: ["comet-engine-root"], effectId: "comet-ignition-speed",
    description: "Increase Comet Engine travel speed by 1 tile per second.",
  }),
  talentNode({
    id: "comet-bore-drive", branchId: "comet-engine", row: 1, lane: 0,
    kind: "upgrade", path: "BORE", name: "Bore Drive", requiredLevel: 4,
    starsCost: 50, prerequisiteIds: ["comet-engine-root"], effectId: "comet-travel-capacity",
    description: "Extend the protected tunnel route by 4 tiles.",
  }),
  talentNode({
    id: "comet-fracture-nose", branchId: "comet-engine", row: 1, lane: 1,
    kind: "upgrade", path: "SHOCK", name: "Fracture Nose", requiredLevel: 4,
    starsCost: 50, prerequisiteIds: ["comet-engine-root"], effectId: "comet-fracture-capacity",
    description: "Add 3 impact targets per activation.",
  }),
  talentNode({
    id: "comet-longburn-reservoir", branchId: "comet-engine", row: 2, lane: -1,
    kind: "upgrade", path: "VELOCITY", name: "Longburn Reservoir", requiredLevel: 4,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["comet-ignition-coil", "comet-bore-drive"],
    effectId: "comet-longburn-lifetime", description: "Keep Comet Engine active for 300 ms longer.",
  }),
  talentNode({
    id: "comet-rider-plating", branchId: "comet-engine", row: 2, lane: 0,
    kind: "upgrade", path: "BORE", name: "Rider Plating", requiredLevel: 4,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["comet-ignition-coil", "comet-bore-drive", "comet-fracture-nose"],
    effectId: "comet-ride-control", description: "Increase the initial rider launch speed by 90 px per second.",
  }),
  talentNode({
    id: "comet-wide-wake", branchId: "comet-engine", row: 2, lane: 1,
    kind: "upgrade", path: "SHOCK", name: "Wide Wake", requiredLevel: 4,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["comet-bore-drive", "comet-fracture-nose"],
    effectId: "comet-wide-wake-pattern", description: "Trigger protected side bursts every 2 traveled tiles.",
  }),
  talentNode({
    id: "comet-aphelion-drive", branchId: "comet-engine", row: 3, lane: -1,
    kind: "capstone", path: "VELOCITY", name: "Aphelion Drive", requiredLevel: 5,
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["comet-longburn-reservoir", "comet-rider-plating"],
    effectId: "comet-aphelion-mastery",
    description: "Add 3 travel tiles, 1 tile per second and 3 impacts; unlock another root.",
  }),
  talentNode({
    id: "comet-impact-wake", branchId: "comet-engine", row: 3, lane: 0,
    displayRole: "bridge",
    kind: "upgrade", path: "BORE", name: "Impact Wake", requiredLevel: 5,
    starsCost: 100, prerequisiteIds: ["comet-rider-plating"],
    effectId: "comet-impact-capacity", description: "Add 6 impact targets per activation.",
  }),
  talentNode({
    id: "comet-zenith-drive", branchId: "comet-engine", row: 3, lane: 0,
    kind: "capstone", path: "BORE", name: "Zenith Drive", requiredLevel: 5,
    starsCost: 150, prerequisiteIds: ["comet-impact-wake"],
    effectId: "comet-drive-mastery",
    description: "Add 2 tiles per second, side bursts every 2 tiles and 250 ms; unlock another root.",
  }),
  talentNode({
    id: "comet-shockfront", branchId: "comet-engine", row: 3, lane: 1,
    kind: "capstone", path: "SHOCK", name: "Shockfront", requiredLevel: 5,
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["comet-rider-plating", "comet-wide-wake"],
    effectId: "comet-shockfront-mastery",
    description: "Add 1 travel tile and 5 impact targets; unlock another Engine root.",
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
