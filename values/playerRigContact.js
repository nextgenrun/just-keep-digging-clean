const contactBox = (widthTiles, heightTiles) => Object.freeze({ widthTiles, heightTiles });

export const PLAYER_RIG_CONTACT_CONFIG = Object.freeze({
  enabled: true,
  visualOffsetDataKey: "visualOffset",
  manifest: Object.freeze({
    schemaVersion: 1,
    markerSpace: "packed-frame-px",
    failOpenWhenMetadataMissing: true,
  }),
  markerGroups: Object.freeze({
    hands: Object.freeze(["hand_l", "hand_r"]),
    feet: Object.freeze(["foot_l", "foot_r"]),
  }),
  directionMarkerGroups: Object.freeze({
    default: "hands",
    downward: "feet",
  }),
  alignment: Object.freeze({
    enabled: true,
    maxOffsetXTiles: 0.18,
    maxOffsetYTiles: 0.16,
    responsePerSecond: 22,
    releaseResponsePerSecond: 28,
    bootstrapDeltaMs: 16.67,
    maxDeltaMs: 50,
    releaseEpsilonPx: 0.01,
  }),
  hitbox: Object.freeze({
    faceBandThicknessTiles: 0.1,
    diagonalRequiresBothFaces: true,
    side: contactBox(0.3, 0.34),
    vertical: contactBox(0.34, 0.28),
    diagonal: contactBox(0.46, 0.42),
  }),
});
