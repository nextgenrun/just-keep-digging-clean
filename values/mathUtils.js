/**
 * Small pure math helpers shared by runtime systems.
 */

export const clamp01 = (value) => Math.max(0, Math.min(1, value));
export const clamp01Finite = (value) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
export const lerp = (a, b, t) => a + (b - a) * t;
