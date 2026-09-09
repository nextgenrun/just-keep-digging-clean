import { NATURAL_FIRE_LIVE_COMPARISON } from "./carriedLightLiveComparison.js";

const base = NATURAL_FIRE_LIVE_COMPARISON;
const query = Object.freeze({
  ...base.scenarios[0].query,
  cinematics: "0",
  renderRevision: "20260904-cave-composition-v1",
});

export const CAVE_VISUAL_COMPOSITION_REVIEW = Object.freeze({
  ...base,
  id: "cave-composition-review-20260904",
  apiGlobal: "__caveCompositionReview",
  logLabel: "CaveCompositionReview",
  title: "Cave composition",
  subtitle: "Existing artwork · real gameplay · GP replenished for comparison · save writes disabled",
  defaultDepthProfile: "entry",
  world: Object.freeze({
    ...base.world,
    identity: "cave-composition-review-20260904",
    startDepthOffsetTiles: 18,
    captureGallery: true,
    captureGalleryHalfWidth: 14,
  }),
  scenarios: Object.freeze([
    Object.freeze({
      id: "natural", saveSlot: 901, label: "Before",
      detail: "Previous cave composition",
      query: Object.freeze({ ...query, caveComposition: "0" }),
    }),
    Object.freeze({
      id: "legacy", saveSlot: 902, label: "Updated",
      detail: "Cave depth and grounded character presentation",
      query: Object.freeze({ ...query, caveComposition: "1" }),
    }),
  ]),
  review: Object.freeze({
    telemetryMs: 500,
    inputHoldMs: 1800,
    inputs: Object.freeze({
      mine: Object.freeze([{ code: "KeyS", key: "s", keyCode: 83 }, { code: "KeyF", key: "f", keyCode: 70 }]),
      right: Object.freeze([{ code: "KeyD", key: "d", keyCode: 68 }]),
      left: Object.freeze([{ code: "KeyA", key: "a", keyCode: 65 }]),
    }),
  }),
});
