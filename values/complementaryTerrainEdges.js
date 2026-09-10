// Complementary boundary art only: never replaces core tiles or backgrounds.
const asset = id => Object.freeze({ key: `terrain-edge-v1-${id}`, path: `sprites/environment/complementary-terrain-edges-v1/${id}.png` });
export const COMPLEMENTARY_EDGE_ART = Object.freeze(Object.fromEntries([
  "stone-rim", "soil-rim", "stone-corner", "soil-corner", "crevice-shadow",
].map(id => [id, asset(id)])));
export const COMPLEMENTARY_EDGES = Object.freeze({
  enabled: true, queryParam: "complementaryEdges", variants: 4,
  maxEdges: 256, maxCorners: 96, maxShadows: 192,
  thicknessTiles: 0.13, cornerSizeTiles: 0.34, cornerDepth: 2.47,
  shadowThicknessTiles: 0.16, shadowAlpha: 0.5, shadowDepth: 2.455,
  corners: Object.freeze([
    { a: 3, b: 0, x: 0, y: 0, angle: 0 },
    { a: 0, b: 1, x: 1, y: 0, angle: 90 },
    { a: 1, b: 2, x: 1, y: 1, angle: 180 },
    { a: 2, b: 3, x: 0, y: 1, angle: 270 },
  ]),
});
export function complementaryEdgesEnabled(search = globalThis.location?.search || "") {
  return COMPLEMENTARY_EDGES.enabled && !["0", "off", "false"].includes(new URLSearchParams(search).get(COMPLEMENTARY_EDGES.queryParam));
}
