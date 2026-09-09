import { MERCHANT_IDLE_PERSONALITY as C } from '../../../values/merchantIdlePersonalitySandbox.js';
import { MERCHANT_MOTION_CONFIG as M } from '../../../values/merchantMotion.js';
import { NPC_ACTIVITY_CONFIG } from '../../../values/npcActivityConfig.js';
import { PersonalityRenderer } from './PersonalityRenderer.js';
import { sampleActivity } from './timeline.js';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image); image.onerror = () => reject(new Error('Could not load ' + src)); image.src = src;
  });
}

export class PersonalityCard {
  constructor(cast, rig, index, { focus, cue }) {
    this.cast = cast; this.rig = rig; this.index = index; this.cue = null;
    const article = this.element = document.createElement('article');
    article.className = 'merchant'; article.dataset.merchant = cast.id; article.style.setProperty('--accent', cast.color);
    article.innerHTML = `<header class="merchant-heading"><span class="number">${String(index + 1).padStart(2, '0')}</span><div><h2>${cast.name}</h2><p>${cast.role}</p></div><button class="inspect" type="button" aria-label="Focus ${cast.name}">Inspect <span>↗</span></button></header>
      <div class="stage"><div class="pane baseline"><span class="pane-label">TODAY · ONE GESTURE</span><div class="ground"></div></div><div class="pane candidate"><span class="pane-label">RESTORED VARIETY</span><div class="ground"></div></div><canvas aria-label="${cast.name} animation comparison"></canvas></div>
      <footer class="merchant-footer"><span class="motion-state">Getting ready…</span><span class="contact">Feet planted</span><select class="pose-select" aria-label="Preview ${cast.name} activity"><option value="">Try a pose…</option>${C.activities.map(item => `<option value="${item.id}">${item.label}</option>`).join('')}</select></footer>`;
    this.canvas = article.querySelector('canvas'); this.label = article.querySelector('.motion-state');
    article.querySelector('.inspect').addEventListener('click', () => focus(cast.id));
    this.select = article.querySelector('.pose-select');
    this.select.addEventListener('change', () => { if (this.select.value) cue(this, this.select.value); });
  }
  async load() {
    const slug = NPC_ACTIVITY_CONFIG.merchants[this.cast.id].assetSlug;
    const sources = { idle: C.baselinePath + slug + '.webp' };
    for (const { id } of C.activities) sources[id] = C.activityPath + slug + '-' + id + '.webp';
    const entries = await Promise.all(Object.entries(sources).map(async ([id, src]) => [id, await loadImage(src)]));
    const foot = NPC_ACTIVITY_CONFIG.merchants[this.cast.id].footBottomYAtReferencePx * M.referenceSize / NPC_ACTIVITY_CONFIG.render.referenceCanvasSizePx;
    this.renderer = new PersonalityRenderer(this.canvas, this.cast, this.rig, foot, Object.fromEntries(entries));
    this.element.dataset.ready = 'true'; this.element.dataset.poseCount = String(C.activities.length);
  }
  draw(state, gameSize) {
    const activity = sampleActivity(state.time, this.index, state.mode, this.cue);
    this.renderer.draw(state.time, activity, { compare: state.compare, gameSize: state.size === 'game' ? gameSize : null });
    const name = C.activities.find(item => item.id === activity.activity)?.label;
    const caption = activity.mix > C.activeLabelThreshold ? name : 'Quiet idle';
    if (this.label.textContent !== caption) this.label.textContent = caption;
    this.label.classList.toggle('active', activity.mix > C.activeLabelThreshold);
    this.element.dataset.activity = activity.activity || 'idle';
    if (this.cue && state.time >= this.cue.at + C.actionSeconds) { this.cue = null; this.select.value = ''; }
  }
  destroy() { this.renderer?.destroy(); }
}
