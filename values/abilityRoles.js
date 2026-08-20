export const ABILITY_ROLE_DECISIONS = Object.freeze({
  flight: Object.freeze({
    disposition: "keep",
    verb: "recover-route",
    tacticalProblem: "escape a local shaft or preserve a return route",
    metric: "recovery distance per GP",
  }),
  quickslash: Object.freeze({
    disposition: "keep-bobo-unlock",
    verb: "burst-horizontal",
    tacticalProblem: "break or cross a side obstruction without stopping momentum",
    metric: "horizontal value and hits per GP",
  }),
  thunderStrike: Object.freeze({
    disposition: "keep-chain-role",
    verb: "commit-vertical-chain",
    tacticalProblem: "open a deep vertical lane through several targets",
    metric: "vertical tiles and damage per paid first slam",
  }),
  heavyPunch: Object.freeze({
    disposition: "keep-passive-specialist",
    verb: "pierce-behind-target",
    tacticalProblem: "damage the protected tile behind the current target",
    metric: "useful second-tile contacts per trigger",
  }),
  debrisShield: Object.freeze({
    disposition: "keep-hazard-defense",
    verb: "hold-protect",
    tacticalProblem: "trade GP for protection during falling-debris telegraphs",
    metric: "prevented hazard damage per GP",
  }),
});

export function getAbilityRoleHealth() {
  const entries = Object.entries(ABILITY_ROLE_DECISIONS);
  const verbs = entries.map(([, role]) => role.verb);
  return Object.freeze({
    ready: entries.every(([, role]) => (
      role.disposition && role.verb && role.tacticalProblem && role.metric
    )) && new Set(verbs).size === verbs.length,
    abilityCount: entries.length,
    uniqueVerbCount: new Set(verbs).size,
  });
}
