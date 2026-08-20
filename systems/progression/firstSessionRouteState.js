export const FIRST_SESSION_MILESTONES = Object.freeze([
  "move",
  "dig",
  "recover",
  "return",
  "sell",
  "upgrade",
  "resume",
]);

const MILESTONE_SET = new Set(FIRST_SESSION_MILESTONES);

const finiteTimestamp = value => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.floor(numeric))
    : 0;
};

const finiteCount = value => Math.max(
  0,
  Math.min(1000000, Math.floor(Number(value) || 0)),
);

export function createFirstSessionRouteState() {
  return {
    startedAt: 0,
    completedAt: 0,
    milestones: Object.fromEntries(FIRST_SESSION_MILESTONES.map(id => [id, {
      completedAt: 0,
      assistCount: 0,
    }])),
    assistCounts: {},
    stopReason: null,
  };
}

export function sanitizeFirstSessionRouteState(value) {
  const source = value && typeof value === "object" ? value : {};
  const base = createFirstSessionRouteState();
  for (const id of FIRST_SESSION_MILESTONES) {
    const milestone = source.milestones?.[id];
    base.milestones[id] = {
      completedAt: finiteTimestamp(milestone?.completedAt),
      assistCount: finiteCount(milestone?.assistCount),
    };
  }
  const rawAssists = source.assistCounts && typeof source.assistCounts === "object"
    ? source.assistCounts
    : {};
  base.assistCounts = Object.fromEntries(
    Object.entries(rawAssists)
      .filter(([reason]) => /^[a-z0-9-]{1,48}$/.test(reason))
      .slice(0, 32)
      .map(([reason, count]) => [reason, finiteCount(count)]),
  );
  base.startedAt = finiteTimestamp(source.startedAt);
  base.completedAt = finiteTimestamp(source.completedAt);
  base.stopReason = typeof source.stopReason === "string"
    && /^[a-z0-9-]{1,48}$/.test(source.stopReason)
    ? source.stopReason
    : null;
  return base;
}

export function startFirstSessionRoute(state, at = Date.now()) {
  const next = sanitizeFirstSessionRouteState(state);
  if (!next.startedAt) next.startedAt = finiteTimestamp(at);
  return next;
}

export function completeFirstSessionMilestone(state, id, at = Date.now()) {
  const next = startFirstSessionRoute(state, at);
  if (!MILESTONE_SET.has(id)) return next;
  if (!next.milestones[id].completedAt) {
    next.milestones[id].completedAt = finiteTimestamp(at);
  }
  if (id === FIRST_SESSION_MILESTONES.at(-1)) {
    next.completedAt ||= finiteTimestamp(at);
    next.stopReason = null;
  }
  return next;
}

export function recordFirstSessionAssist(state, reason, milestone = null) {
  const next = startFirstSessionRoute(state);
  const safeReason = String(reason || "").trim().toLowerCase();
  if (!/^[a-z0-9-]{1,48}$/.test(safeReason)) return next;
  next.assistCounts[safeReason] = finiteCount(
    (next.assistCounts[safeReason] || 0) + 1,
  );
  if (MILESTONE_SET.has(milestone)) {
    next.milestones[milestone].assistCount = finiteCount(
      next.milestones[milestone].assistCount + 1,
    );
  }
  return next;
}

export function recordFirstSessionStop(state, reason) {
  const next = startFirstSessionRoute(state);
  const safeReason = String(reason || "").trim().toLowerCase();
  if (/^[a-z0-9-]{1,48}$/.test(safeReason)) next.stopReason = safeReason;
  return next;
}

export function completeMilestoneForTutorialStage(state, stage) {
  const milestone = {
    dig: "move",
    flight: "dig",
    portal: "recover",
    sell: "return",
    upgrade: "sell",
    resume: "upgrade",
    complete: "resume",
  }[stage];
  return milestone ? completeFirstSessionMilestone(state, milestone) : state;
}
