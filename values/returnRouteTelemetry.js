export const RETURN_ROUTE_KINDS = Object.freeze({
  PORTAL_ASCENT: "portal-ascent",
  PORTAL_DESCENT: "portal-descent",
  QUICK_RESUME: "quick-resume",
  GROUND_TO_SKY: "ground-to-sky",
  LOCAL_RECOVERY: "local-recovery",
  ABANDON: "abandon",
});

export const RETURN_ROUTE_TELEMETRY_CONFIG = Object.freeze({
  eventLimit: 24,
  maximumDepth: 100000,
  maximumCost: 1000000000000,
  maximumDistanceTiles: 100000,
  maximumCargoLossUnits: 1000000000,
});

const ROUTE_KINDS = new Set(Object.values(RETURN_ROUTE_KINDS));
const finiteInt = (value, maximum) => Math.max(
  0,
  Math.min(maximum, Math.floor(Number.isFinite(Number(value)) ? Number(value) : 0)),
);

export function createReturnRouteCounts() {
  return Object.fromEntries([...ROUTE_KINDS].map(kind => [kind, 0]));
}

export function sanitizeReturnRouteCounts(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(
    [...ROUTE_KINDS].map(kind => [kind, finiteInt(source[kind], 1000000)]),
  );
}

export function sanitizeReturnRouteEvent(value) {
  if (!value || !ROUTE_KINDS.has(value.kind)) return null;
  return Object.freeze({
    kind: value.kind,
    fromDepth: finiteInt(value.fromDepth, RETURN_ROUTE_TELEMETRY_CONFIG.maximumDepth),
    toDepth: finiteInt(value.toDepth, RETURN_ROUTE_TELEMETRY_CONFIG.maximumDepth),
    cost: finiteInt(value.cost, RETURN_ROUTE_TELEMETRY_CONFIG.maximumCost),
    distanceTiles: finiteInt(
      value.distanceTiles,
      RETURN_ROUTE_TELEMETRY_CONFIG.maximumDistanceTiles,
    ),
    cargoLossUnits: finiteInt(
      value.cargoLossUnits,
      RETURN_ROUTE_TELEMETRY_CONFIG.maximumCargoLossUnits,
    ),
    atActiveMs: finiteInt(value.atActiveMs, 86400000),
  });
}

export function sanitizeReturnRouteEvents(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(sanitizeReturnRouteEvent)
    .filter(Boolean)
    .slice(-RETURN_ROUTE_TELEMETRY_CONFIG.eventLimit);
}
