import { getPlayerAssetProfile } from "../../../values/playerAssetProfiles.js";
import { UAL_FLIGHT_STYLE_LAB_CONFIG } from "../../../values/ualFlightStyleLab.js";

const packCache = new Map();

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${url}`));
    image.src = url;
  });
}

async function loadReviewAction(actionId, source, rootUrl) {
  const manifestUrl = new URL(source.manifestPath, rootUrl);
  const reviewManifestUrl = new URL(source.reviewManifestPath, rootUrl);
  const [manifestResponse, reviewResponse] = await Promise.all([
    fetch(manifestUrl),
    fetch(reviewManifestUrl),
  ]);
  if (!manifestResponse.ok) throw new Error(`Review manifest failed: ${manifestResponse.status} ${manifestUrl}`);
  if (!reviewResponse.ok) throw new Error(`Review details failed: ${reviewResponse.status} ${reviewManifestUrl}`);
  const [manifest, review] = await Promise.all([manifestResponse.json(), reviewResponse.json()]);
  const metadata = manifest.actions?.[source.sourceActionId];
  if (!metadata) throw new Error(`Review manifest is missing ${source.sourceActionId}`);
  const imageUrl = new URL(metadata.file, new URL(".", manifestUrl));
  return {
    ...metadata,
    id: actionId,
    sourceActionId: source.sourceActionId,
    flightHitbox: review.flightHitbox || null,
    imageUrl: imageUrl.href,
    image: await loadImage(imageUrl.href),
  };
}

async function createPack(characterId) {
  const profile = getPlayerAssetProfile(characterId);
  const projectRootUrl = new URL("../../../", import.meta.url);
  const rootUrl = new URL(`${profile.basePath}/`, projectRootUrl);
  const manifestUrl = new URL("manifest.json", rootUrl);
  const response = await fetch(manifestUrl);
  if (!response.ok) throw new Error(`Manifest failed: ${response.status} ${manifestUrl}`);
  const manifest = await response.json();

  const actions = Object.create(null);
  await Promise.all(UAL_FLIGHT_STYLE_LAB_CONFIG.actions.map(async (actionId) => {
    const reviewSource = UAL_FLIGHT_STYLE_LAB_CONFIG.reviewActions?.[characterId]?.[actionId];
    if (reviewSource) {
      actions[actionId] = await loadReviewAction(actionId, reviewSource, projectRootUrl);
      return;
    }
    const sourceActionId = UAL_FLIGHT_STYLE_LAB_CONFIG.fallbackActions?.[actionId] || actionId;
    const metadata = manifest.actions?.[sourceActionId];
    if (!metadata) throw new Error(`${characterId} manifest is missing ${sourceActionId}`);
    const imageUrl = new URL(metadata.file, rootUrl);
    actions[actionId] = {
      ...metadata,
      id: actionId,
      sourceActionId,
      imageUrl: imageUrl.href,
      image: await loadImage(imageUrl.href),
    };
  }));

  return Object.freeze({
    characterId,
    profile,
    manifest,
    actions: Object.freeze(actions),
  });
}

export function loadFlightCharacterPack(characterId) {
  if (!packCache.has(characterId)) packCache.set(characterId, createPack(characterId));
  return packCache.get(characterId);
}

export function getRigPoint(action, frameIndex, markerName) {
  const frame = action?.rig_markers?.frames?.[String(frameIndex)];
  const point = frame?.[markerName];
  return Array.isArray(point) && point.length >= 2 ? point : null;
}

export function getAverageRigPoint(action, frameIndex, markerNames, fallback) {
  const points = markerNames
    .map(markerName => getRigPoint(action, frameIndex, markerName))
    .filter(Boolean);
  if (!points.length) return fallback;
  return points.reduce((total, point) => [total[0] + point[0], total[1] + point[1]], [0, 0])
    .map(value => value / points.length);
}
