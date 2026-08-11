export const HARDCORE_MODE_CONFIG = Object.freeze({
  version: 2,
  queryParam: "runMode",
  modes: Object.freeze({
    casual: "casual",
    hardcore: "hardcore",
    oneLifeHardcore: "one-life-hardcore",
  }),
  rules: Object.freeze({
    casual: Object.freeze({ startingLives: null, firstReviveFree: false }),
    hardcore: Object.freeze({ startingLives: 2, firstReviveFree: true }),
    "one-life-hardcore": Object.freeze({ startingLives: 1, firstReviveFree: false }),
  }),
  defaultData: Object.freeze({
    mode: "casual",
    armed: false,
    livesRemaining: null,
    freeReviveAvailable: false,
    deaths: 0,
    exhausted: false,
  }),
});

function resolveRequestedMode(data) {
  if (data?.mode === HARDCORE_MODE_CONFIG.modes.oneLifeHardcore) {
    return HARDCORE_MODE_CONFIG.modes.oneLifeHardcore;
  }
  if (
    data?.mode === HARDCORE_MODE_CONFIG.modes.hardcore
    || data?.armed === true
  ) {
    return HARDCORE_MODE_CONFIG.modes.hardcore;
  }
  return HARDCORE_MODE_CONFIG.modes.casual;
}

export function createHardcoreModeData(mode = HARDCORE_MODE_CONFIG.modes.casual) {
  const normalizedMode = resolveRequestedMode({ mode });
  const rules = HARDCORE_MODE_CONFIG.rules[normalizedMode];
  return {
    version: HARDCORE_MODE_CONFIG.version,
    mode: normalizedMode,
    armed: normalizedMode !== HARDCORE_MODE_CONFIG.modes.casual,
    livesRemaining: rules.startingLives,
    freeReviveAvailable: rules.firstReviveFree,
    deaths: 0,
    exhausted: false,
  };
}

export function resolveHardcoreModeFromSearch(
  search = globalThis.location?.search || "",
) {
  const value = new URLSearchParams(search)
    .get(HARDCORE_MODE_CONFIG.queryParam)
    ?.trim()
    .toLowerCase();
  if (value === HARDCORE_MODE_CONFIG.modes.oneLifeHardcore) {
    return HARDCORE_MODE_CONFIG.modes.oneLifeHardcore;
  }
  if (value === HARDCORE_MODE_CONFIG.modes.hardcore) {
    return HARDCORE_MODE_CONFIG.modes.hardcore;
  }
  if (value === HARDCORE_MODE_CONFIG.modes.casual) {
    return HARDCORE_MODE_CONFIG.modes.casual;
  }
  return null;
}

export function sanitizeHardcoreModeData(data) {
  const mode = resolveRequestedMode(data);
  const rules = HARDCORE_MODE_CONFIG.rules[mode];
  const isRiskMode = mode !== HARDCORE_MODE_CONFIG.modes.casual;
  const requestedExhausted = isRiskMode && data?.exhausted === true;
  const rawLives = Number.isFinite(data?.livesRemaining)
    ? Math.floor(data.livesRemaining)
    : rules.startingLives;
  const livesRemaining = isRiskMode
    ? (requestedExhausted
      ? 0
      : Math.max(0, Math.min(rules.startingLives, rawLives)))
    : null;
  const exhausted = isRiskMode && livesRemaining <= 0;
  return {
    version: HARDCORE_MODE_CONFIG.version,
    mode,
    armed: isRiskMode && data?.armed !== false && !exhausted,
    livesRemaining,
    freeReviveAvailable: mode === HARDCORE_MODE_CONFIG.modes.hardcore
      && !exhausted
      && data?.freeReviveAvailable !== false,
    deaths: Math.max(0, Math.floor(Number(data?.deaths) || 0)),
    exhausted,
  };
}

export function isHardcoreModeArmed(data) {
  const normalized = sanitizeHardcoreModeData(data);
  return normalized.mode !== HARDCORE_MODE_CONFIG.modes.casual
    && normalized.armed === true
    && normalized.exhausted !== true;
}

export function consumeHardcoreDeath(data) {
  const current = sanitizeHardcoreModeData(data);
  if (current.mode === HARDCORE_MODE_CONFIG.modes.casual) {
    return { data: current, outcome: "casual", livesRemaining: null };
  }
  if (current.exhausted) {
    return { data: current, outcome: "exhausted", livesRemaining: 0 };
  }

  if (current.freeReviveAvailable) {
    const next = sanitizeHardcoreModeData({
      ...current,
      freeReviveAvailable: false,
      deaths: current.deaths + 1,
    });
    return {
      data: next,
      outcome: "free-revive",
      livesRemaining: next.livesRemaining,
    };
  }

  const next = sanitizeHardcoreModeData({
    ...current,
    livesRemaining: Math.max(0, current.livesRemaining - 1),
    deaths: current.deaths + 1,
  });
  return {
    data: next,
    outcome: next.exhausted ? "exhausted" : "life-lost",
    livesRemaining: next.livesRemaining,
  };
}

export function getHardcoreModeLabel(data) {
  const mode = sanitizeHardcoreModeData(data).mode;
  if (mode === HARDCORE_MODE_CONFIG.modes.oneLifeHardcore) return "ONE-LIFE HARDCORE";
  if (mode === HARDCORE_MODE_CONFIG.modes.hardcore) return "HARDCORE";
  return "CASUAL";
}
