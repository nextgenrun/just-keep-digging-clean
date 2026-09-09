import { TILE_DESTRUCTION_FX_CONFIG } from "./tileDestructionFx.js";

// The roll is per Signal, never per depth or per approach.
export const SIGNAL_TRAP = Object.freeze({
  chance: 0.10, salt: 61871, survivorId: "bram",
  triggerDistance: 2.2, radius: 2.6, fuseMs: 1800, retryMs: 1200,
  phases: Object.freeze(["dormant", "fuse", "spent"]), deathSource: "signalExplosion",
  rewardStars: 750,
  art: Object.freeze({
    asset: TILE_DESTRUCTION_FX_CONFIG.assets.core,
    row: TILE_DESTRUCTION_FX_CONFIG.families.ember, depth: 906,
    fuseWidth: 40, fuseHeight: 33, packOffsetX: 19, packOffsetY: -48,
    fuseAlpha: 0.65, fuseAlphaGain: 0.35, tint: 0xffaa62,
    burstWidthTiles: 5.2, burstHeightTiles: 4.2, burstY: -0.25, burstOriginY: 0.65,
    frameMs: 100, fadeMs: 450, reducedMotionAlpha: 0.6,
    reducedMotionQuery: "(prefers-reduced-motion: reduce)",
  }),
  sound: Object.freeze({ fuse: "libTorchReact", blast: "starDestruction",
    fuseGain: 2, blastGain: 2.4, group: "signal-trap" }),
  copy: Object.freeze({
    tell: "[His pack hisses. An ember burns inside.]",
    tellLabel: "SIGNAL · HISSING PACK",
    explosion: "[The survivor's pack explodes.]",
    escaped: stars => `THE VOICE IS GONE · +${stars} STARPOWER\nYou escaped the blast. Solid rock can stop it, too.`,
    failed: "The Signal exploded. Your pack and GP are gone.",
    retry: "Resolving the Signal…",
  }),
});

export const SIGNAL_REWARDS = Object.freeze({
  giftStars: 250, generousStars: 2000, attackStars: 1000,
  giftCargoShare: 0.25, giftMinimumValue: 100, giftValuePerDepth: 2,
  copy: Object.freeze({
    gift: stars => `Your kindness is remembered.\n+${stars} STARPOWER`,
    generous: stars => `A LIGHT LEFT ON\n+${stars} STARPOWER · GP FULLY RESTORED`,
    giftHint: "A substantial gift returns 2,000 Starpower and fills GP.",
    giftRequirement: value => `GIFT VALUE ${value.toLocaleString()}M OR MORE: 2,000 STARPOWER + FULL GP`,
  }),
});
