import { MENU_ASSET_KEYS } from "../../values/menuAssetKeys.js";
import { BRAND_CONFIG } from "../../values/branding.js";
import { isMenuMotionAllowed } from "./MenuBackgroundView.js";

const CFG = BRAND_CONFIG.animation;
const VISIBILITY = BRAND_CONFIG.visibility;

// Shade the sky, not the authored letters. Owned by the surrounding screen fade.
export function addBrandLogoShade(scene) {
  const shade = scene.add.graphics().setName(VISIBILITY.shadeName);
  const layout = () => {
    shade.clear();
    const color = VISIBILITY.shadeColor;
    shade.fillGradientStyle(color, color, color, color,
      VISIBILITY.shadeAlpha, VISIBILITY.shadeAlpha, 0, 0);
    shade.fillRect(0, 0, scene.scale.width, VISIBILITY.shadeHeight);
  };
  layout();
  scene.scale.on("resize", layout);
  shade.once("destroy", () => scene.scale.off("resize", layout));
  return shade;
}

// Same intrinsic dimensions as the poster, so existing scene layout/fades still apply.
export function addBrandLogo(scene, x, y, options = {}) {
  const presentation = options.loading ? { ...CFG, ...BRAND_CONFIG.loading } : CFG;
  const poster = scene.add.image(0, 0, MENU_ASSET_KEYS.logo).setName(CFG.posterName);
  const root = scene.add.container(x, y, [poster])
    .setSize(poster.width, poster.height).setName(CFG.viewName);
  const backingConfig = BRAND_CONFIG.backing;
  if (backingConfig.alpha > 0 && scene.textures.exists(backingConfig.key)) {
    const texture = scene.textures.get(backingConfig.key);
    const crop = backingConfig.crop;
    if (!texture.has(backingConfig.frame)) texture.add(backingConfig.frame, 0, crop.x, crop.y, crop.width, crop.height);
    const backing = scene.add.image(0, 0, backingConfig.key, backingConfig.frame)
      .setDisplaySize(poster.width, poster.height).setAlpha(backingConfig.alpha).setName(backingConfig.name);
    root.addAt(backing, 0);
  }
  const shadowUnit = poster.width / VISIBILITY.referenceWidth;
  const shadows = VISIBILITY.shadowOffsets.map(([dx, dy]) => scene.add.image(
    dx * shadowUnit, dy * shadowUnit, MENU_ASSET_KEYS.logo,
  ).setDisplaySize(poster.width, poster.height).setTint(VISIBILITY.shadowTint)
    .setAlpha(VISIBILITY.shadowAlpha));
  root.addAt(shadows, 0);
  root.setData("state", "poster");
  const motionQuery = globalThis.matchMedia?.(CFG.reducedMotionQuery);
  const allowed = () => options.motion !== false && CFG.enabled && isMenuMotionAllowed()
    && new URLSearchParams(globalThis.location?.search || "").get(CFG.query) !== "0";
  if (!allowed()) return root;

  // Full approved alpha motion replaces the poster. Contours share this decoder texture.
  const video = scene.add.video(0, 0).setName(CFG.videoName).setAlpha(0)
    .setBlendMode(CFG.blendMode ?? "NORMAL");
  root.add(video);
  root.setData("video", video);
  let disposed = false;
  let ready = false;
  let failed = false;
  let suspended = false;
  let timer = null;
  let ownedTextureKey = null;

  const fallback = () => {
    if (disposed) return;
    failed = true;
    clearTimeout(timer);
    poster.setVisible(true).clearTint();
    video.setAlpha(0).setPaused(true);
    root.setData("state", "poster");
  };
  const sync = () => {
    if (disposed || failed || !ready) return;
    const reduced = !allowed();
    // A stable authored silhouette blocks scenery through changing video alpha.
    // Keep the contour static too; only the original-color video is animated.
    poster.setVisible(true);
    if (reduced || CFG.keepPoster) poster.clearTint();
    else poster.setTint(VISIBILITY.silhouetteTint);
    video.setAlpha(reduced ? 0 : (presentation.opacity ?? 1));
    video.setPaused(reduced || suspended || Boolean(globalThis.document?.hidden));
    root.setData("state", reduced ? "poster" : "playing");
  };
  const pause = () => { suspended = true; sync(); };
  const resume = () => { suspended = false; sync(); };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(timer);
    scene.events.off("shutdown", dispose);
    scene.events.off("pause", pause);
    scene.events.off("sleep", pause);
    scene.events.off("resume", resume);
    scene.events.off("wake", resume);
    globalThis.document?.removeEventListener("visibilitychange", sync);
    motionQuery?.removeEventListener?.("change", sync);
    const textureKey = video.videoTexture?.key || ownedTextureKey;
    video.destroy();
    if (textureKey && scene.textures.exists(textureKey)) scene.textures.remove(textureKey);
  };
  root.once("destroy", dispose);
  scene.events.once("shutdown", dispose);
  scene.events.on("pause", pause);
  scene.events.on("sleep", pause);
  scene.events.on("resume", resume);
  scene.events.on("wake", resume);
  globalThis.document?.addEventListener("visibilitychange", sync);
  motionQuery?.addEventListener?.("change", sync);

  video.once("play", () => {
    // Wait until the browser's play promise settles before pause/fallback actions.
    Promise.resolve(video.video?.play()).then(() => {
      if (disposed || failed) return;
      ready = true;
      ownedTextureKey = video.videoTexture?.key;
      clearTimeout(timer);
      video.setDisplaySize(poster.width, poster.height);
      video.setPlaybackRate(CFG.playbackRate);
      sync();
    }).catch(fallback);
  });
  video.once("error", fallback);
  video.once("unsupported", fallback);
  timer = setTimeout(fallback, presentation.readyTimeoutMs);
  try {
    video.loadURL(presentation.path, true);
    video.setMute(true).play(true);
  } catch {
    fallback();
  }
  return root;
}


