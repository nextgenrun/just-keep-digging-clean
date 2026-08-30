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
    description: "Release 1 rebounding star. Activations cost 100 Celestial Charge.",
  }),
  talentNode({
    id: "wayward-stellar-bearings", branchId: "wayward-star", row: 1, lane: -1,
    kind: "upgrade", path: "MOMENTUM", name: "Stellar Bearings", requiredLevel: 4,
    starsCost: 50, prerequisiteIds: ["wayward-star-root"], effectId: "wayward-speed",
    description: "Wayward Star travels 1 tile per second faster, capped at 10.",
  }),
  talentNode({
    id: "wayward-ricochet-matrix", branchId: "wayward-star", row: 1, lane: 0,
    kind: "upgrade", path: "RICOCHET", name: "Ricochet Matrix", requiredLevel: 4,
    starsCost: 50, prerequisiteIds: ["wayward-star-root"], effectId: "wayward-extra-bounces",
    description: "Add 2 ricochets and 2 ricochet targets per activation.",
  }),
  talentNode({
    id: "wayward-nova-lens", branchId: "wayward-star", row: 1, lane: 1,
    kind: "upgrade", path: "SUPERNOVA", name: "Nova Lens", requiredLevel: 4,
    starsCost: 50, prerequisiteIds: ["wayward-star-root"], effectId: "wayward-supernova-radius",
    description: "Add 1 detonation tile of radius and 3 supernova targets.",
  }),
  talentNode({
    id: "wayward-echo-orbit", branchId: "wayward-star", row: 2, lane: -1,
    kind: "upgrade", path: "MOMENTUM", name: "Echo Orbit", requiredLevel: 4,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["wayward-stellar-bearings", "wayward-ricochet-matrix"],
    effectId: "wayward-lifetime", description: "Keep Wayward Star active for 1.5 extra seconds.",
  }),
  talentNode({
    id: "wayward-vector-command", branchId: "wayward-star", row: 2, lane: 0,
    kind: "upgrade", path: "RICOCHET", name: "Twin Orbit", requiredLevel: 4,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["wayward-stellar-bearings", "wayward-ricochet-matrix", "wayward-nova-lens"],
    effectId: "wayward-extra-star", description: "Release 1 additional Wayward Star at the same time.",
  }),
  talentNode({
    id: "wayward-fracture-bloom", branchId: "wayward-star", row: 2, lane: 1,
    kind: "upgrade", path: "SUPERNOVA", name: "Fracture Bloom", requiredLevel: 4,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["wayward-ricochet-matrix", "wayward-nova-lens"],
    effectId: "wayward-fracture-capacity", description: "Add 5 targets to the final supernova.",
  }),
  talentNode({
    id: "wayward-perihelion-loop", branchId: "wayward-star", row: 3, lane: -1,
    kind: "capstone", path: "MOMENTUM", name: "Perihelion Loop", requiredLevel: 5,
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["wayward-echo-orbit", "wayward-vector-command"],
    effectId: "wayward-perihelion-mastery",
    description: "Add 1 simultaneous star, 2 ricochets and 4 ricochet targets; unlock another root.",
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
    description: "Add 1 simultaneous star, 3 ricochet and 3 supernova targets plus 1 radius; unlock another root.",
  }),
  talentNode({
    id: "wayward-white-dwarf-shell", branchId: "wayward-star", row: 3, lane: 1,
    kind: "capstone", path: "SUPERNOVA", name: "White Dwarf Shell", requiredLevel: 5,
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["wayward-vector-command", "wayward-fracture-bloom"],
    effectId: "wayward-white-dwarf-mastery",
    description: "Add 1 simultaneous star, 6 supernova targets and 1 tile of radius; unlock another root.",
  }),
];

