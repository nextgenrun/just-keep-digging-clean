import { MERCHANT_IDLE_PERSONALITY as C } from '../../../values/merchantIdlePersonalitySandbox.js';

const ease = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

export function sampleActivity(time, index, mode = 'natural', cue = null) {
  let elapsed, activity;
  if (cue && time >= cue.at && time < cue.at + C.actionSeconds) {
    elapsed = time - cue.at;
    activity = cue.activity;
  } else {
    if (mode === 'idle') return { activity: null, actionTime: -1, mix: 0 };
    const since = time - C.firstActivity - index * (mode === 'natural' ? C.naturalStagger : C.previewStagger);
    if (since < 0) return { activity: null, actionTime: -1, mix: 0 };
    const cycle = Math.floor(since / C.cycleSeconds);
    elapsed = since - cycle * C.cycleSeconds;
    activity = mode === 'natural' ? C.activities[(cycle + index) % C.activities.length].id : mode;
  }
  if (elapsed >= C.actionSeconds) return { activity: null, actionTime: -1, mix: 0 };
  const mix = ease((elapsed - C.fadeInStart) / C.fadeInSeconds) * (1 - ease((elapsed - C.fadeOutStart) / C.fadeOutSeconds));
  return { activity, actionTime: elapsed, mix };
}
