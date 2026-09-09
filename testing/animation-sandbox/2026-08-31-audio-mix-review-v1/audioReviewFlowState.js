import { resolveAudioMixReviewSourceId } from "./audioMixReviewMath.js?v=20260831-audio10";

export function findAudioReviewCategory(flow, itemId) {
  return flow.categories.find(category => category.itemIds.includes(itemId)) || null;
}

export function getAudioReviewItemKind(config, scenarioId) {
  const scenario = config.scenarios[scenarioId];
  if (!scenario) return "NO ITEM";
  const entries = [...scenario.loops, ...scenario.oneShots];
  const approvals = entries.map(entry => {
    const sourceId = resolveAudioMixReviewSourceId(
      entry.sourceId,
      config.defaultAmbience,
    );
    return config.sources[sourceId]?.approval || "unknown";
  });
  if (approvals.length && approvals.every(value => value === "approved-runtime")) {
    return "APPROVED RUNTIME";
  }
  if (approvals.length && approvals.every(value => value === "runtime-reference")) {
    return "RUNTIME REFERENCE";
  }
  return entries.length > 1 ? "SANDBOX MIX" : "SANDBOX CANDIDATE";
}

export function createAudioReviewFlowSnapshot({
  config,
  flow,
  scenarioId,
  categoryId,
  decisionStore,
}) {
  const category = flow.categories.find(item => item.id === categoryId)
    || flow.categories[0];
  const currentItemId = category.itemIds.includes(scenarioId) ? scenarioId : null;
  return {
    categoryId: category.id,
    categoryItemIds: [...category.itemIds],
    categoryItemCount: category.itemIds.length,
    currentItemId,
    itemIndex: currentItemId ? category.itemIds.indexOf(currentItemId) : -1,
    currentKind: currentItemId
      ? getAudioReviewItemKind(config, currentItemId)
      : "NO ITEM",
    currentDecision: currentItemId ? decisionStore.get(currentItemId) : null,
    decisions: decisionStore.getAll(),
    summary: decisionStore.summary(),
  };
}
