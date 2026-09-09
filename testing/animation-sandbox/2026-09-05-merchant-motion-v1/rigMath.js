import { MERCHANT_MOTION_SANDBOX as C } from '../../../values/merchantMotionSandbox.js';
import { modulo } from '../../../systems/visual/merchantMotionMath.js';
export * from '../../../systems/visual/merchantMotionMath.js';

export function actionAt(time, index, mode) {
  if (mode === 'idle') return -1;
  const start = mode === 'gestures' ? index * C.previewStagger : C.actionStart + index * C.actionStagger;
  const value = modulo(time - start, C.cycleSeconds);
  return value <= C.actionDuration ? value : -1;
}
