import { DYNAMIC_EVENT_HEALTH as cfg } from "../../values/dynamicEventHealth.js";

const count = value => Math.max(0, Math.floor(Number(value) || 0));
const fill = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key]));

// Describe measured results only; counters are scoped to the encounter, never the whole session.
export function resolveDynamicEventOutcome(id, input, countersAtStart = {}) {
  const labels = cfg.results[id];
  if (!labels) return null;
  if (id === "shadow") {
    const blocks = count(input.source?.work?.blocksMined);
    return { title: labels.title, detail: fill(blocks ? blocks === 1 ? labels.one : labels.many : labels.empty, { blocks }),
      metrics: { blocksMined: blocks } };
  }
  if (id === "wurm") {
    const result = input.encounterResult;
    if (!result) return { title: labels.interruptedTitle, detail: labels.interrupted, metrics: {} };
    const passes = count(result.completedPasses), brood = count(result.offspringCount);
    return { title: labels.title,
      detail: fill(labels.detail, { passes }) + (brood ? fill(labels.brood, { brood }) : ""),
      metrics: { completedPasses: passes, offspringCount: brood, hits: count(result.huntHitCount) } };
  }
  const counters = input.source?.health || {};
  const rocks = count(counters.rocks - (countersAtStart.rocks || 0));
  const hits = count(counters.hits - (countersAtStart.hits || 0));
  return { title: labels.title,
    detail: fill(rocks ? rocks === 1 ? labels.one : labels.many : labels.empty, { rocks })
      + (rocks || hits ? fill(labels.hits, { hits }) : ""),
    metrics: { rocks, hits } };
}
