/* global SPRITE_AUDIT_CONFIG */

const SpriteAuditFeedback = (() => {
  function keyOf(issue) {
    return [issue.animationId, issue.frame, issue.viewId, issue.transitionId || "frame", issue.issueType].join("/");
  }

  function load() {
    try {
      const raw = localStorage.getItem(SPRITE_AUDIT_CONFIG.localStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  let issues = load();

  function persist() {
    localStorage.setItem(SPRITE_AUDIT_CONFIG.localStorageKey, JSON.stringify(issues));
  }

  function list() {
    return [...issues];
  }

  function find(selection, issueType) {
    return issues.find((issue) => keyOf(issue) === keyOf({ ...selection, issueType })) || null;
  }

  function upsert(issue) {
    const key = keyOf(issue);
    const index = issues.findIndex((item) => keyOf(item) === key);
    if (index >= 0) issues[index] = issue;
    else issues.push(issue);
    persist();
    return issue;
  }

  function remove(selection, issueType) {
    const key = keyOf({ ...selection, issueType });
    issues = issues.filter((issue) => keyOf(issue) !== key);
    persist();
  }

  function hasFrameIssue(animationId, frame) {
    return issues.some((issue) => issue.animationId === animationId && issue.frame === frame);
  }

  function exportPacket() {
    return {
      schema: "jkd-sprite-frame-audit/v1",
      exportedAt: new Date().toISOString(),
      runtimeSource: "BootScene.preloadPlayerSprites",
      issues: list(),
    };
  }

  return Object.freeze({ find, hasFrameIssue, list, remove, upsert, exportPacket });
})();
