const card = (title, detail, accent) => ({
  title,
  detail,
  accent,
});

function escapeDetail(scene, labels) {
  const player = scene.playerController?.getPlayerTile?.();
  const nearest = scene.specialTileSystem?.getNearestPortal?.(player);
  if (!nearest || !player) return labels.escapeAction;
  const dx = nearest.tx - player.tx;
  const dy = nearest.ty - player.ty;
  const glyph = Math.abs(dx) > Math.abs(dy)
    ? (dx < 0 ? "◀" : "▶")
    : (dy < 0 ? "▲" : "▼");
  return `${labels.escapeAction}  •  ${labels.safePortal} ${glyph}${nearest.distance}`;
}

export function resolveEarthquakeFeedbackMode({
  escapeActive,
  state,
  suppressedSourceState,
  source,
}) {
  if (escapeActive) return "escape";
  const awarenessKnown = typeof source?.isPlayerAware === "function";
  const playerAware = awarenessKnown ? source.isPlayerAware() : true;
  if (state !== "idle" && state !== suppressedSourceState && playerAware) return state;
  return null;
}

export function resolveEarthquakeFeedbackPresentation({
  mode,
  source,
  escapeExpiresAt,
  now,
  scene,
  config,
}) {
  const labels = config.labels;
  const seconds = Math.max(0, (source?.stateRemaining || 0) / 1000);
  const intensity = labels.intensity[source?.intensity] || labels.intensity.minor;

  if (mode === "warning") {
    return card(
      labels.warningTitle,
      `${intensity}  •  ${seconds.toFixed(1)}s`,
      config.colors.warning,
    );
  }
  if (mode === "earthquake") {
    return card(
      labels.quakeTitle,
      `${intensity}  •  ${Math.ceil(seconds)}s`,
      config.colors.danger,
    );
  }
  if (mode === "aftermath") {
    const detail = source?.chainPending
      ? labels.aftershockWatch
      : `${seconds.toFixed(1)}s`;
    return card(
      labels.aftermathTitle,
      detail,
      source?.chainPending ? config.colors.warning : config.colors.calm,
    );
  }
  if (mode === "escape") {
    return card(
      labels.escapeTitle,
      escapeDetail(scene, labels),
      config.colors.warning,
    );
  }
  return null;
}
