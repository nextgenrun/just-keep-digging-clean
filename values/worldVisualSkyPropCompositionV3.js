const placement = (
  id,
  assetId,
  worldRegion,
  clusterId,
  tileX,
  tileY,
  lane,
  sizeVariant = "standard",
  flipX = false,
) => Object.freeze({
  id: `sky-v3-authored-${id}`,
  scope: "sky",
  assetId,
  worldRegion,
  clusterId,
  tileX,
  tileY,
  lane,
  sizeVariant,
  flipX,
});

const SKY_PLACEMENTS = Object.freeze([
  // Portal islands use quiet outer-edge bookends; portal rows stay empty.
  placement("cyan-west-bookend", "sky-islands-cyan-crystal-foot", "v11-level-1-sky-island", "island-bookends", 80.48, 18, "rear", "small"),
  placement("cyan-east-bookend", "sky-islands-cyan-aether-battery", "v11-level-1-sky-island", "island-bookends", 95.52, 18, "mid", "large"),
  placement("indigo-west-bookend", "sky-islands-indigo-chain-anchor", "v11-level-2-sky-island", "island-bookends", 142.48, 18, "rear", "small"),
  placement("indigo-east-bookend", "sky-islands-indigo-boundary-posts", "v11-level-2-sky-island", "island-bookends", 157.52, 18, "mid", "large"),

  // Exactly one object occupies each safe gap between Heavenblock interactions.
  placement("cloud-west-planter", "cloud-angel-cloudgrass-planter", "lower-sky-cloud-reef", "interaction-gaps", 227.5, 49, "rear", "small"),
  placement("cloud-center-bench", "cloud-angel-driftwood-bench", "lower-sky-cloud-reef", "interaction-gaps", 234, 49, "mid", "standard", true),
  placement("cloud-east-cairn", "cloud-angel-cloudstone-cairn", "lower-sky-cloud-reef", "interaction-gaps", 239.175, 49, "mid", "standard", true),
  placement("angel-west-feather", "cloud-angel-gold-feather-relic", "angel-heavenblock", "interaction-gaps", 227.5, 32, "rear", "small"),
  placement("angel-center-bowl", "cloud-angel-angel-offering-bowl", "angel-heavenblock", "interaction-gaps", 234, 32, "rear"),
  placement("angel-east-crystals", "cloud-angel-light-crystals", "angel-heavenblock", "interaction-gaps", 239.175, 32, "rear", "small"),
  placement("devil-west-thorns", "devil-eclipse-obsidian-thorns", "devil-eclipse-scar", "interaction-gaps", 226.4543, 14, "rear", "small"),
  placement("devil-center-lens", "devil-eclipse-furnace-lens", "devil-eclipse-scar", "interaction-gaps", 233.4425, 14, "rear", "small", true),
  placement("devil-east-incense", "devil-eclipse-incense-vessel", "devil-eclipse-scar", "interaction-gaps", 238.7962, 14, "mid", "small"),
]);

export const WORLD_VISUAL_SKY_PROP_COMPOSITION_V3 = Object.freeze({
  version: "sky-props-v3-authored-composition-v2",
  designRule: "landmark-first-bookends-and-interaction-gaps",
  placements: SKY_PLACEMENTS,
});
