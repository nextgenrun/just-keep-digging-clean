export function publishTitanDiscoveryHealth(owner, enabled) {
  const { config } = owner;
  const snapshot = owner.getSnapshot();
  const complete = snapshot.zones.length === snapshot.total
    && snapshot.surface.ready
    && snapshot.chambers.ready
    && snapshot.chambers.registered === snapshot.total;
  const status = !enabled ? "disabled" : complete ? "healthy" : "degraded";
  const health = { status, enabled, ...snapshot };
  globalThis[config.health.globalKey] = health;

  if (status === "healthy" && !owner.healthReadyReported) {
    owner.healthReadyReported = true;
    globalThis.__jkdHealth?.markLifecycle?.(
      config.health.readyStage,
      {
        zones: snapshot.zones.length,
        surfaceSlots: snapshot.surface.slots,
        chamberCards: snapshot.chambers.registered,
      }
    );
  } else if (status === "degraded" && !owner.healthFailureReported) {
    owner.healthFailureReported = true;
    const missing = [
      ...snapshot.surface.missingAssets,
      ...snapshot.chambers.failedAssets,
    ];
    const code = snapshot.chambers.failedAssets.length
      ? config.health.chamberAssetCode
      : missing.length
        ? config.health.missingAssetCode
        : config.health.incompleteRuntimeCode;
    globalThis.__jkdHealth?.captureSystemFinding?.({
      key: code,
      code,
      severity: config.health.severity,
      message: missing.length
        ? `Titan discovery assets missing: ${missing.join(", ")}`
        : `Titan discovery runtime incomplete: ${snapshot.zones.length}/${snapshot.total} zones`,
      context: health,
    });
  }
  return health;
}
