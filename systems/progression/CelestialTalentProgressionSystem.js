import {
  CELESTIAL_TALENT_NODES_BY_ID,
  CELESTIAL_TALENT_PROGRESSION_CONFIG,
  getCelestialTalentPrerequisiteState,
  getCelestialStarPointYield,
  sanitizeCelestialTalentProgressionData,
} from "../../values/celestialTalentProgression.js";

const ORDERED_NODE_IDS = Object.freeze(
  CELESTIAL_TALENT_PROGRESSION_CONFIG.branches.flatMap(
    branch => branch.nodes.map(node => node.id),
  ),
);

function safePlayerLevel(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function purchasedSet(data) {
  return new Set(data.purchasedNodeIds);
}

function completedBranchIds(purchased) {
  return CELESTIAL_TALENT_PROGRESSION_CONFIG.branches
    .filter(branch => branch.completionNodeIds.some(
      nodeId => purchased.has(nodeId),
    ))
    .map(branch => branch.id);
}

function purchasedRootIds(purchased) {
  return CELESTIAL_TALENT_PROGRESSION_CONFIG.branches
    .map(branch => branch.rootNodeId)
    .filter(nodeId => purchased.has(nodeId));
}

export class CelestialTalentProgressionSystem {
  constructor({ onChanged = null, getPlayerLevel = null, isGodModeActive = null } = {}) {
    this._onChanged = typeof onChanged === "function" ? onChanged : null;
    this._getPlayerLevel = typeof getPlayerLevel === "function" ? getPlayerLevel : null;
    this._isGodModeActiveProvider = typeof isGodModeActive === "function"
      ? isGodModeActive
      : null;
    this._listeners = new Set();
    this._data = sanitizeCelestialTalentProgressionData(null);
  }

  loadSaveData(data) {
    this._data = sanitizeCelestialTalentProgressionData(data);
    this._emit("loaded", false, null);
    return this.getSnapshot();
  }

  grantStars(amount, detail = null) {
    const requested = Math.max(0, Math.floor(Number(amount) || 0));
    if (requested <= 0) return 0;
    const maximum = CELESTIAL_TALENT_PROGRESSION_CONFIG.currency.maximumBalance;
    const granted = Math.max(0, Math.min(requested, maximum - this._data.stars));
    if (granted <= 0) return 0;

    this._data.stars += granted;
    this._data.lifetimeStarsEarned = Math.min(
      CELESTIAL_TALENT_PROGRESSION_CONFIG.currency.maximumLifetimeEarned,
      this._data.lifetimeStarsEarned + granted,
    );
    this._emit("stars-granted", true, { requested, granted, ...detail });
    return granted;
  }

  grantStarsFromRarity(rarity, count = 1) {
    const safeCount = Math.max(0, Math.floor(Number(count) || 0));
    const pointsEach = getCelestialStarPointYield(rarity);
    if (safeCount <= 0 || pointsEach <= 0) return 0;
    return this.grantStars(pointsEach * safeCount, {
      source: "star-rarity",
      rarity,
      count: safeCount,
      pointsEach,
    });
  }

  getNodeAvailability(nodeId, playerLevel) {
    const node = CELESTIAL_TALENT_NODES_BY_ID[nodeId];
    if (!node) return { available: false, reason: "unknown-node", nodeId };
    const level = this._resolvePlayerLevel(playerLevel);
    const purchased = purchasedSet(this._data);
    return this._buildNodeAvailability(node, level, purchased);
  }

  purchaseNode(nodeId, playerLevel) {
    const availability = this.getNodeAvailability(nodeId, playerLevel);
    if (!availability.available) return { ok: false, ...availability };

    const node = CELESTIAL_TALENT_NODES_BY_ID[nodeId];
    const godMode = this.isGodModeActive();
    const starsSpent = godMode ? 0 : node.starsCost;
    const completedBefore = new Set(completedBranchIds(purchasedSet(this._data)));
    this._data.stars -= starsSpent;
    this._data.spentStars += starsSpent;
    const purchased = new Set(this._data.purchasedNodeIds);
    purchased.add(nodeId);
    this._data.purchasedNodeIds = ORDERED_NODE_IDS.filter(id => purchased.has(id));

    const completedAfter = new Set(completedBranchIds(purchasedSet(this._data)));
    const branchCompleted = !completedBefore.has(node.branchId)
      && completedAfter.has(node.branchId);
    const detail = {
      nodeId,
      branchId: node.branchId,
      starsSpent,
      godMode,
      branchCompleted,
      unlockedRootSelection: branchCompleted,
    };
    this._emit("node-purchased", true, detail);
    return { ok: true, reason: null, ...detail, snapshot: this.getSnapshot() };
  }

  getSaveData() {
    const clean = sanitizeCelestialTalentProgressionData(this._data);
    return { ...clean, purchasedNodeIds: [...clean.purchasedNodeIds] };
  }

  getSnapshot(playerLevel) {
    const data = this.getSaveData();
    const level = this._resolvePlayerLevel(playerLevel);
    const godMode = this.isGodModeActive();
    const purchased = purchasedSet(data);
    const completed = completedBranchIds(purchased);
    const roots = purchasedRootIds(purchased);
    const rootCapacity = this._getRootSelectionCapacity(roots.length, completed.length);
    const branches = CELESTIAL_TALENT_PROGRESSION_CONFIG.branches.map(branch => ({
      id: branch.id,
      name: branch.name,
      rootNodeId: branch.rootNodeId,
      completionNodeIds: [...branch.completionNodeIds],
      rootPurchased: purchased.has(branch.rootNodeId),
      completed: completed.includes(branch.id),
      mastered: branch.nodes.every(node => purchased.has(node.id)),
      purchasedCount: branch.nodes.filter(node => purchased.has(node.id)).length,
      nodeCount: branch.nodes.length,
      nodes: branch.nodes.map(node => ({
        ...node,
        purchased: purchased.has(node.id),
        ...this._buildNodeAvailability(node, level, purchased),
      })),
    }));
    const rowTwoBranches = branches.filter(branch => branch.nodes.some(
      node => node.row >= 2 && node.purchased,
    )).length;
    const allBranchesCompleted = completed.length === branches.length;
    const pillarProgressUnits = Math.min(10,
      roots.length + rowTwoBranches + completed.length + (allBranchesCompleted ? 1 : 0));
    const unlockedAbilities = CELESTIAL_TALENT_PROGRESSION_CONFIG.branches
      .filter(branch => purchased.has(branch.rootNodeId))
      .map(branch => {
        const root = CELESTIAL_TALENT_NODES_BY_ID[branch.rootNodeId];
        return {
          branchId: branch.id,
          nodeId: root.id,
          abilityId: root.abilityId,
          name: root.name,
        };
      });

    return {
      ...data,
      playerLevel: level,
      requiredPlayerLevel: CELESTIAL_TALENT_PROGRESSION_CONFIG.access.requiredPlayerLevel,
      accessUnlocked: godMode
        || level >= CELESTIAL_TALENT_PROGRESSION_CONFIG.access.requiredPlayerLevel,
      godMode,
      rootSelectionCapacity: rootCapacity,
      availableRootSelections: Math.max(0, rootCapacity - roots.length),
      purchasedRootNodeIds: roots,
      completedBranchIds: completed,
      allBranchesCompleted,
      pillarProgressUnits,
      unlockedAbilityIds: unlockedAbilities.map(ability => ability.abilityId),
      unlockedAbilities,
      unlockedEffectIds: ORDERED_NODE_IDS
        .filter(nodeId => purchased.has(nodeId))
        .map(nodeId => CELESTIAL_TALENT_NODES_BY_ID[nodeId].effectId),
      branches,
    };
  }

  subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    this._listeners.add(listener);
    listener(this.getSnapshot(), "subscribed", null);
    return () => this._listeners.delete(listener);
  }

  destroy() {
    this._listeners.clear();
    this._onChanged = null;
    this._getPlayerLevel = null;
    this._isGodModeActiveProvider = null;
  }

  isGodModeActive() {
    return this._isGodModeActiveProvider?.() === true;
  }

  _buildNodeAvailability(node, playerLevel, purchased) {
    const prerequisiteState = getCelestialTalentPrerequisiteState(node, purchased);
    const godMode = this.isGodModeActive();
    const base = {
      nodeId: node.id,
      requiredLevel: node.requiredLevel,
      playerLevel,
      starsCost: godMode ? 0 : node.starsCost,
      normalStarsCost: node.starsCost,
      starsBalance: this._data.stars,
      godMode,
      prerequisiteMode: prerequisiteState.mode,
      purchasedPrerequisiteIds: prerequisiteState.purchasedPrerequisiteIds,
      missingPrerequisiteIds: prerequisiteState.missingPrerequisiteIds,
    };
    if (purchased.has(node.id)) {
      return { ...base, available: false, reason: "already-purchased" };
    }
    if (godMode) return { ...base, available: true, reason: null };
    if (playerLevel < CELESTIAL_TALENT_PROGRESSION_CONFIG.access.requiredPlayerLevel) {
      return { ...base, available: false, reason: "talents-locked" };
    }
    if (playerLevel < node.requiredLevel) {
      return { ...base, available: false, reason: "level-locked" };
    }
    if (node.kind === "ability") {
      const roots = purchasedRootIds(purchased);
      const completed = completedBranchIds(purchased);
      const capacity = this._getRootSelectionCapacity(roots.length, completed.length);
      if (roots.length >= capacity) {
        return { ...base, available: false, reason: "root-choice-locked" };
      }
    }
    if (!prerequisiteState.satisfied) {
      return { ...base, available: false, reason: "prerequisite-locked" };
    }
    if (this._data.stars < node.starsCost) {
      return { ...base, available: false, reason: "insufficient-stars" };
    }
    return { ...base, available: true, reason: null };
  }

  _getRootSelectionCapacity(rootCount, completedCount) {
    if (this.isGodModeActive()) {
      return CELESTIAL_TALENT_PROGRESSION_CONFIG.branches.length;
    }
    const access = CELESTIAL_TALENT_PROGRESSION_CONFIG.access;
    const earnedCapacity = access.initialFreeRootSelections
      + completedCount * access.rootSelectionsPerCompletedBranch;
    return Math.min(
      CELESTIAL_TALENT_PROGRESSION_CONFIG.branches.length,
      Math.max(rootCount, earnedCapacity),
    );
  }

  _resolvePlayerLevel(override) {
    return safePlayerLevel(
      Number.isFinite(Number(override)) ? override : this._getPlayerLevel?.(),
    );
  }

  _emit(event, persist, detail) {
    const snapshot = this.getSnapshot();
    for (const listener of this._listeners) listener(snapshot, event, detail);
    if (persist) this._onChanged?.(snapshot, event, detail);
  }
}
