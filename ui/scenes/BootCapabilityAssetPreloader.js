import { GAMEPLAY_FEATURE_IDS } from "../../values/gameplayCapabilities.js";
import {
  getSurfaceHeroLandmarkPreloadAssets,
  getSurfaceSkyPropAtlasPreloadAssets,
} from "../../values/assetKeys.js";
import { WORLD_VISUAL_PROP_GROUPS_V3 } from
  "../../values/generated/worldVisualPropLibraryV3/index.js";
import { getFireIlluminationPreloadAssets } from
  "../../values/fireIlluminationConfig.js";
import {
  getFireLightPreloadAssets,
  resolveFireRaysEnabled,
} from "../../values/fireLightConfig.js";
import { resolveFireLightPresentation } from
  "../../values/fireLightPresentation.js?rev=20260815-shallow-material-v1";

export function queueCapabilityFireAssets(
  scene,
  search = globalThis.location?.search || "",
) {
  const presentation = resolveFireLightPresentation(search);
  const activeLayers = new Set(["steadyFlame", "stateFlame"]);
  if (presentation.volumeAlphaScale !== 0) activeLayers.add("lightVolume");
  if (presentation.atmosphereAlphaScale !== 0) activeLayers.add("atmosphere");
  if (resolveFireRaysEnabled(search)) activeLayers.add("rays");
  const queueSheet = asset => {
    if (!scene.textures.exists(asset.key)) {
      scene.load.spritesheet(asset.key, asset.path, asset.frameConfig);
    }
  };
  getFireLightPreloadAssets()
    .filter(asset => activeLayers.has(asset.id))
    .forEach(queueSheet);
  if (presentation.expandedIllumination) {
    getFireIlluminationPreloadAssets().forEach(queueSheet);
  }
}

export function getCapabilitySurfaceHeroAssets(capabilities) {
  return capabilities?.isEnabled?.(GAMEPLAY_FEATURE_IDS.LEVEL_TWO)
    ? getSurfaceHeroLandmarkPreloadAssets()
    : [];
}

export function getCapabilitySurfaceSkyPropAtlases(capabilities) {
  if (!capabilities) return getSurfaceSkyPropAtlasPreloadAssets();
  const levelTwo = capabilities.isEnabled(GAMEPLAY_FEATURE_IDS.LEVEL_TWO);
  const heavenblocks = capabilities.isEnabled(GAMEPLAY_FEATURE_IDS.HEAVENBLOCKS);
  const allowedKeys = new Set(WORLD_VISUAL_PROP_GROUPS_V3
    .filter(group => (
      group.atlas.scope === "surface"
        ? levelTwo
        : group.atlas.id === "sky-islands" || heavenblocks
    ))
    .map(group => group.atlas.key));
  return getSurfaceSkyPropAtlasPreloadAssets()
    .filter(asset => allowedKeys.has(asset.key));
}

export function queueLevelTwoResourceTileAssets(
  assetKeys,
  { loadDamageStages, loadOpaqueImageGenResource },
) {
  loadDamageStages(
    [assetKeys.tiles.lavaDirtHp1, assetKeys.tiles.lavaDirtHp2,
      assetKeys.tiles.lavaDirtHp3, assetKeys.tiles.lavaDirtHp4,
      assetKeys.tiles.lavaDirtHp5],
    "sprites/tiles/second-world/lava-dirt",
  );
  loadOpaqueImageGenResource(
    [assetKeys.tiles.obsidianHp1, assetKeys.tiles.obsidianHp2,
      assetKeys.tiles.obsidianHp3, assetKeys.tiles.obsidianHp4,
      assetKeys.tiles.obsidianHp5],
    "obsidian",
  );
  loadOpaqueImageGenResource(
    [assetKeys.tiles.emberOreHp1, assetKeys.tiles.emberOreHp2,
      assetKeys.tiles.emberOreHp3, assetKeys.tiles.emberOreHp4,
      assetKeys.tiles.emberOreHp5],
    "ember-ore",
  );
  loadOpaqueImageGenResource(
    [assetKeys.tiles.magmaCrystalHp1, assetKeys.tiles.magmaCrystalHp2,
      assetKeys.tiles.magmaCrystalHp3, assetKeys.tiles.magmaCrystalHp4,
      assetKeys.tiles.magmaCrystalHp5],
    "magma-crystal",
  );
}

export function queueCapabilityUiAssets(scene, assetKeys, capabilities) {
  const heavenblocksBase = "sprites/UI/heavenblocks-v1";
  const sharedRelicFiles = {
    ancientRelicToken: "ancient-relic-token-v1.png",
    ancientRelicIcon: "ancient-relic-icon-v1.png",
  };
  for (const [id, file] of Object.entries(sharedRelicFiles)) {
    scene.load.image(assetKeys.ui.heavenblocks[id], `${heavenblocksBase}/${file}`);
  }

  const emberPath = "sprites/UI/second-world/ember-ore-icon.webp";
  scene.load.image(assetKeys.ui.resources.emberOre, emberPath);
  scene.load.image(assetKeys.ui.lootPickups.emberOre, emberPath);

  if (capabilities?.isEnabled?.(GAMEPLAY_FEATURE_IDS.LEVEL_TWO)) {
    const resourcePaths = {
      lavaDirt: "sprites/UI/second-world/lava-dirt-icon.webp",
      obsidian: "sprites/UI/second-world/obsidian-icon.webp",
      magmaCrystal: "sprites/UI/second-world/magma-crystal-icon.webp",
    };
    for (const [id, path] of Object.entries(resourcePaths)) {
      scene.load.image(assetKeys.ui.resources[id], path);
      scene.load.image(assetKeys.ui.lootPickups[id], path);
    }
  }
  if (!capabilities?.isEnabled?.(GAMEPLAY_FEATURE_IDS.HEAVENBLOCKS)) return;
  const files = {
    aetherTurbine: "aether-turbine-v1.png",
    haloRegulator: "halo-regulator-v1.png",
    eclipseCrucible: "eclipse-crucible-v1.png",
  };
  for (const [id, file] of Object.entries(files)) {
    scene.load.image(assetKeys.ui.heavenblocks[id], `${heavenblocksBase}/${file}`);
  }
}
