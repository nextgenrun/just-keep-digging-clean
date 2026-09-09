export const BRAND_CONFIG = Object.freeze({
  name: "UNDERSTAR",
  logoAssetPath: "sprites/branding/understar-world-within-v4/understar-world-logo-readable.webp",
  loading: Object.freeze({
    brightness: 1.45,
    path: "sprites/runtime-startup-v1/understar-logo-light.mp4",
    readyTimeoutMs: 120000,
    opacity: 0.65,
  }),
  backing: Object.freeze({
    key: "brand-logo-backing",
    path: "sprites/branding/understar-world-within-v4/understar-logo-stone.png",
    frame: "tight-stone",
    crop: Object.freeze({ x: 0, y: 0, width: 1810, height: 470 }),
    name: "brand-logo-backing",
    alpha: 1,
  }),
  animation: Object.freeze({
    "enabled": true,
    "playbackRate": 1,
    "keepPoster": true,
    "blendMode": "ADD",
    "opacity": 0.55,
    "path": "sprites/branding/understar-world-within-v4/understar-logo-light-60.mp4",
    "viewName": "brand-logo-view",
    "posterName": "brand-logo-poster",
    "videoName": "brand-logo-video",
    "query": "logoMotion",
    "reducedMotionQuery": "(prefers-reduced-motion: reduce)",
    "readyTimeoutMs": 15000
  }),
});
