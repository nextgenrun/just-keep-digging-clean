import { MENU_LOADING_PRESENTATION as CFG } from "../../values/menuLoadingPresentation.js";
import { RELEASE_PRESENTATION } from "../../values/releasePresentation.js";
import { MAIN_MENU_PRESENTATION } from "../../values/mainMenuPresentation.js";

// This DOM foreground follows a Phaser object's bounds, parent alpha and lifetime.
export function createMenuLoadingPanel(scene, options = {}) {
  const canvas = scene.game.canvas;
  const host = canvas.parentElement;
  const root = document.createElement("section");
  root.className = "menu-loading";
  root.dataset.state = "loading";
  root.setAttribute("aria-label", CFG.copy.progress);
  root.hidden = true;
  const stylesheet = new URL("../../css/menu-loading.css", import.meta.url).href;
  let link = [...document.querySelectorAll('link[rel="stylesheet"]')].find(item => item.href === stylesheet);
  if (!link) {
    link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = stylesheet;
    document.head.append(link);
  }
  const reveal = () => { root.hidden = false; };
  if (link.sheet) reveal(); else link.addEventListener("load", reveal, { once: true });
  link.addEventListener("error", reveal, { once: true });
  root.innerHTML = '<div class="menu-loading__edition"><span></span></div>'
    + '<div class="menu-loading__panel">'
    + '<div class="menu-loading__header"><div class="menu-loading__heading">'
    + '<div class="menu-loading__status"></div><h1 class="menu-loading__label"></h1>'
    + '</div><div class="menu-loading__percentage" aria-hidden="true"><span>0</span><small>%</small></div></div>'
    + '<div class="menu-loading__track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="menu-loading__well"><div class="menu-loading__fill"></div></div></div>'
    + '<p class="menu-loading__detail"></p>'
    + '<div class="menu-loading__failure" hidden><p class="menu-loading__error" role="alert"></p><button class="menu-loading__retry" type="button" hidden></button></div></div>';
  host.append(root);
  const element = name => root.querySelector(".menu-loading__" + name);
  element("edition").firstElementChild.textContent = options.subtitle ?? RELEASE_PRESENTATION.label;
  root.style.setProperty("--loading-rail-art", 'url("' + new URL("../../" + CFG.rail.path, import.meta.url).href + '")');
  root.style.setProperty("--loading-rail-aspect", CFG.rail.width + " / " + CFG.rail.height);
  root.style.setProperty("--loading-retry-art", 'url("' + new URL("../../" + MAIN_MENU_PRESENTATION.button.idlePath, import.meta.url).href + '")');
  const status = element("status");
  status.textContent = CFG.copy.loading;
  const track = element("track");
  track.setAttribute("aria-label", CFG.copy.progress);
  const fill = element("fill");
  const percent = element("percentage").firstElementChild;
  const failure = element("failure");
  const retry = element("retry");
  retry.textContent = CFG.copy.retry;
  const labelText = textAdapter(element("label"));
  const detailText = textAdapter(element("detail"));
  const pctText = { get text() { return percent.textContent + "%"; } };
  labelText.setText(options.label ?? CFG.copy.label);
  detailText.setText(options.detail ?? "");

  const anchor = scene.add.container(0, 0);
  let destroyed = false;
  let sleeping = false;
  let previousAlpha = null;
  const layout = () => {
    if (destroyed) return;
    const bounds = canvas.getBoundingClientRect();
    const parent = host.getBoundingClientRect();
    const { width, height } = scene.scale;
    Object.assign(root.style, {
      left: (bounds.left - parent.left + host.scrollLeft - host.clientLeft) + "px",
      top: (bounds.top - parent.top + host.scrollTop - host.clientTop) + "px",
      width: width + "px", height: height + "px",
      transform: "scale(" + bounds.width / width + ", " + bounds.height / height + ")",
    });
    root.style.setProperty("--loading-text-scale", String(Math.max(1, Math.min(CFG.textScaleMax, width / Math.max(1, bounds.width)))));
    root.style.setProperty("--loading-panel-width", CFG.width + "px");
    root.style.setProperty("--loading-panel-bottom", CFG.bottom + "px");
    root.style.setProperty("--loading-edition-top", CFG.editionTop + "px");
  };
  const syncOpacity = () => {
    let alpha = sleeping ? 0 : 1;
    for (let owner = anchor; owner; owner = owner.parentContainer) {
      alpha *= owner.visible === false ? 0 : owner.alpha;
    }
    if (alpha !== previousAlpha) {
      root.style.opacity = String(alpha);
      root.style.visibility = alpha > 0 ? "visible" : "hidden";
      previousAlpha = alpha;
    }
  };
  const pause = () => { root.dataset.paused = "true"; root.inert = true; };
  const resume = () => { root.dataset.paused = "false"; root.inert = false; };
  const sleep = () => { sleeping = true; pause(); syncOpacity(); };
  const wake = () => { sleeping = false; resume(); syncOpacity(); layout(); };
  const observer = new ResizeObserver(layout);
  observer.observe(canvas);
  observer.observe(host);
  scene.scale.on("resize", layout);
  scene.game.events.on("postrender", syncOpacity);
  const events = { pause, resume, sleep, wake };
  for (const [name, handler] of Object.entries(events)) scene.events.on(name, handler);
  const cleanup = () => {
    if (destroyed) return;
    destroyed = true;
    observer.disconnect();
    scene.scale.off("resize", layout);
    scene.game.events.off("postrender", syncOpacity);
    for (const [name, handler] of Object.entries(events)) scene.events.off(name, handler);
    scene.events.off("shutdown", cleanup);
    link.removeEventListener("load", reveal);
    link.removeEventListener("error", reveal);
    root.remove();
  };
  anchor.once("destroy", cleanup);
  scene.events.once("shutdown", cleanup);
  layout();
  syncOpacity();

  return {
    anchor, root, labelText, detailText, pctText,
    setProgress(value) {
      const percentage = Math.floor(value * 100);
      fill.style.width = (value * 100) + "%";
      fill.dataset.empty = String(value === 0);
      percent.textContent = String(percentage);
      track.setAttribute("aria-valuenow", String(percentage));
      if (root.dataset.state !== "failed") {
        root.dataset.state = value === 1 ? "ready" : "loading";
        status.textContent = value === 1 ? CFG.copy.ready : CFG.copy.loading;
      }
    },
    setFailure(message) {
      root.dataset.state = "failed";
      status.textContent = CFG.copy.failed;
      failure.hidden = false;
      element("error").textContent = String(message);
    },
    clearFailure() {
      failure.hidden = true;
      element("error").textContent = "";
      root.dataset.state = "loading";
      retry.textContent = CFG.copy.retry;
    },
    setRetryHandler(handler, enabled) {
      retry.hidden = !enabled;
      retry.disabled = !enabled;
      retry.onclick = event => { event.stopPropagation(); handler(); };
    },
    destroy() { anchor.destroy(); cleanup(); },
  };
}

function textAdapter(element) {
  return {
    get text() { return element.textContent; },
    setText(value) { element.textContent = String(value ?? ""); return this; },
  };
}

