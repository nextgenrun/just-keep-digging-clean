import { STAR_IDENTITY_LIBRARY_CONFIG } from
  "../../values/starIdentityLibrary.js?rev=20260830-star-codex-v3";
import { getStarIdentitiesForRarity } from
  "../../values/starIdentityLibraryMath.js";
import { installStarIdentityTextureFrames } from
  "../../systems/visual/installStarIdentityTextureFrames.js";
import { renderStarAtlasControls } from
  "./UIInventoryStarAtlasControls.js?rev=20260830-star-codex-v3";
import { fitStarAtlasFoundation } from
  "./UIInventoryStarAtlasLayout.js?rev=20260830-star-codex-v3";
import {
  renderEmptyStarAtlasDossier,
  renderStarAtlasDossier,
} from "./UIInventoryStarAtlasDossier.js?rev=20260830-star-codex-v3";

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
