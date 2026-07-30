import {
  HEAVENBLOCK_OMEGA_VAULT_IDS,
  HEAVENBLOCK_PART_IDS,
  HEAVENBLOCK_REGION_IDS,
} from "./heavenblocksProgressionConfig.js";
import { HEAVENBLOCKS_WORLD_CONFIG } from "./heavenblocksWorldConfig.js";

const deepFreeze = (value) => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
};

const WORLD_REGION_BY_ID = new Map(
  HEAVENBLOCKS_WORLD_CONFIG.regions.map((entry) => [entry.id, entry]),
);

function accessRegion({
  id,
  label,
  color,
  partId,
  partLabel,
  vaultId,
  componentAssetKey,
}) {
  const worldRegion = WORLD_REGION_BY_ID.get(id);
  if (!worldRegion) {
    throw new Error(`Missing native Heavenblocks world region: ${id}`);
  }
  return {
    id,
    label,
    color,
    levelId: worldRegion.levelId,
    bounds: worldRegion.bounds,
    platform: {
      leftTx: worldRegion.bounds.left,
      rightTxExclusive: worldRegion.bounds.right + 1,
      floorTy: worldRegion.shrine.floorTy,
    },
    arrival: worldRegion.arrivalTile,
    returnAltar: {
      tx: worldRegion.arrivalTile.tx + 3,
      ty: worldRegion.arrivalTile.ty,
    },
    rewardShrine: {
      tx: worldRegion.shrine.tx,
      ty: worldRegion.shrine.floorTy - 1,
    },
    relicCache: worldRegion.relicCache,
    barrier: worldRegion.barrier,
    partId,
    partLabel,
    vaultId,
    componentAssetKey,
  };
}

export const HEAVENBLOCKS_ACCESS_CONFIG = deepFreeze({
  enabled: true,
  queryParam: "heavenblocksGameplay",
  requiredRelics: 3,
  interactionRadiusTiles: 1.35,
  surfaceReturn: { tx: 123, ty: 64 },
  regionGuard: {
    repelCooldownMs: 800,
    statusDurationMs: 1900,
    blockedDamageReason: "heavenblock-region-locked",
    safetyAnchorDamageReason: "heavenblock-safety-anchor",
  },
  surfaceGates: [
    {
      regionId: HEAVENBLOCK_REGION_IDS.LOWER_SKY,
      tx: 119,
      ty: 64,
      label: "Cloud Reef",
      color: 0x79ddff,
      altarAssetId: "cloudReef",
      altarBaselineOffsetTiles: 0.86,
      relicGate: true,
    },
    {
      regionId: HEAVENBLOCK_REGION_IDS.ANGEL,
      tx: 126,
      ty: 64,
      label: "Angel Heavenblock",
      color: 0xffe9a6,
      altarAssetId: "angelHeavenblock",
      altarBaselineOffsetTiles: 0.69,
    },
    {
      regionId: HEAVENBLOCK_REGION_IDS.DEVIL,
      tx: 133,
      ty: 64,
      label: "Devil Eclipse",
      color: 0xd96aff,
      altarAssetId: "devilEclipse",
      altarBaselineOffsetTiles: 0.63,
    },
  ],
  regions: [
    accessRegion({
      id: HEAVENBLOCK_REGION_IDS.LOWER_SKY,
      label: "Lower Sky Cloud Reef",
      color: 0x79ddff,
      partId: HEAVENBLOCK_PART_IDS.AETHER_TURBINE,
      partLabel: "Aether Turbine",
      vaultId: HEAVENBLOCK_OMEGA_VAULT_IDS.LOWER_SKY,
      componentAssetKey: "heavenblocks-aether-turbine-v1",
    }),
    accessRegion({
      id: HEAVENBLOCK_REGION_IDS.ANGEL,
      label: "Angel Heavenblock",
      color: 0xffe9a6,
      partId: HEAVENBLOCK_PART_IDS.HALO_REGULATOR,
      partLabel: "Halo Regulator",
      vaultId: HEAVENBLOCK_OMEGA_VAULT_IDS.ANGEL,
      componentAssetKey: "heavenblocks-halo-regulator-v1",
    }),
    accessRegion({
      id: HEAVENBLOCK_REGION_IDS.DEVIL,
      label: "Devil Eclipse Scar",
      color: 0xd96aff,
      partId: HEAVENBLOCK_PART_IDS.ECLIPSE_CRUCIBLE,
      partLabel: "Eclipse Crucible",
      vaultId: HEAVENBLOCK_OMEGA_VAULT_IDS.DEVIL,
      componentAssetKey: "heavenblocks-eclipse-crucible-v1",
    }),
  ],
  presentation: {
    depth: 7.2,
    surfaceAltarDepth: 19,
    promptDepth: 20.6,
    promptOffsetPx: 58,
    surfacePromptOffsetTiles: 4.75,
    surfaceAltarDisplayWidthTiles: 4,
    surfaceAltarDisplayHeightTiles: 4,
    surfaceAltarBaselineOffsetTiles: 0.75,
    surfaceAltarMinimumTitanClearanceTiles: 3.5,
    firstUnlockDelayMs: 1900,
    revisitDelayMs: 320,
    reducedMotionDelayMs: 80,
    relicProjectionRadiusPx: 76,
    relicProjectionScale: 0.72,
    transitFlashDurationMs: 220,
  },
  copy: {
    locked: "Requires {count}/{required} Ancient Relics",
    activate: "Awaken the Sky Altar",
    ascend: "Ascend to {label}",
    return: "Return to the surface",
    claimPart: "Claim {part}",
    openVault: "Open the Arc Vault",
    vaultLocked: "Arc Core resonance required",
    directEntryLocked: "{label} is sealed — awaken its Sky Altar first",
  },
});

export function resolveHeavenblocksGameplayEnabled(
  config = HEAVENBLOCKS_ACCESS_CONFIG,
  search = globalThis.location?.search || "",
) {
  const raw = new URLSearchParams(search).get(config.queryParam);
  if (raw === null) return config.enabled;
  const normalized = raw.trim().toLowerCase();
  if (["0", "false", "off", "no"].includes(normalized)) return false;
  if (["1", "true", "on", "yes"].includes(normalized)) return true;
  return config.enabled;
}

export function getHeavenblockAccessRegion(regionId) {
  return HEAVENBLOCKS_ACCESS_CONFIG.regions.find((entry) => entry.id === regionId) || null;
}
