// Normalizes authored talent data without owning progression state.

function rankCosts(baseCost, maxRank) {
  return Object.freeze(Array.from(
    { length: maxRank },
    () => Math.max(0, Math.floor(Number(baseCost) || 0)),
  ));
}

export function createTalentNode(definition) {
  const kind = definition.kind || "upgrade";
  const maxRank = kind === "ability"
    ? 1
    : Math.max(1, Math.floor(Number(definition.maxRank) || 3));
  const costs = Array.isArray(definition.rankCosts)
    ? definition.rankCosts.slice(0, maxRank).map(value => Math.max(0, Math.floor(value)))
    : rankCosts(definition.starsCost, maxRank);
  while (costs.length < maxRank) costs.push(costs.at(-1) || 0);
  return Object.freeze({
    ...definition,
    kind,
    tier: definition.row,
    maxRank,
    starsCost: costs[0] || 0,
    rankCosts: Object.freeze(costs),
    prerequisiteMode: definition.prerequisiteMode === "all" ? "all" : "any",
    prerequisiteIds: Object.freeze([...(definition.prerequisiteIds || [])]),
  });
}

export function createTalentBranch(id, name, completionNodeIds, definitions) {
  const nodes = Object.freeze(definitions.map(definition => createTalentNode({
    branchId: id,
    ...definition,
  })));
  return Object.freeze({
    id,
    name,
    rootNodeId: nodes[0].id,
    completionNodeIds: Object.freeze([...completionNodeIds]),
    nodes,
  });
}
