const range = (count) => Object.freeze(Array.from({ length: count }, (_, index) => index));
const disabledValues = Object.freeze(["0", "off", "false"]);

const variant = ({ id, frames, frameRate, repeat, sourceClip }) => Object.freeze({
  id,
  sheetProperty: `heldTorch${id[0].toUpperCase()}${id.slice(1)}Sheet`,
  framesProperty: `heldTorch${id[0].toUpperCase()}${id.slice(1)}Frames`,
  animationKey: `survival-held-torch-v1-${id}-anim`,
  sheetKey: `survival-held-torch-v1-${id}-sheet`,
  fileName: `2026-08-25-survival-held-torch-v1-${id}-sheet.webp`,
  frames: range(frames),
  frameRate,
  repeat,
  displaySizePx: 101,
  sourceClip,
});

const variants = Object.freeze({
  idle: variant({
    id: "idle",
    frames: 48,
    frameRate: 12,
    repeat: -1,
    sourceClip: "Blender DG_HELD_TORCH_MIXAMO_V1",
  }),
  walkStart: variant({
    id: "walkStart",
    frames: 16,
    frameRate: 24,
    repeat: 0,
    sourceClip: "Mixamo Start Walking with Blender weapon_r torch hold",
  }),
  walkLoop: variant({
    id: "walkLoop",
    frames: 24,
    frameRate: 24,
    repeat: -1,
    sourceClip: "Mixamo Standard Walk with Blender weapon_r torch hold",
  }),
  walkStop: variant({
    id: "walkStop",
    frames: 16,
    frameRate: 24,
    repeat: 0,
    sourceClip: "Mixamo Stop Walking with Blender weapon_r torch hold",
  }),
  airborne: variant({
    id: "airborne",
    frames: 41,
    frameRate: 16,
    repeat: 0,
    sourceClip: "UAL Jump Start with Blender weapon_r torch hold",
  }),
  falling: variant({
    id: "falling",
    frames: 75,
    frameRate: 16,
    repeat: -1,
    sourceClip: "UAL Jump Loop with Blender weapon_r torch hold",
  }),
  flight: variant({
    id: "flight",
    frames: 48,
    frameRate: 24,
    repeat: -1,
    sourceClip: "Mixamo Flying Idle with Blender weapon_r torch hold",
  }),
  hardLanding: variant({
    id: "hardLanding",
    frames: 24,
    frameRate: 24,
    repeat: 0,
    sourceClip: "Mixamo Jumping Down From Higher Level with Blender weapon_r torch hold",
  }),
  crouchEnter: variant({
    id: "crouchEnter",
    frames: 18,
    frameRate: 24,
    repeat: 0,
    sourceClip: "Mixamo Standing Idle To Crouch with Blender weapon_r torch hold",
  }),
  crouch: variant({
    id: "crouch",
    frames: 28,
    frameRate: 24,
    repeat: -1,
    sourceClip: "Mixamo Crouch Idle with Blender weapon_r torch hold",
  }),
  crouchExit: variant({
    id: "crouchExit",
    frames: 18,
    frameRate: 24,
    repeat: 0,
    sourceClip: "Mixamo Crouch To Standing Idle with Blender weapon_r torch hold",
  }),
});

export const SURVIVAL_HELD_TORCH_RUNTIME = Object.freeze({
  version: "survival-held-torch-runtime-v1-20260827",
  enabledByDefault: true,
  rollback: Object.freeze({
    queryParam: "heldTorch3d",
    disabledValues,
  }),
  runtimeRoot: "sprites/character/survival-character-unified-v1/runtime",
  frameSizePx: 256,
  variants,
});

export function resolveSurvivalHeldTorchRuntimeEnabled(search = null) {
  const query = search ?? (typeof window !== "undefined" ? window.location.search : "");
  const value = new URLSearchParams(query)
    .get(SURVIVAL_HELD_TORCH_RUNTIME.rollback.queryParam)
    ?.trim()
    .toLowerCase();
  return SURVIVAL_HELD_TORCH_RUNTIME.enabledByDefault
    && (!value || !disabledValues.includes(value));
}
