export const SCENE_BASE_PHASES = Object.freeze({
  LOADING: "loading",
  ACTIVE: "active",
  DEAD: "dead",
  TRANSITIONING: "transitioning",
  SAFE_PAUSED: "safe-paused",
});

export const SCENE_SUSPENSION_KINDS = Object.freeze({
  PAUSE: "pause",
  DIALOG: "dialog",
  SHOP: "shop",
  DEPTH_WARNING: "depth-warning",
  HARDCORE_MODAL: "hardcore-modal",
});

export const FRAME_PHASES = Object.freeze([
  "input",
  "simulation",
  "world",
  "presentation",
  "camera",
  "telemetry",
]);

export const FRAME_CRITICALITIES = Object.freeze({
  PRESENTATION: "presentation",
  SIMULATION: "simulation",
  PROGRESSION: "progression",
  PERSISTENCE: "persistence",
});

export const LEGACY_GAME_STATE_BY_PHASE = Object.freeze({
  [SCENE_BASE_PHASES.LOADING]: "title",
  [SCENE_BASE_PHASES.ACTIVE]: "playing",
  [SCENE_BASE_PHASES.DEAD]: "dead",
  [SCENE_BASE_PHASES.TRANSITIONING]: "transitioning",
  [SCENE_BASE_PHASES.SAFE_PAUSED]: "safe-paused",
});

export const LEGACY_GAME_STATE_BY_SUSPENSION = Object.freeze({
  [SCENE_SUSPENSION_KINDS.PAUSE]: "paused",
  [SCENE_SUSPENSION_KINDS.DIALOG]: "dialog",
  // Shop-like surfaces historically leave gameState as "playing" while
  // disabling controls. Keep that read contract during the token migration.
  [SCENE_SUSPENSION_KINDS.SHOP]: "playing",
  [SCENE_SUSPENSION_KINDS.DEPTH_WARNING]: "depth-warning",
  [SCENE_SUSPENSION_KINDS.HARDCORE_MODAL]: "hardcore-modal",
});

export const LEGACY_PHASE_BY_GAME_STATE = Object.freeze({
  title: SCENE_BASE_PHASES.LOADING,
  playing: SCENE_BASE_PHASES.ACTIVE,
  dead: SCENE_BASE_PHASES.DEAD,
  transitioning: SCENE_BASE_PHASES.TRANSITIONING,
  "safe-paused": SCENE_BASE_PHASES.SAFE_PAUSED,
});

export const LEGACY_SUSPENSION_BY_GAME_STATE = Object.freeze({
  paused: SCENE_SUSPENSION_KINDS.PAUSE,
  dialog: SCENE_SUSPENSION_KINDS.DIALOG,
  "depth-warning": SCENE_SUSPENSION_KINDS.DEPTH_WARNING,
  "hardcore-modal": SCENE_SUSPENSION_KINDS.HARDCORE_MODAL,
});
