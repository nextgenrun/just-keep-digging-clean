import {
  MUSIC_CONTEXT_IDS,
  MUSIC_DIRECTOR_CONFIG,
} from "../values/musicDirector.js";

function normalized(value) {
  return String(value || "").trim().toLowerCase();
}

function matchesTrackRule(profile, rule) {
  const match = rule?.match || {};
  const file = profile.normalizedFile;
  const positives = [];

  if (match.prefixAny?.length) {
    positives.push(match.prefixAny.some(prefix => file.startsWith(normalized(prefix))));
  }
  if (match.categoryAny?.length) {
    positives.push(match.categoryAny.some(category => profile.category === normalized(category)));
  }
  if (match.includesAny?.length) {
    positives.push(match.includesAny.some(part => file.includes(normalized(part))));
  }
  if (match.includesAll?.length) {
    positives.push(match.includesAll.every(part => file.includes(normalized(part))));
  }
  if (match.excludesAny?.some(part => file.includes(normalized(part)))) return false;
  if (positives.length === 0) return false;
  return match.matchMode === "any"
    ? positives.some(Boolean)
    : positives.every(Boolean);
}

function parseToken(file, expression, fallback = null) {
  const match = normalized(file).match(expression);
  return match?.[1] || fallback;
}

export function parseMusicTrackFile(file) {
  const normalizedFile = normalized(file);
  const category = parseToken(normalizedFile, /^tor-music-([^-]+)-/, "ambient");
  return Object.freeze({
    file: String(file || ""),
    normalizedFile,
    category,
    intensity: Number(parseToken(normalizedFile, /-i(\d{2})-/, "0")),
    bed: parseToken(normalizedFile, /-b(\d{2})-/, "00"),
    variant: parseToken(normalizedFile, /-c(\d{2})-/, "00"),
  });
}

export function buildMusicTrackCatalog(
  files,
  config = MUSIC_DIRECTOR_CONFIG,
) {
  return Object.freeze((Array.isArray(files) ? files : []).map((file, index) => {
    const parsed = parseMusicTrackFile(file);
    const routes = config.trackRoutes.filter(rule => matchesTrackRule(parsed, rule));
    const contexts = [...new Set(routes.flatMap(rule => rule.contexts || []))];
    const cues = [...new Set(routes.flatMap(rule => rule.cues || []))];
    return Object.freeze({
      ...parsed,
      index,
      routes: Object.freeze(routes.map(rule => rule.id)),
      contexts: Object.freeze(contexts),
      cues: Object.freeze(cues),
      classified: routes.length > 0 && (contexts.length > 0 || cues.length > 0),
    });
  }));
}

export function getMusicIndexesForContext(catalog, contextId) {
  return catalog
    .filter(track => track.contexts.includes(contextId))
    .map(track => track.index);
}

export function getMusicIndexesForCue(catalog, cueId) {
  return catalog
    .filter(track => track.cues.includes(cueId))
    .map(track => track.index);
}

function chooseIndex(indexes, random = Math.random) {
  if (!indexes.length) return -1;
  const roll = Math.min(0.999999, Math.max(0, Number(random?.()) || 0));
  return indexes[Math.floor(roll * indexes.length)];
}

export function selectMenuMusicSeedIndex(
  files,
  random = Math.random,
  config = MUSIC_DIRECTOR_CONFIG,
) {
  const catalog = buildMusicTrackCatalog(files, config);
  const titleIndexes = catalog
    .filter(track => (
      track.category === "title"
      && track.contexts.includes(MUSIC_CONTEXT_IDS.menu)
    ))
    .map(track => track.index);
  if (titleIndexes.length) return chooseIndex(titleIndexes, random);
  return chooseIndex(
    getMusicIndexesForContext(catalog, config.menuContext),
    random,
  );
}