const hollow = [
  talentNode({
    id: "hollow-sun-root", branchId: "hollow-sun", row: 0, lane: 0,
    kind: "ability", path: "CORE", name: "Hollow Sun", abilityId: "hollow-sun",
    requiredLevel: 3, starsCost: 0, effectId: "unlock-hollow-sun",
    description: "Deploy 2 black holes with 4 independent gravity pulses each. Activations cost 100 GP.",
  }),
  talentNode({
    id: "hollow-orbit-anchor", branchId: "hollow-sun", row: 1, lane: -1,
    kind: "upgrade", path: "FIELD", name: "Orbit Anchor", requiredLevel: 4,
    starsCost: 50, prerequisiteIds: ["hollow-sun-root"], effectId: "hollow-placement-range",
    description: "Place the cluster 2 tiles farther away and spread its black holes wider.",
  }),
  talentNode({
    id: "hollow-gravity-well", branchId: "hollow-sun", row: 1, lane: 0,
    kind: "upgrade", path: "COLLAPSE", name: "Gravity Well", requiredLevel: 4,
    starsCost: 50, prerequisiteIds: ["hollow-sun-root"], effectId: "hollow-pulse-radius",
    description: "Increase every black-hole pulse radius by 1 tile.",
  }),
  talentNode({
    id: "hollow-echo-seed", branchId: "hollow-sun", row: 1, lane: 1,
    kind: "upgrade", path: "TIME", name: "Echo Seed", requiredLevel: 4,
    starsCost: 50, prerequisiteIds: ["hollow-sun-root"], effectId: "hollow-extra-pulse",
    description: "Spawn 1 additional black hole in every cluster.",
  }),
  talentNode({
    id: "hollow-tidal-lens", branchId: "hollow-sun", row: 2, lane: -1,
    kind: "upgrade", path: "FIELD", name: "Tidal Lens", requiredLevel: 4,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["hollow-orbit-anchor", "hollow-gravity-well"],
    effectId: "hollow-tidal-radius", description: "Add another 1 tile to every pulse radius and pull debris farther.",
  }),
  talentNode({
    id: "hollow-event-horizon", branchId: "hollow-sun", row: 2, lane: 0,
    kind: "upgrade", path: "COLLAPSE", name: "Event Horizon", requiredLevel: 4,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["hollow-orbit-anchor", "hollow-gravity-well", "hollow-echo-seed"],
    effectId: "hollow-impact-capacity", description: "Add 2 target slots to every pulse from every black hole.",
  }),
  talentNode({
    id: "hollow-dark-reservoir", branchId: "hollow-sun", row: 2, lane: 1,
    kind: "upgrade", path: "TIME", name: "Dark Reservoir", requiredLevel: 4,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["hollow-gravity-well", "hollow-echo-seed"],
    effectId: "hollow-reservoir-capacity", description: "Add a fifth pulse and keep every black hole active 1.5 seconds longer.",
  }),
  talentNode({
    id: "hollow-abyssal-field", branchId: "hollow-sun", row: 3, lane: -1,
    kind: "capstone", path: "FIELD", name: "Abyssal Field", requiredLevel: 5,
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["hollow-tidal-lens", "hollow-event-horizon"],
    effectId: "hollow-abyssal-mastery",
    description: "Add 1 black hole and an 8-target implosion to every core; unlock another root.",
  }),
  talentNode({
    id: "hollow-collapse-cycle", branchId: "hollow-sun", row: 3, lane: 0,
    displayRole: "bridge",
    kind: "upgrade", path: "COLLAPSE", name: "Collapse Cycle", requiredLevel: 5,
    starsCost: 100, prerequisiteIds: ["hollow-event-horizon"],
    effectId: "hollow-collapse-pulse",
    description: "Spawn the cluster and cycle all gravity pulses 18% faster.",
  }),
  talentNode({
    id: "hollow-singularity-core", branchId: "hollow-sun", row: 3, lane: 0,
    kind: "capstone", path: "COLLAPSE", name: "Singularity Core", requiredLevel: 5,
    starsCost: 150, prerequisiteIds: ["hollow-collapse-cycle"],
    effectId: "hollow-implosion-mastery",
    description: "Add 1 black hole and raise every implosion to 12 targets; unlock another root.",
  }),
  talentNode({
    id: "hollow-chronosphere", branchId: "hollow-sun", row: 3, lane: 1,
    kind: "capstone", path: "TIME", name: "Chronosphere", requiredLevel: 5,
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["hollow-event-horizon", "hollow-dark-reservoir"],
    effectId: "hollow-chronosphere-mastery",
    description: "Add a sixth pulse, 1 target per pulse and 2.5 seconds; unlock another root.",
  }),
];

