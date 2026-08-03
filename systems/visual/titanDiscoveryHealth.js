export function publishTitanDiscoveryHealth(owner, enabled) {
  const { config } = owner;
  const snapshot = owner.getSnapshot();
  const invalidCoverage = snapshot.zones
    .filter(zone => !zone.coverageValid)
    .map(zone => zone.id);
  const expectedEnvironmentLayers = snapshot.total
    * config.environmentEnvelope.layers.length;
  const environmentComplete = !snapshot.environment.enabled || (
    snapshot.environment.ready
    && snapshot.environment.registered === snapshot.total
    && snapshot.environment.mappedLayers === expectedEnvironmentLayers
  );
  const complete = snapshot.zones.length === snapshot.total
    && snapshot.grounding.ready
    && snapshot.surface.ready
    && snapshot.chambers.ready
    && snapshot.chambers.registered === snapshot.total
    && environmentComplete
    && snapshot.coverGlow.created
    && invalidCoverage.length === 0;
  const status = !enabled ? "disabled" : complete ? "healthy" : "degraded";
  const health = { status, enabled, ...snapshot };
  globalThis[config.health.globalKey] = health;

  if (status === "healthy" && !owner.healthReadyReported) {
    owner.healthReadyReported = true;
    globalThis.__jkdHealth?.markLifecycle?.(
      config.health.readyStage,
      {
        zones: snapshot.zones.length,
        creatureFootprints: snapshot.zones.filter(
          zone => zone.coverageValid
        ).length,
        surfaceSlots: snapshot.surface.slots,
        chamberCards: snapshot.chambers.registered,
        environmentLayers: snapshot.environment.mappedLayers,
      }
    );
  } else if (status === "degraded" && !owner.healthFailureReported) {
    owner.healthFailureReported = true;
    const missing = [
      ...snapshot.grounding.missingAssets,
      ...snapshot.surface.missingAssets,
      ...snapshot.chambers.failedAssets,
      ...snapshot.environment.failedAssets,
      ...snapshot.environment.missingMappings,
      ...(snapshot.coverGlow.created
        ? []
        : [config.assets.coverResonance.key]),
    ];
    const code = snapshot.environment.failedAssets.length
      || snapshot.environment.missingMappings.length
      ? config.health.environmentAssetCode
      : snapshot.chambers.failedAssets.length
        ? config.health.chamberAssetCode
        : missing.length
          ? config.health.missingAssetCode
          : config.health.incompleteRuntimeCode;
    globalThis.__jkdHealth?.captureSystemFinding?.({
      key: code,
      code,
      severity: config.health.severity,
      message: invalidCoverage.length
        ? `Titan creature footprints invalid: ${invalidCoverage.join(", ")}`
        : missing.length
          ? `Titan discovery assets missing: ${missing.join(", ")}`
          : (
            "Titan discovery runtime incomplete: "
            + `${snapshot.zones.length}/${snapshot.total} zones`
          ),
      context: health,
    });
  }
  return health;
}
