import {
  HEAVENBLOCK_OMEGA_VAULT_IDS,
  HEAVENBLOCK_PART_IDS,
  HEAVENBLOCK_REGION_IDS,
} from "./heavenblocksProgressionConfig.js";

const freeze = (value) => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(freeze);
  return value;
};

const region = ({
  id,
  label,
  color,
  floorTy,
  partId,
  partLabel,
  vaultId,
  componentAssetKey,
}) => ({
  id,
  label,
  color,
  platform: { leftTx: 223, rightTxExclusive: 240, floorTy },
  arrival: { tx: 231, ty: floorTy - 1 },
  returnAltar: { tx: 224, ty: floorTy - 1 },
  rewardShrine: { tx: 237, ty: floorTy - 1 },
  partId,
  partLabel,
  vaultId,
  componentAssetKey,
});

export const HEAVENBLOCKS_ACCESS_CONFIG = freeze({
  enabled: true,
  queryParam: "heavenblocksGameplay",
  requiredRelics: 3,
  interactionRadiusTiles: 1.35,
  surfaceReturn: { tx: 110, ty: 64 },
  surfaceGates: [
    {
      regionId: HEAVENBLOCK_REGION_IDS.LOWER_SKY,
      tx: 105,
      ty: 64,
      label: "Cloud Reef",
      color: 0x79ddff,
    },
    {
      regionId: HEAVENBLOCK_REGION_IDS.ANGEL,
      tx: 110,
      ty: 64,
      label: "Angel Heavenblock",
      color: 0xffe9a6,
    },
    {
      regionId: HEAVENBLOCK_REGION_IDS.DEVIL,
      tx: 115,
      ty: 64,
      label: "Devil Eclipse",
      color: 0xd96aff,
    },
  ],
  regions: [
    region({
      id: HEAVENBLOCK_REGION_IDS.LOWER_SKY,
      label: "Lower Sky Cloud Reef",
      color: 0x79ddff,
      floorTy: 49,
      partId: HEAVENBLOCK_PART_IDS.AETHER_TURBINE,
      partLabel: "Aether Turbine",
      vaultId: HEAVENBLOCK_OMEGA_VAULT_IDS.LOWER_SKY,
      componentAssetKey: "heavenblocks-aether-turbine-v1",
    }),
    region({
      id: HEAVENBLOCK_REGION_IDS.ANGEL,
      label: "Angel Heavenblock",
      color: 0xffe9a6,
      floorTy: 32,
      partId: HEAVENBLOCK_PART_IDS.HALO_REGULATOR,
      partLabel: "Halo Regulator",
      vaultId: HEAVENBLOCK_OMEGA_VAULT_IDS.ANGEL,
      componentAssetKey: "heavenblocks-halo-regulator-v1",
    }),
    region({
      id: HEAVENBLOCK_REGION_IDS.DEVIL,
      label: "Devil Eclipse Scar",
      color: 0xd96aff,
      floorTy: 14,
      partId: HEAVENBLOCK_PART_IDS.ECLIPSE_CRUCIBLE,
      partLabel: "Eclipse Crucible",
      vaultId: HEAVENBLOCK_OMEGA_VAULT_IDS.DEVIL,
      componentAssetKey: "heavenblocks-eclipse-crucible-v1",
    }),
  ],
  presentation: {
    depth: 7.2,
    promptOffsetPx: 58,
    altarRadiusPx: 28,
    lockedAlpha: 0.28,
    unlockedAlpha: 0.9,
    pulsePeriodMs: 1700,
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