const rage = [
  talentNode({
    id: "comet-engine-root", branchId: "comet-engine", row: 0, lane: 0,
    kind: "ability", path: "CORE", name: "Stellar Lance", abilityId: "comet-engine",
    requiredLevel: 3, starsCost: 0, effectId: "unlock-stellar-rage",
    description: "For 6 seconds, every dig fires a 6-tile projectile that deals full damage to every pierced block. Costs 100 GP.",
  }),
  talentNode({
    id: "comet-ignition-coil", branchId: "comet-engine", row: 1, lane: -1,
    kind: "upgrade", path: "POWER", name: "Lance Core", requiredLevel: 4,
    starsCost: 50, prerequisiteIds: ["comet-engine-root"], effectId: "rage-damage-i",
    description: "Increase Stellar Lance projectile damage from 100% to 125%.",
  }),
  talentNode({
    id: "comet-bore-drive", branchId: "comet-engine", row: 1, lane: 0,
    kind: "upgrade", path: "RANGE", name: "Longshot Chamber", requiredLevel: 4,
    starsCost: 50, prerequisiteIds: ["comet-engine-root"], effectId: "rage-speed-i",
    description: "Increase every Stellar Lance projectile from 6 to 8 tiles of range.",
  }),
  talentNode({
    id: "comet-fracture-nose", branchId: "comet-engine", row: 1, lane: 1,
    kind: "upgrade", path: "DURATION", name: "Sustained Orbit", requiredLevel: 4,
    starsCost: 50, prerequisiteIds: ["comet-engine-root"], effectId: "rage-duration-i",
    description: "Keep the projectile buff active 1.5 seconds longer.",
  }),
  talentNode({
    id: "comet-longburn-reservoir", branchId: "comet-engine", row: 2, lane: -1,
    kind: "upgrade", path: "POWER", name: "Piercing Charge", requiredLevel: 4,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["comet-ignition-coil", "comet-bore-drive"],
    effectId: "rage-damage-ii", description: "Raise projectile damage from 125% to 150%.",
  }),
  talentNode({
    id: "comet-rider-plating", branchId: "comet-engine", row: 2, lane: 0,
    kind: "upgrade", path: "RANGE", name: "Deep Flight", requiredLevel: 4,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["comet-ignition-coil", "comet-bore-drive", "comet-fracture-nose"],
    effectId: "rage-speed-ii", description: "Add another 2 tiles of projectile range.",
  }),
  talentNode({
    id: "comet-wide-wake", branchId: "comet-engine", row: 2, lane: 1,
    kind: "upgrade", path: "DURATION", name: "Star Reservoir", requiredLevel: 4,
    starsCost: 75, prerequisiteMode: "any",
    prerequisiteIds: ["comet-bore-drive", "comet-fracture-nose"],
    effectId: "rage-duration-ii", description: "Keep Stellar Lance active 1.5 seconds longer.",
  }),
  talentNode({
    id: "comet-aphelion-drive", branchId: "comet-engine", row: 3, lane: -1,
    kind: "capstone", path: "POWER", name: "Worldpiercer", requiredLevel: 5,
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["comet-longburn-reservoir", "comet-rider-plating"],
    effectId: "rage-damage-capstone",
    description: "Raise projectile damage from 150% to 200% and unlock another root.",
  }),
  talentNode({
    id: "comet-impact-wake", branchId: "comet-engine", row: 3, lane: 0,
    displayRole: "bridge",
    kind: "upgrade", path: "RANGE", name: "Far Horizon", requiredLevel: 5,
    starsCost: 100, prerequisiteIds: ["comet-rider-plating"],
    effectId: "rage-speed-bridge", description: "Raise maximum projectile range to 12 tiles.",
  }),
  talentNode({
    id: "comet-zenith-drive", branchId: "comet-engine", row: 3, lane: 0,
    kind: "capstone", path: "RANGE", name: "Trident Break", requiredLevel: 5,
    starsCost: 150, prerequisiteIds: ["comet-impact-wake"],
    effectId: "rage-limit-break",
    description: "Fire two parallel side lances with the center projectile; unlock another root.",
  }),
  talentNode({
    id: "comet-shockfront", branchId: "comet-engine", row: 3, lane: 1,
    kind: "capstone", path: "DURATION", name: "Endless Volley", requiredLevel: 5,
    starsCost: 250, prerequisiteMode: "any",
    prerequisiteIds: ["comet-rider-plating", "comet-wide-wake"],
    effectId: "rage-duration-capstone",
    description: "Keep Stellar Lance active 2 seconds longer and unlock another root.",
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
