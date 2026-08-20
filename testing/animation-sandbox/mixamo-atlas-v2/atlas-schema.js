export const GROUPS = Object.freeze([
  { id: "ground", label: "Ground locomotion" },
  { id: "crouch", label: "Ducking and low movement" },
  { id: "air", label: "Flight, descent and landing" },
  { id: "combat", label: "Mining, punches and kicks" },
  { id: "abilities", label: "Abilities, wall and traversal" },
  { id: "reactions", label: "Reactions and death" },
  { id: "idle", label: "Idle and fidgets" },
]);

const ROOTS = Object.freeze({
  library: "../../blender-animation-lab-v1/review-drafts/mixamo-library-v1/renders/candidate-runtime",
  combat: "../../blender-animation-lab-v1/review-drafts/mixamo-punch-sequence-sandbox-v1/renders/candidate",
  locomotion: "../../blender-animation-lab-v1/review-drafts/mixamo-locomotion-comparison-v1/renders/candidate-runtime",
  atlas: "../../blender-animation-lab-v1/review-drafts/mixamo-atlas-v2/renders/candidate-runtime",
});

export const local = (family, file) => `${ROOTS[family]}/${file}.gif`;

export const candidate = (
  id, group, role, title, description, motionId, currentKey, options = {}
) => Object.freeze({
  id, group, role, title, description, motionId, currentKey,
  localGif: options.localGif || null,
  sourceGif: motionId
    ? `https://d99n9xvb9513w.cloudfront.net/thumbnails/motions/${motionId}/animated.gif`
    : null,
  stage: options.gate ? "gated" : options.localGif ? "v4" : "source",
  gate: options.gate || null,
  referenceOnly: Boolean(options.referenceOnly),
  tags: Object.freeze(options.tags || []),
});
