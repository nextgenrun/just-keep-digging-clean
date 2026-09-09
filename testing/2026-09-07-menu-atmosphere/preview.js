import { createMenuLoadingScreen } from "../../ui/components/LoadingScreenView.js";
import { MENU_BACKGROUND_ASSETS, setSelectedMenuBackgroundKey } from "../../ui/components/MenuBackgroundView.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { MENU_ATMOSPHERE as CFG, MENU_ATMOSPHERE_VERSIONS } from "../../values/menuAtmosphere.js";
import { BRAND_CONFIG } from "../../values/branding.js";
import { LOADING_MESSAGES } from "../../values/loadingMessages.js";

const previewTip = LOADING_MESSAGES.find(message => message.label.startsWith("Tip:"));

const select = document.querySelector("#scenery");
const requestedReview = new URLSearchParams(location.search).get("motionReview");
const motionReview = MENU_ATMOSPHERE_VERSIONS[requestedReview] ?? null;
for (const [index, art] of MENU_BACKGROUND_ASSETS.entries()) {
  select.add(new Option(art.name, String(index)));
}
const requestedScenery = new URLSearchParams(location.search).get("scenery");
const sceneryIndex = MENU_BACKGROUND_ASSETS.findIndex(art => art.id === requestedScenery);
if (sceneryIndex >= 0) select.value = String(sceneryIndex);
let view = null;
let scene = null;
let loopCount = 0;
let nativeLoopCount = 0;
let nativeLoops = [];
let handoffs = [];
let blendSamples = [];
let failedMedia = false;
let mediaFallbacks = [];
let paused = false;
let stopCadenceProbe = () => {};
let resetCadenceProbe = () => {};
let cadence = { wraps: [], frameGapP95: 0, frameGapMax: 0 };
const base = new URL("../../", import.meta.url).href;
// Phaser's loader resolves the exact production-relative media paths.
const originalBase = document.createElement("base");
originalBase.href = base;
document.head.append(originalBase);
function createView() {
  if (!scene) return;
  stopCadenceProbe();
  view?.destroy();
  loopCount = 0;
  nativeLoopCount = 0;
  nativeLoops = [];
  handoffs = [];
  blendSamples = [];
  failedMedia = false;
  mediaFallbacks = [];
  setSelectedMenuBackgroundKey(MENU_BACKGROUND_ASSETS[Number(select.value)].key);
  view = createMenuLoadingScreen(scene, {
    preferLogo: true, label: previewTip.label, detail: previewTip.detail, progress: 0.64,
    onRetry: createView,
    backgroundVideoPath: motionReview ? `${motionReview.videoBase}${MENU_BACKGROUND_ASSETS[Number(select.value)].id}.mp4` : undefined,
    backgroundVideoMix: motionReview?.videoMix,
    backgroundLoopOverlapMs: motionReview?.loopOverlapMs,
    backgroundBufferedLoops: motionReview?.bufferedLoops,
    backgroundReplacePoster: motionReview?.replacePoster,
    backgroundAlpha: motionReview?.alpha,
    overlayAlpha: motionReview?.loadingOverlayAlpha,
  });
  const atmosphere = scene.children.getByName("menu-atmosphere");
  atmosphere?.on("loop", event => { loopCount++; handoffs.push(event); if (handoffs.length > 60) handoffs.shift(); updateStatus(); });
  atmosphere?.on("native-loop", event => { nativeLoopCount++; nativeLoops.push(event); updateStatus(); });
  atmosphere?.on("media-fallback", event => { mediaFallbacks.push(event); updateStatus(); });
  probeCadence(atmosphere);
  updateStatus();
}
class AtmosphereReview extends Phaser.Scene {
  preload() {
    this.load.setBaseURL(base);
    this.load.image(ASSET_KEYS.branding.logo, BRAND_CONFIG.logoAssetPath);
    this.load.image(BRAND_CONFIG.backing.key, BRAND_CONFIG.backing.path);
    for (const art of MENU_BACKGROUND_ASSETS) this.load.image(art.key, art.path);
  }
  create() { scene = this; createView(); }
}
new Phaser.Game({
  type: Phaser.AUTO, parent: "preview-root", width: 1280, height: 720,
  backgroundColor: "#080c14", audio: { noAudio: true }, scene: [AtmosphereReview],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});
