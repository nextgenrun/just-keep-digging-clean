import { STAR_IDENTITY_LIBRARY_CONFIG } from
  "../../values/starIdentityLibrary.js?rev=20260906-baked-celestial-v2";
import { getStarIdentitiesForRarity } from
  "../../values/starIdentityLibraryMath.js";
import { installStarIdentityTextureFrames } from
  "../../systems/visual/installStarIdentityTextureFrames.js";
import { BAKED_STAR_LAYOUT } from "../../values/bakedCelestialUi.js";
import { prepareArt } from "../../systems/visual/bakedUiArt.js";
import { renderStarAtlasControls } from
  "./UIInventoryStarAtlasControls.js?rev=20260906-baked-celestial-v2";
import { fitStarAtlasFoundation } from
  "./UIInventoryStarAtlasLayout.js?rev=20260906-baked-celestial-v2";
import {
  renderEmptyStarAtlasDossier,
  renderStarAtlasDossier,
} from "./UIInventoryStarAtlasDossier.js?rev=20260906-baked-celestial-v2";

function normalizeIdentityCounts(identityCounts, identityTotal) {
  return Array.from({ length: identityTotal }, (unused, identityIndex) => (
    Math.max(0, Math.floor(Number(identityCounts?.[identityIndex]) || 0))
  ));
}

export function renderInventoryStarAtlas(
  scene,
  shell,
  rect,
  selectedRarity,
  selectedIdentity,
  identityCounts,
  onSelectRarity,
  onSelectIdentity,
) {
  const config = STAR_IDENTITY_LIBRARY_CONFIG;
  const counts = normalizeIdentityCounts(
    identityCounts,
    config.identities.length,
  );
  const framesReady = installStarIdentityTextureFrames(scene);
  if (!framesReady || !scene.textures?.exists?.(config.inventory.foundation.key)) {
    return Object.freeze({
      rarityIndex: 0,
      identityIndex: -1,
      preview: null,
      pageIndex: 0,
      pageCount: 0,
      foundCount: 0,
      collectedCount: 0,
    });
  }
  const rarityIndex = Math.max(
    0,
    Math.min(config.rarityIdentityCounts.length - 1, selectedRarity || 0),
  );
  const identities = getStarIdentitiesForRarity(rarityIndex);
  const collectedIdentities = identities.filter(
    identity => counts[identity.index] > 0,
  );
  const identity = collectedIdentities.find(
    entry => entry.index === selectedIdentity,
  ) || collectedIdentities[0] || null;
  const selectedIdentityIndex = identity?.index ?? -1;
  const bounds = fitStarAtlasFoundation(rect, config.inventory.layout);
  const foundation = scene.add.image(
    bounds.left,
    bounds.top,
    config.inventory.foundation.key,
  ).setOrigin(0)
    .setDisplaySize(bounds.width, bounds.height);
  shell.content.add(foundation);
  if (!identity && scene.textures.exists(config.inventory.emptyFoundation.key)) {
    const g = BAKED_STAR_LAYOUT;
    const art = prepareArt(scene, { ...config.inventory.emptyFoundation,
      frame:g.emptyDossierFrame, rect:g.emptyDossierRect });
    const [x, y, width, height] = g.emptyDossierRect;
    const scale = bounds.width / config.inventory.layout.sourceWidthPx;
    shell.content.add(scene.add.image(bounds.left + x * scale, bounds.top + y * scale,
      art.key, art.frame).setOrigin(0).setDisplaySize(width * scale, height * scale));
  }

  const pageState = renderStarAtlasControls(
    scene,
    shell.content,
    bounds,
    rarityIndex,
    identities,
    selectedIdentityIndex,
    counts,
    onSelectRarity,
    onSelectIdentity,
  );
  const preview = identity
    ? renderStarAtlasDossier(
      scene,
      shell.content,
      bounds,
      identity,
      counts[identity.index],
    )
    : renderEmptyStarAtlasDossier(
      scene,
      shell.content,
      bounds,
    );
  return Object.freeze({
    rarityIndex,
    identityIndex: selectedIdentityIndex,
    preview,
    foundCount: collectedIdentities.length,
    collectedCount: collectedIdentities.reduce(
      (total, entry) => total + counts[entry.index],
      0,
    ),
    ...pageState,
  });
}
