// Presentation only: purchases and Ember rewards remain owned by CampfireSystem.
export const CAMPFIRE_EVOLUTION = Object.freeze({
  consumer: "campfire-evolution",
  reducedMotionQuery: "(prefers-reduced-motion: reduce)",
  depth: 7,
  timing: Object.freeze({ gatherMs: 340, igniteMs: 460, settleMs: 440,
    holdMs: 850, exitMs: 180, reducedHoldMs: 1200 }),
  motion: Object.freeze({ gatherScale: 0.94, birthScale: 0.78,
    bloomScale: 1.07, glowScale: 1.13, glowAlpha: 0.52,
    glowTint: 0xffc46b, blendMode: "ADD", ease: "Sine.InOut" }),
  caption: Object.freeze({ width: 234, height: 52, gap: 65,
    titleY: -9, detailY: 11, titleSize: 13, detailSize: 10,
    color: "#FFE6AD", dimColor: "#D7BC8A", stroke: "#170F08",
    strokeThickness: 3, evolving: "EVOLVING", upgraded: "CAMPFIRE UPGRADED" }),
});