select.addEventListener("change", createView);
document.querySelector("#recreate").onclick = createView;
document.querySelector("#destroy").onclick = () => { stopCadenceProbe(); view?.destroy(); view = null; updateStatus(); };
document.querySelector("#failure").onclick = () => view?.setFailure("Review: asset loading stopped. The retry control remains available.");
document.querySelector("#media-error").onclick = () => {
  const video = scene?.children.getByName("menu-atmosphere")?.list.find(child => child.name === "menu-atmosphere-video");
  if (video) { failedMedia = true; video.emit("error", video, new Error("Review media failure")); }
};
document.querySelector("#pause").onclick = event => {
  paused = !paused;
  if (paused) scene.scene.pause(); else scene.scene.resume();
  event.target.textContent = paused ? "Resume" : "Pause";
};
const still = new URLSearchParams(location.search).get("menuMotion") === "0";
const link = document.querySelector("#motion-link");
link.href = new URL("testing/2026-09-07-menu-atmosphere/" + (still ? "" : "?menuMotion=0"), base);
link.textContent = still ? "Enable scenery motion" : "Still artwork";
function updateStatus() {
  const roots = scene?.children.list.filter(child => child.name === "menu-atmosphere") || [];
  const video = roots[0]?.list.find(child => child.name === "menu-atmosphere-video");
  const media = video?.video;
  const bufferedEnd = media?.buffered.length ? media.buffered.end(media.buffered.length - 1) : 0;
  const seekableEnd = media?.seekable.length ? media.seekable.end(media.seekable.length - 1) : 0;
  document.querySelector("#loop-join").disabled = !video?.frameReady || bufferedEnd < media.duration || seekableEnd < media.duration;
  const videos = roots[0]?.list.filter(child => child.type === "Video") || [];
  const effectiveVideoOpacity = 1 - videos.reduce((alpha, child) => alpha * (1 - child.alpha * roots[0].alpha), 1);
  if (videos.filter(child => child.alpha > 0.001).length > 1) {
    blendSamples.push(Number(effectiveVideoOpacity.toFixed(6)));
    if (blendSamples.length > 60) blendSamples.shift();
  }
  document.querySelector("#status").textContent = JSON.stringify({
    scenery: MENU_BACKGROUND_ASSETS[Number(select.value)].name,
    mode: still ? "static" : "motion", view: Boolean(view), roots: roots.length,
    decoded: video?.frameReady || false, playing: Boolean(media && !media.paused),
    time: Number((media?.currentTime || 0).toFixed(3)), duration: media?.duration || 0, bufferedEnd, seekableEnd,
    cadence, loopCount, nativeLoopCount, nativeLoops, handoffs, blendSamples,
    renderFps: Number((scene?.game.loop.actualFps || 0).toFixed(1)),
    videoQuality: videos.map(child => {
      const quality = child.video?.getVideoPlaybackQuality?.();
      return { role: child.name, total: quality?.totalVideoFrames ?? 0, dropped: quality?.droppedVideoFrames ?? 0 };
    }),
    logo: {
      state: scene?.children.getByName(BRAND_CONFIG.animation.viewName)?.getData("state"),
      backing: Boolean(scene?.children.getByName(BRAND_CONFIG.animation.viewName)?.list.find(child => child.name === BRAND_CONFIG.backing.name)),
      posterVisible: scene?.children.getByName(BRAND_CONFIG.animation.viewName)?.list.find(child => child.name === BRAND_CONFIG.animation.posterName)?.visible,
      videoAlpha: scene?.children.getByName(BRAND_CONFIG.animation.viewName)?.getData("video")?.alpha,
      blendMode: scene?.children.getByName(BRAND_CONFIG.animation.viewName)?.getData("video")?.blendMode,
      playbackRate: scene?.children.getByName(BRAND_CONFIG.animation.viewName)?.getData("video")?.video?.playbackRate,
      source: scene?.children.getByName(BRAND_CONFIG.animation.viewName)?.getData("video")?.video?.getAttribute("src"),
    },
    videoStates: videos.map(child => ({ role: child.name, alpha: child.alpha, frameReady: child.frameReady, paused: child.video?.paused, time: child.video?.currentTime })),
    videoCount: videos.length, videoSources: videos.map(child => child.video?.getAttribute("src")),
    effectiveVideoOpacity: Number(effectiveVideoOpacity.toFixed(6)),
    posterOpacity: roots[0]?.list.find(child => child.name === "menu-atmosphere-poster")?.alpha ?? 0,
    muted: media?.muted ?? true, audioTracks: media?.audioTracks?.length || 0,
    viewState: view?.labelText?.text || "closed",
    videoOpacity: Number((video?.alpha || 0).toFixed(3)), failedMedia, mediaFallbacks,
    textureCount: scene ? Object.keys(scene.textures.list).length : 0,
    textureKeys: scene ? Object.keys(scene.textures.list) : [],
    ownedShutdownListeners: scene?.events.listenerCount("shutdown") || 0,
  }, null, 2);
}
function probeCadence(atmosphere) {
  stopCadenceProbe();
  cadence = { wraps: [], frameGapP95: 0, frameGapMax: 0 };
  const records = [];
  const gaps = [];
  const reset = () => { for (const record of records) record.previous = null; };
  resetCadenceProbe = reset;
  const observe = sprite => {
    const media = sprite.video;
    if (!media?.requestVideoFrameCallback || records.some(record => record.media === media)) return;
    const record = { media, previous: null, callback: null, stopped: false };
    records.push(record);
    const pause = () => { record.previous = null; };
    record.pause = pause;
    media.addEventListener("pause", pause);
    const sample = (now, frame) => {
      if (record.stopped) return;
      const visiblePlayback = sprite.alpha > 0.001 && !media.paused && !media.seeking;
      if (record.previous && visiblePlayback) {
        const step = frame.mediaTime - record.previous.mediaTime;
        const gap = now - record.previous.now;
        if (step < -1) cadence.wraps.push({ gapMs: Number(gap.toFixed(2)), from: record.previous.mediaTime, to: frame.mediaTime });
        if (step > 0) {
          gaps.push(gap);
          if (gaps.length > 240) gaps.shift();
          const ordered = [...gaps].sort((a,b) => a-b);
          cadence.frameGapP95 = Number(ordered[Math.floor((ordered.length-1)*0.95)].toFixed(2));
          cadence.frameGapMax = Number(Math.max(...gaps).toFixed(2));
        }
      }
      record.previous = visiblePlayback ? { now, mediaTime: frame.mediaTime } : null;
      record.callback = media.requestVideoFrameCallback(sample);
    };
    record.callback = media.requestVideoFrameCallback(sample);
  };
  for (const sprite of atmosphere?.list.filter(child => child.type === "Video") || []) observe(sprite);
  atmosphere?.on("media-created", observe);
  stopCadenceProbe = () => {
    atmosphere?.off("media-created", observe);
    for (const record of records) {
      record.stopped = true;
      record.media.cancelVideoFrameCallback(record.callback);
      record.media.removeEventListener("pause", record.pause);
    }
  };
}
document.querySelector("#loop-join").onclick = () => {
  const video = scene?.children.getByName("menu-atmosphere")?.list.find(child => child.name === "menu-atmosphere-video");
  if (video?.video && video.frameReady && !document.querySelector("#loop-join").disabled) {
    resetCadenceProbe();
    video.video.currentTime = Math.max(0, video.video.duration - (CFG.loopOverlapMs + 2 * CFG.loopHeadroomMs) / 1000);
  }
};
setInterval(updateStatus, 400);


