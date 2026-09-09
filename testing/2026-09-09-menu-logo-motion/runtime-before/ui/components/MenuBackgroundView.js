import { debounce } from "../../libs/radash-12.1.1/curry.js";
import { MENU_ASSET_KEYS } from "../../values/menuAssetKeys.js";
import { MENU_ATMOSPHERE as CFG, MENU_SCENERY } from "../../values/menuAtmosphere.js";

export const MENU_BACKGROUND_ASSETS = Object.freeze(MENU_SCENERY.map((art, index) => Object.freeze({
  ...art,
  key: MENU_ASSET_KEYS.backgrounds[index],
  path: CFG.imageBase + art.image,
  videoPath: CFG.videoBase + art.id + ".mp4",
})));
export const MENU_BACKGROUND_KEYS = Object.freeze(MENU_BACKGROUND_ASSETS.map(art => art.key));
let selectedMenuBackgroundKey = null;

export function getSelectedMenuBackgroundKey() {
  if (!selectedMenuBackgroundKey) {
    selectedMenuBackgroundKey = MENU_BACKGROUND_KEYS[Math.floor(Math.random() * MENU_BACKGROUND_KEYS.length)];
  }
  return selectedMenuBackgroundKey;
}
export function setSelectedMenuBackgroundKey(key) {
  if (MENU_BACKGROUND_KEYS.includes(key)) selectedMenuBackgroundKey = key;
  return getSelectedMenuBackgroundKey();
}
export function getSelectedMenuBackgroundAsset() {
  return MENU_BACKGROUND_ASSETS.find(art => art.key === getSelectedMenuBackgroundKey());
}
export function isMenuMotionAllowed() {
  return new URLSearchParams(globalThis.location?.search || "").get(CFG.query) !== "0"
    && !globalThis.matchMedia?.(CFG.reducedMotionQuery)?.matches
    && !globalThis.navigator?.connection?.saveData;
}

