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
  aftershockActive,
  state,
  suppressedSourceState,
  source,
}) {
  if (escapeActive) return "escape";
  const awarenessKnown = typeof source?.isPlayerAware === "function";
  const playerAware = awarenessKnown ? source.isPlayerAware() : true;
  if (aftershockActive && playerAware) return "aftershock";
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
      `${labels.warningAction}  •  ${intensity}  •  ${seconds.toFixed(1)}s`,
      config.colors.warning,
    );
  }
  if (mode === "earthquake") {
    return card(
      labels.quakeTitle,
      `${labels.movementAction}  •  ${Math.ceil(seconds)}s`,
      config.colors.danger,
    );
  }
  if (mode === "aftermath") {
    const chainSeconds = Math.max(0, (source?.chainTimer || 0) / 1000);
    const detail = source?.chainPending
      ? `${labels.aftershockWatch}  •  ${Math.ceil(chainSeconds)}s`
      : (source?.caveIns?.length || source?.fallingRocks?.length)
        ? labels.pendingRocks
        : `${seconds.toFixed(1)}s`;
    return card(
      labels.aftermathTitle,
      detail,
      source?.chainPending ? config.colors.warning : config.colors.calm,
    );
  }
  if (mode === "aftershock") {
    return card(
      labels.aftershock,
      labels.aftershockAction,
      config.colors.danger,
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