// Optional foreground/lifecycle controls use the production loading component.
if (new URLSearchParams(location.search).get("loadingUiReview") === "1") {
  const controls = document.createElement("div");
  controls.className = "flex flex-wrap items-center gap-3";
  document.querySelector("#preview-root").before(controls);
  const results = document.createElement("output");
  results.id = "loading-ui-status";
  controls.after(results);
  const button = (label, action) => {
    const control = document.createElement("button");
    control.textContent = label;
    control.onclick = action;
    controls.append(control);
  };
  for (const progress of [0, 0.64, 1]) button(progress * 100 + "%", () => {
    view?.clearFailure();
    view?.setLabel("Preparing your expedition");
    view?.setDetail("The same view used by boot, world loading and portals.");
    view?.setProgress(progress);
  });
  button("Fade portal container", () => {
    if (!view) return;
    const parent = scene.add.container(0, 0);
    parent.add(view.objects);
    const samples = [];
    scene.tweens.add({
      targets: parent, alpha: 0, duration: 600,
      onUpdate: () => samples.push(Number(document.querySelector(".menu-loading")?.style.opacity)),
      onComplete: () => {
        view.destroy(); view = null; parent.destroy();
        results.textContent = JSON.stringify({ fade: "parent", followedOpacity: samples.some(alpha => alpha > 0 && alpha < 1), remainingPanels: document.querySelectorAll(".menu-loading").length });
        updateStatus();
      },
    });
  });
  button("Fade loading view", () => view?.fadeOut(300, () => {
    view = null;
    results.textContent = JSON.stringify({ fade: "view", remainingPanels: document.querySelectorAll(".menu-loading").length });
    updateStatus();
  }));
}


// A clean, fixed-progress presentation of the actual production loading view.
if (new URLSearchParams(location.search).get("loadingUiReview") === "clean") {
  const style = document.createElement("style");
  style.textContent = "body{padding:0!important;overflow:hidden!important}main{max-width:none!important;margin:0!important}main>:not(#preview-root){display:none!important}#preview-root{width:100vw;height:100dvh;margin:0!important;aspect-ratio:auto;border:0;border-radius:0}";
  document.head.append(style);
}
