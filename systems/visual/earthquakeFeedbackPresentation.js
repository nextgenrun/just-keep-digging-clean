const clamp01 = value => Math.max(0, Math.min(1, value));

const card = (title, detail, accent, progress) => ({
  title,
  detail,
  accent,
  progress: clamp01(progress),
});

function remainingRatio(source) {
  const total = source?.stateTotalMs || source?.stateRemaining || 1;
  return (source?.stateRemaining || 0) / total;
}

function escapeDetail(scene, labels) {
  const player = scene.playerController?.getPlayerTile?.();
  const nearest = scene.specialTileSystem?.getNearestPortal?.(player);
  if (!nearest || !player) return labels.escapeAction;
  const dx = nearest.tx - player.tx;
  const dy = nearest.ty - player.ty;
  const glyph = Math.abs(dx) > Math.abs(dy)
    ? (dx < 0 ? "◀" : "▶")
    : (dy < 0 ? "▲" : "▼");
  return `${labels.escapeAction}  •  ${labels.safePortal} ${glyph} ${nearest.distance}`;
}

export function resolveEarthquakeFeedbackMode({
  escapeActive,
  state,
  suppressedSourceState,
  source,
  recap,
}) {
  if (escapeActive) return "escape";
  const awarenessKnown = typeof source?.isPlayerAware === "function";
  const playerAware = awarenessKnown ? source.isPlayerAware() : true;
  if (state !== "idle" && state !== suppressedSourceState && playerAware) return state;
  return recap ? "recap" : null;
}

export function resolveEarthquakeFeedbackPresentation({
  mode,
  source,
  recap,
  escapeExpiresAt,
  now,
  scene,
  config,
}) {
  const labels = config.labels;
  const seconds = Math.max(0, (source?.stateRemaining || 0) / 1000);
  const intensity = labels.intensity[source?.intensity]
    || labels.intensity[recap?.intensity]
    || labels.intensity.minor;

  if (mode === "warning") {
    return card(
      labels.warningTitle,
      `${intensity}  •  ${labels.impactIn} ${seconds.toFixed(1)}s`,
      config.colors.warning,
      remainingRatio(source),
    );
  }
  if (mode === "earthquake") {
    return card(
      labels.quakeTitle,
      `${intensity}  •  ${String(Math.ceil(seconds)).padStart(2, "0")}s`
        + `  •  ${labels.moveClear}`,
      config.colors.danger,
      remainingRatio(source),
    );
  }
  if (mode === "aftermath") {
    const detail = source?.chainPending
      ? `${labels.aftershockWatch}  •  ${seconds.toFixed(1)}s`
      : `${labels.dustClearing}  •  ${seconds.toFixed(1)}s`;
    return card(
      labels.aftermathTitle,
      detail,
      source?.chainPending ? config.colors.warning : config.colors.calm,
      remainingRatio(source),
    );
  }
  if (mode === "escape") {
    return card(
      labels.escapeTitle,
      escapeDetail(scene, labels),
      config.colors.warning,
      (escapeExpiresAt - now) / config.timing.escapeVisibleMs,
    );
  }

  const count = recap?.passagesOpened || 0;
  const detail = recap?.aftershockWatch
    ? labels.aftershockWatch
    : count > 0
      ? `${count} ${count === 1 ? labels.passageOpened : labels.passagesOpened}`
      : labels.noPassagesOpened;
  return card(
    labels.recapTitle,
    detail,
    config.colors.cyan,
    (recap.expiresAt - now) / config.timing.recapVisibleMs,
  );
}
