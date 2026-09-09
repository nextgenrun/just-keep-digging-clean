import { NPC_ACTIVITY_CONFIG } from '../../../values/npcActivityConfig.js';
import { MERCHANT_MOTION_SANDBOX as C } from '../../../values/merchantMotionSandbox.js';
import { MerchantPuppet } from './MerchantPuppet.js';

const assetUrl = path => new URL(`../../../${path}`, import.meta.url).href;
function measureFoot(image) {
  const probe = document.createElement('canvas');
  probe.width = image.naturalWidth; probe.height = image.naturalHeight;
  const ctx = probe.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0,0,probe.width,probe.height);
  for (let y = probe.height - 1; y >= 0; y--) {
    for (let x = 0; x < probe.width; x++) {
      if (data[(y * probe.width + x) * 4 + 3] >= C.alphaThreshold) return (y + 1) / probe.height * C.referenceSize;
    }
  }
  throw new Error('Merchant artwork has no visible pixels');
}

export class SandboxCard {
  constructor(cast, rig, index, onInspect) {
    this.cast = cast; this.rig = rig; this.index = index;
    const source = NPC_ACTIVITY_CONFIG.merchants[cast.id];
    if (!source) throw new Error(`Unknown merchant ${cast.id}`);
    this.slug = source.assetSlug;
    this.element = document.createElement('article');
    this.element.className = 'merchant'; this.element.dataset.merchant = cast.id;
    this.element.style.setProperty('--accent', cast.color);
    this.element.innerHTML = `
      <header class="merchant-heading"><span class="number">${String(index + 1).padStart(2,'0')}</span>
        <div><h2>${cast.name}</h2><p>${cast.role}</p></div>
        <button class="inspect" type="button" aria-label="Inspect ${cast.name}">Inspect <span aria-hidden="true">↗</span></button></header>
      <div class="stage">
        <div class="pane baseline"><span class="pane-label">${cast.id === 'magmaMoneyMonster' ? 'EXISTING STILL' : 'EXISTING IDLE'}</span><div class="ground"></div><div class="old-art"></div></div>
        <div class="pane candidate"><span class="pane-label">NEW MOTION</span><div class="ground"></div><canvas role="img" aria-label="${cast.name} new animation"></canvas></div>
      </div>
      <footer class="merchant-footer"><span class="motion-state">Loading artwork…</span><span class="contact">Feet planted</span></footer>
      <p class="description">${cast.description}</p>`;
    this.canvas = this.element.querySelector('canvas');
    this.label = this.element.querySelector('.motion-state');
    this.oldPane = this.element.querySelector('.baseline');
    this.oldArt = this.element.querySelector('.old-art');
    this.element.querySelector('.inspect').addEventListener('click', () => onInspect(cast.id));
  }
  async load() {
    const image = new Image();
    image.src = assetUrl(`${NPC_ACTIVITY_CONFIG.baselineAssets.staticBasePath}/${this.slug}.webp`);
    await image.decode();
    this.foot = measureFoot(image); this.image = image;
    this.puppet = new MerchantPuppet(this.canvas, image, this.cast, this.rig, this.foot);
    if (this.cast.id === 'magmaMoneyMonster') {
      this.baseline = image.cloneNode(); this.baseline.alt = 'Existing Magma Money Monster still';
    } else {
      this.baseline = document.createElement('video');
      this.baseline.muted = true; this.baseline.loop = true; this.baseline.playsInline = true;
      this.baseline.preload = 'metadata'; this.baseline.poster = image.src;
      this.baseline.src = assetUrl(`${NPC_ACTIVITY_CONFIG.baselineAssets.videoBasePath}/${this.slug}-idle-alpha.webm`);
      this.baseline.setAttribute('aria-label', `${this.cast.name} existing idle video`);
      this.baseline.addEventListener('error', () => {
        this.oldPane.querySelector('.pane-label').textContent = 'IDLE VIDEO UNAVAILABLE';
        this.oldPane.dataset.error = 'true';
      });
    }
    this.oldArt.append(this.baseline); this.element.dataset.ready = 'true';
    this.label.textContent = 'Calm idle';
  }
  playback(state) {
    if (!(this.baseline instanceof HTMLVideoElement)) return;
    this.baseline.playbackRate = state.speed;
    const visible = !state.focus || state.focus === this.cast.id;
    if (state.compare && !state.paused && !document.hidden && visible) {
      this.baseline.play().catch(() => { this.oldPane.dataset.playback = 'waiting'; });
    } else this.baseline.pause();
  }
  seek(time) {
    if (this.baseline instanceof HTMLVideoElement && Number.isFinite(this.baseline.duration)) this.baseline.currentTime = time % this.baseline.duration;
  }
  draw(time, actionTime, gameSize) {
    if (!this.puppet) return;
    this.puppet.draw(time, actionTime, gameSize);
    const active = actionTime >= 0;
    this.label.textContent = active ? this.cast.action : 'Calm idle';
    this.label.classList.toggle('active', active);
    const width = this.oldPane.clientWidth, height = this.oldPane.clientHeight;
    if (width && height) {
      const size = gameSize || Math.min(height * C.fitFraction, width * C.widthFraction);
      Object.assign(this.oldArt.style, {
        width: `${size}px`, height: `${size}px`, left: `${width/2-size/2}px`,
        top: `${height*C.stageGroundFraction-this.foot/C.referenceSize*size}px`,
      });
    }
  }
  destroy() { this.baseline?.pause?.(); this.puppet?.destroy(); }
}
