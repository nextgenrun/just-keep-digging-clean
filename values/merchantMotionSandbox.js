// Review controls consume the same authored motion as the running game.
import { MERCHANT_MOTION_CONFIG } from './merchantMotion.js';
export { MERCHANT_MOTION_CAST } from './merchantMotion.js';
export const MERCHANT_MOTION_SANDBOX = Object.freeze({
  ...MERCHANT_MOTION_CONFIG,
  alphaThreshold: 40,
  maxPixelRatio: 2,
  maxDeltaSeconds: 0.1,
  cycleSeconds: 18,
  actionStagger: 1.35,
  actionStart: 2,
  previewStagger: 0.2,
  stageGroundFraction: 0.91,
  fitFraction: 0.96,
  widthFraction: 0.95,
  diagnosticsInterval: 0.25,
  loopTolerance: 0.00001,
});
