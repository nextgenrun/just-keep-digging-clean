export function buildTitanDiscoverySnapshot(owner) {
  const surface = owner.surfaceGallery.getSnapshot();
  const chambers = owner.chamberStream.getSnapshot();
  const environment = owner.environmentStream.getSnapshot();
  return {
    total: owner.config.definitions.length,
    discovered: surface.discovered,
    encounterMode: owner.encounterMode,
    grounding: {
      ready: owner.groundingReady,
      assetVersion: owner.config.underground.assetVersion,
      assets: [
        owner.config.assets.undergroundDais.key,
        owner.config.assets.groundContact.key,
        owner.config.assets.unlockResonance.key,
      ],
      missingAssets: [...owner.groundingMissingAssets],
    },
    guidance: owner.guidance.getSnapshot(),
    coverGlow: owner.coverGlow.getSnapshot(),
    surface,
    chambers,
    environment,
    zones: owner.zoneViews.map(view => ({
      id: view.definition.id,
      regionId: view.definition.regionId,
      left: view.zone.left,
      top: view.zone.top,
      width: view.zone.rightExclusive - view.zone.left,
      height: view.zone.bottomExclusive - view.zone.top,
      tracked: view.zone.cells.length,
      zoneRemaining: view.zoneRemaining,
      coverageTotal: view.coverageTotal,
      coverageRequired: view.coverageRequired,
      coverageRemaining: view.coverageRemaining,
      coverageCleared: view.coverageCleared,
      coverageProgress: view.coverageProgress,
      coverageValid: view.coverageValid,
      remaining: view.remaining,
      revealed: view.revealed,
      progress: view.progress,
      ready: view.ready,
      discovered: view.discovered,
      visualMode: view.visualMode,
      environmentLayers: view.environmentLayers.length,
    })),
  };
}
