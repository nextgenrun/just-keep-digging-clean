import { MATERIAL_LIGHTING_LIVE_COMPARISON } from
  "../values/carriedLightLiveComparison.js?rev=20260815-normal-map-lighting-v1";
import { startCarriedLightLiveComparison } from
  "./2026-07-30-carried-light-live-controller.js?v=20260815-normal-map-lighting-v1";

const requested = new URLSearchParams(location.search).get("variant");
const scenario = MATERIAL_LIGHTING_LIVE_COMPARISON.scenarios.find(
  entry => entry.id === requested
) || MATERIAL_LIGHTING_LIVE_COMPARISON.scenarios[1];
const panel = document.querySelector(".runtime");
const frame = panel.querySelector("iframe");
panel.dataset.id = scenario.id;
frame.id = `${scenario.id}-frame`;
frame.title = `${scenario.label} live game capture`;

startCarriedLightLiveComparison(Object.freeze({
  ...MATERIAL_LIGHTING_LIVE_COMPARISON,
  id: `${MATERIAL_LIGHTING_LIVE_COMPARISON.id}-${scenario.id}`,
  apiGlobal: "__materialLightingLiveCapture",
  title: scenario.id === "before"
    ? "BEFORE - CURRENT UNDERGROUND RENDERING"
    : "AFTER - NORMAL-MAPPED LIGHTING V1",
  scenarios: Object.freeze([scenario]),
}));