// One container owns the poster and selected clip. Legacy exports can opt into
// a primed second copy; closed 60 fps exports use one native-looping decoder.
export function addMenuBackground(scene, options = {}) {
  const preferredKey = options.key ?? getSelectedMenuBackgroundKey();
  const art = MENU_BACKGROUND_ASSETS.find(item => item.key === preferredKey && scene.textures.exists(item.key))
    || MENU_BACKGROUND_ASSETS.find(item => scene.textures.exists(item.key));
  if (!art) return null;
  const mix = options.videoMix ?? CFG.videoMix;
  const replacePoster = options.replacePoster ?? CFG.replacePoster;
  const videoPath = options.videoPath ?? art.videoPath;
  const loopOverlapMs = options.loopOverlapMs ?? CFG.loopOverlapMs;
  const bufferedLoops = options.bufferedLoops ?? CFG.bufferedLoops;
  const root = scene.add.container(0, 0).setAlpha(options.alpha ?? CFG.alpha).setName("menu-atmosphere");
  const poster = scene.add.image(0, 0, art.key).setName("menu-atmosphere-poster");
  root.add(poster);
  options.objects?.push?.(root);
  let clips = [];
  let current = null;
  let buffer = null;
  let blend = null;
  let reveal = null;
  let destroyed = false;
  let failed = false;
  let suspended = Boolean(scene.sys?.isPaused?.() || scene.sys?.isSleeping?.());
  const motionQuery = globalThis.matchMedia?.(CFG.reducedMotionQuery);
  const connection = globalThis.navigator?.connection;
  const layout = () => {
    if (destroyed) return;
    const W = scene.scale?.width ?? options.width ?? scene.cameras.main.width;
    const H = scene.scale?.height ?? options.height ?? scene.cameras.main.height;
    for (const layer of [poster, ...clips.map(clip => clip.sprite)]) {
      if (!layer?.width || !layer?.height) continue;
      layer.setPosition(W / 2, H / 2).setScale(Math.max(W / layer.width, H / layer.height));
    }
  };
  const onResize = debounce({ delay: CFG.resizeDebounceMs }, layout);
  const disposeClip = clip => {
    clearTimeout(clip.timer);
    clip.sprite.video?.removeEventListener("seeked", clip.onSeeked);
    const textureKey = clip.sprite.videoTexture?.key;
    clip.sprite.destroy();
    if (textureKey && scene.textures?.exists(textureKey)) scene.textures.remove(textureKey);
    clips = clips.filter(item => item !== clip);
  };
  const stopVideos = () => {
    poster.setAlpha(1);
    reveal?.stop();
    reveal = null;
    blend = null;
    for (const clip of [...clips]) disposeClip(clip);
    current = null;
    buffer = null;
  };
  const failClip = (clip, reason) => {
    if (destroyed || !clips.includes(clip)) return;
    root.emit("media-fallback", { role: clip.sprite.name, reason });
    if (clip === current || blend) {
      failed = true;
      stopVideos();
    } else {
      // If the optional buffer cannot decode, keep the working native loop.
      disposeClip(clip);
      buffer = null;
      current?.sprite.setLoop(true);
      syncPlayback();
    }
  };
  const refreshReadinessTimeout = clip => {
    clearTimeout(clip.timer);
    clip.timer = null;
    if (clip.ready || suspended || globalThis.document?.hidden) return;
    clip.timer = setTimeout(() => {
      // Rendering can be throttled after the native decoder is already ready.
      if (!clip.ready && (clip.sprite.video?.readyState ?? 0) < 2) failClip(clip, "ready-timeout");
    }, CFG.readyTimeoutMs);
  };
  const prime = clip => {
    clip.sprite.setAlpha(0).setPaused(true);
    clip.primed = clip.sprite.video.currentTime === 0;
    if (!clip.primed) clip.sprite.video.currentTime = 0;
  };
  const syncPlayback = () => {
    if (destroyed) return;
    if (options.motion === false || !isMenuMotionAllowed()) { stopVideos(); return; }
    const paused = suspended || Boolean(globalThis.document?.hidden);
    if (!current && !paused && !failed) startVideos();
    for (const clip of clips) {
      if (!clip.ready) refreshReadinessTimeout(clip);
      if (!paused && clip === current && !buffer && clip.sprite.video?.ended) clip.sprite.play(true);
      // An initial frame must decode before the hidden copy can be paused.
      clip.sprite.setPaused(paused || (clip.ready && clip !== current && !blend));
    }
    if (paused) reveal?.pause(); else reveal?.resume();
  };
  const makeClip = primary => {
    const clip = { sprite: scene.add.video(0, 0).setAlpha(0), ready: false, primed: false, timer: null, onSeeked: null };
    clips.push(clip);
    root.add(clip.sprite);
    clip.sprite.setName(primary ? "menu-atmosphere-video" : "menu-atmosphere-buffer");
    if (primary) current = clip; else buffer = clip;
    clip.sprite.once("play", () => {
      // A decoded frame can arrive before the native play promise settles.
      // Wait for it before pausing the buffer, avoiding an AbortError race.
      Promise.resolve(clip.sprite.video.play()).then(() => {
        if (destroyed || !clips.includes(clip)) return;
        clip.ready = true;
        clearTimeout(clip.timer);
        clip.onSeeked = () => { if (clip !== current && !blend) clip.primed = true; };
        clip.sprite.video.addEventListener("seeked", clip.onSeeked);
        layout();
        if (clip === current) {
          if (bufferedLoops && !buffer) makeClip(false);
          reveal = scene.tweens.add({ targets: clip.sprite, alpha: mix, duration: CFG.revealMs, ease: "Sine.easeInOut",
            onUpdate: () => {
              if (!replacePoster) return;
              const opacity = root.alpha * clip.sprite.alpha;
              poster.setAlpha(opacity >= 1 ? 0 : (1 - clip.sprite.alpha) / (1 - opacity));
            },
          });
        } else prime(clip);
        syncPlayback();
      }).catch(error => failClip(clip, error?.message || "play-error"));
    });
    clip.sprite.on("loop", () => {
      // Phaser also reports backward review seeks as loops.
      if (clip === current && clip.sprite.video.currentTime < loopOverlapMs / 1000) root.emit("native-loop", { time: clip.sprite.video.currentTime, bufferReady: buffer?.ready, bufferPrimed: buffer?.primed, bufferTime: buffer?.sprite.video?.currentTime, blending: Boolean(blend) });
    });
    clip.sprite.once("error", (_sprite, error) => failClip(clip, error?.message || "media-error"));
    clip.sprite.once("unsupported", () => failClip(clip, "unsupported"));
    refreshReadinessTimeout(clip);
    clip.sprite.loadURL(videoPath, true);
    // Buffered copies hold their final frame if rendering is delayed.
    clip.sprite.setMute(true).play(!bufferedLoops);
    root.emit("media-created", clip.sprite);
  };
  // Give the visible decoder its first frame before starting the hidden copy.
  const startVideos = () => makeClip(true);
  const updateLoop = () => {
    if (destroyed || suspended || globalThis.document?.hidden || !current?.ready || !buffer?.ready) return;
    const activeMedia = current.sprite.video;
    const incomingMedia = buffer.sprite.video;
    const remaining = activeMedia.duration - activeMedia.currentTime;
    const overlap = loopOverlapMs / 1000;
    const headroom = CFG.loopHeadroomMs / 1000;
    if (!blend && buffer.primed && remaining <= overlap + headroom) {
      reveal?.stop();
      reveal = null;
      blend = { start: incomingMedia.currentTime, duration: Math.max(headroom, Math.min(overlap, remaining - headroom)) };
      if (replacePoster) poster.setAlpha(0);
      buffer.primed = false;
      root.bringToTop(buffer.sprite);
      buffer.sprite.setPaused(false);
    }
    if (!blend) return;
    const phase = Phaser.Math.Clamp((incomingMedia.currentTime - blend.start) / blend.duration, 0, 1);
    const eased = phase * phase * (3 - 2 * phase);
    const incomingAlpha = mix * eased;
    buffer.sprite.setAlpha(incomingAlpha);
    // Phaser multiplies container alpha into each child before compositing.
    // Compensate at rendered opacity so the overlap never brightens the sky.
    const renderedIncomingAlpha = root.alpha * incomingAlpha;
    current.sprite.setAlpha(renderedIncomingAlpha >= 1 ? 0 : mix * (1 - eased) / (1 - renderedIncomingAlpha));
    if (phase < 1 && remaining > headroom / 2) return;
    const handoff = { outgoingTime: activeMedia.currentTime, outgoingDuration: activeMedia.duration,
      incomingTime: incomingMedia.currentTime, fadeSeconds: blend.duration, sceneKey: art.key };
    const outgoing = current;
    current = buffer;
    buffer = outgoing;
    blend = null;
    current.sprite.setAlpha(mix).setName("menu-atmosphere-video");
    buffer.sprite.setName("menu-atmosphere-buffer");
    prime(buffer);
    root.emit("loop", handoff);
  };
  const suspend = () => { suspended = true; syncPlayback(); };
  const resume = () => { suspended = false; syncPlayback(); };
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    stopVideos();
    onResize.cancel();
    scene.scale?.off("resize", onResize);
    scene.events.off("update", updateLoop);
    scene.events.off("shutdown", destroy);
    scene.events.off("sleep", suspend);
    scene.events.off("pause", suspend);
    scene.events.off("wake", resume);
    scene.events.off("resume", resume);
    globalThis.document?.removeEventListener("visibilitychange", syncPlayback);
    motionQuery?.removeEventListener?.("change", syncPlayback);
    connection?.removeEventListener?.("change", syncPlayback);
  };
  root.once("destroy", destroy);
  scene.events.once("shutdown", destroy);
  scene.events.on("update", updateLoop);
  scene.scale?.on("resize", onResize);
  scene.events.on("sleep", suspend);
  scene.events.on("pause", suspend);
  scene.events.on("wake", resume);
  scene.events.on("resume", resume);
  globalThis.document?.addEventListener("visibilitychange", syncPlayback);
  motionQuery?.addEventListener?.("change", syncPlayback);
  connection?.addEventListener?.("change", syncPlayback);
  layout();
  syncPlayback();
  return root;
}
