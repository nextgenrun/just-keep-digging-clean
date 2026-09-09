function freezeCategories(categories) {
  return Object.freeze(categories.map(category => Object.freeze({
    ...category,
    itemIds: Object.freeze([...category.itemIds]),
  })));
}

export function createAudioLibraryReviewConfig(baseConfig, baseFlow, expansion) {
  const sources = Object.freeze({ ...baseConfig.sources, ...expansion.sources });
  const scenarios = Object.freeze({ ...baseConfig.scenarios, ...expansion.scenarios });
  const categories = freezeCategories(expansion.categories);
  const reviewItemIds = Object.freeze(
    categories.flatMap(category => category.itemIds),
  );
  const unknownItems = reviewItemIds.filter(itemId => !scenarios[itemId]);
  if (unknownItems.length) {
    throw new Error(`Audio review categories reference unknown items: ${unknownItems.join(", ")}`);
  }
  if (new Set(reviewItemIds).size !== reviewItemIds.length) {
    throw new Error("Audio review items must belong to exactly one category");
  }

  const loopCandidateIds = Object.entries(expansion.sources)
    .filter(([, source]) => source.role === "loop")
    .map(([sourceId]) => sourceId);
  const config = Object.freeze({
    ...baseConfig,
    schemaVersion: 2,
    sources,
    scenarios,
    scenarioOrder: reviewItemIds,
    ambienceOptions: Object.freeze([
      ...baseConfig.ambienceOptions,
      ...loopCandidateIds,
    ]),
    libraryExpansion: Object.freeze({
      reviewOnly: expansion.reviewOnly,
      runtimeWired: expansion.runtimeWired,
      localCandidateCount: expansion.localCandidateCount,
      onlineCandidateCount: expansion.onlineCandidateCount,
      onlineManifestPath: expansion.onlineManifestPath,
      gapFamilies: Object.freeze([...expansion.gapFamilies]),
    }),
  });
  const flow = Object.freeze({
    ...baseFlow,
    schemaVersion: 2,
    defaultCategoryId: expansion.defaultCategoryId,
    reviewItemIds,
    categories,
    itemPageSize: expansion.itemPageSize,
    categoryColumns: expansion.categoryColumns,
    exportFilename: "understar-audio-library-review-decisions.json",
    copy: Object.freeze({
      ...baseFlow.copy,
      title: "AUDIO LIBRARY REVIEW",
      chooseItem: "Choose a named candidate; J/K crosses pages",
      controls: "J/K move · Space play · Y approve · N reject · C clear · 0 stop",
    }),
  });
  return Object.freeze({ config, flow });
}
