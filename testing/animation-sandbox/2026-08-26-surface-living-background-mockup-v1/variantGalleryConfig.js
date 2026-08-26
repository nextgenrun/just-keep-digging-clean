const variant = (id, modelLabel, model, profileId, profileLabel) => Object.freeze({
  id,
  modelLabel,
  model,
  profileId,
  profileLabel,
  src: `./variants-v1/${id}.mp4`,
});

export const SURFACE_LIVING_VARIANTS = Object.freeze([
  variant("01-seedance-mini-air", "Seedance 2.0 Mini", "bytedance/seedance-2.0-mini", "air", "Air only"),
  variant("02-seedance-mini-hearth", "Seedance 2.0 Mini", "bytedance/seedance-2.0-mini", "hearth", "Quiet hearth"),
  variant("03-seedance-fast-air", "Seedance 2.0 Fast", "bytedance/seedance-2.0-fast", "air", "Air only"),
  variant("04-seedance-fast-hearth", "Seedance 2.0 Fast", "bytedance/seedance-2.0-fast", "hearth", "Quiet hearth"),
  variant("05-kling-standard-air", "Kling 3.0 Standard", "kwaivgi/kling-v3.0-std", "air", "Air only"),
  variant("06-kling-standard-hearth", "Kling 3.0 Standard", "kwaivgi/kling-v3.0-std", "hearth", "Quiet hearth"),
  variant("07-veo-fast-air", "Veo 3.1 Fast", "google/veo-3.1-fast", "air", "Air only"),
  variant("08-veo-fast-hearth", "Veo 3.1 Fast", "google/veo-3.1-fast", "hearth", "Quiet hearth"),
  variant("09-wan-air", "Wan 2.7", "alibaba/wan-2.7", "air", "Air only"),
  variant("10-wan-hearth", "Wan 2.7", "alibaba/wan-2.7", "hearth", "Quiet hearth"),
]);

export const SURFACE_LIVING_PROFILE_COPY = Object.freeze({
  air: "Smoke, window warmth, and distant clouds only; underground stays still.",
  hearth: "Adds one tiny grass sway and three stationary underground glints.",
});
