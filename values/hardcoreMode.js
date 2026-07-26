export const HARDCORE_MODE_CONFIG = Object.freeze({
  version: 1,
  modes: Object.freeze({
    casual: "casual",
    hardcore: "hardcore",
  }),
  defaultData: Object.freeze({
    mode: "casual",
    armed: false,
  }),
});

export function sanitizeHardcoreModeData(data) {
  const requestedHardcore = data?.mode === HARDCORE_MODE_CONFIG.modes.hardcore
    || data?.armed === true;
  const mode = requestedHardcore
    ? HARDCORE_MODE_CONFIG.modes.hardcore
    : HARDCORE_MODE_CONFIG.modes.casual;
  return {
    version: HARDCORE_MODE_CONFIG.version,
    mode,
    armed: mode === HARDCORE_MODE_CONFIG.modes.hardcore && data?.armed === true,
  };
}

export function isHardcoreModeArmed(data) {
  const normalized = sanitizeHardcoreModeData(data);
  return normalized.mode === HARDCORE_MODE_CONFIG.modes.hardcore
    && normalized.armed === true;
}
