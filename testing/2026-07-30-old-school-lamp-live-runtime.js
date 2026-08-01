import { OLD_SCHOOL_LAMP_LIVE_COMPARISON } from
  "../values/carriedLightLiveComparison.js";
import { createCarriedLightLiveRuntime } from
  "./2026-07-30-carried-light-live-runtime.js";

export function createOldSchoolLampLiveRuntime(frameEntries) {
  return createCarriedLightLiveRuntime(
    frameEntries,
    OLD_SCHOOL_LAMP_LIVE_COMPARISON
  );
}
