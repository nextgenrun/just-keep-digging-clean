import { GAME_CONFIG } from '../../../values/gameConfig.js';
import { NPC_ACTIVITY_CONFIG } from '../../../values/npcActivityConfig.js';
import { MERCHANT_MOTION_CAST, MERCHANT_MOTION_SANDBOX as C } from '../../../values/merchantMotionSandbox.js';
import { MERCHANT_MOTION_RIGS } from '../../../values/merchantMotionSandboxRigs.js';
import { actionAt, modulo } from './rigMath.js';
import { SandboxCard } from './SandboxCard.js';

const $ = selector => document.querySelector(selector);
const state = { time: 0, paused: false, compare: false, speed: 1, mode: 'natural', size: 'fit', focus: null };
const gameSize = GAME_CONFIG.playerDisplaySizePx * NPC_ACTIVITY_CONFIG.render.displayScale;
const grid = $('#merchants'), status = $('#status');
const cards = MERCHANT_MOTION_CAST.map((cast, i) => {
  const card = new SandboxCard(cast, MERCHANT_MOTION_RIGS[cast.id], i, focus);
  grid.append(card.element); return card;
});
let stopped = false, previous = performance.now(), lastInfo = -1, frameCount = 0, fpsAt = previous;
function playback() { cards.forEach(card => card.playback(state)); }
function focus(id) {
  state.focus = state.focus === id ? null : id;
  document.body.classList.toggle('focused', Boolean(state.focus));
  $('#back').hidden = !state.focus;
  cards.forEach(card => { card.element.hidden = Boolean(state.focus && state.focus !== card.cast.id); });
  playback();
}
function togglePause() {
  state.paused = !state.paused;
  $('#pause').textContent = state.paused ? 'Play' : 'Pause';
  $('#pause').setAttribute('aria-pressed', String(state.paused));
  lastInfo = -1; playback();
}
function seek(value) {
  if (!Number.isFinite(value)) return;
  state.time = Math.max(0, Math.min(C.cycleSeconds, value));
  if (!state.paused) togglePause();
  cards.forEach(card => card.seek(state.time));
  lastInfo = -1;
}
$('#pause').addEventListener('click', togglePause);
$('#replay').addEventListener('click', () => {
  state.mode = 'gestures'; state.time = 0; $('#mode').value = 'gestures';
  if (state.paused) togglePause();
  cards.forEach(card => card.seek(0)); lastInfo = -1;
});
$('#mode').addEventListener('change', event => { state.mode = event.target.value; });
$('#speed').addEventListener('change', event => { state.speed = Number(event.target.value); playback(); });
$('#size').addEventListener('change', event => { state.size = event.target.value; });
$('#compare').addEventListener('click', () => {
  state.compare = !state.compare;
  document.body.classList.toggle('compare', state.compare);
  $('#compare').setAttribute('aria-pressed', String(state.compare));
  playback();
});
$('#background').addEventListener('change', event => { document.body.dataset.background = event.target.value; });
$('#timeline').max = String(C.cycleSeconds);
$('#seconds').max = String(C.cycleSeconds);
$('#timeline').addEventListener('input', event => seek(Number(event.target.value)));
$('#seconds').addEventListener('input', event => seek(Number(event.target.value)));
$('#back').addEventListener('click', () => focus(state.focus));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && state.focus) focus(state.focus);
  if (event.code === 'Space' && !['INPUT','SELECT','BUTTON'].includes(event.target.tagName)) { event.preventDefault(); togglePause(); }
});
document.addEventListener('visibilitychange', () => { previous = performance.now(); playback(); });
$('#actual-size').textContent = `${gameSize.toFixed(1)} px at game size`;

const results = await Promise.allSettled(cards.map(card => card.load()));
const ready = results.filter(result => result.status === 'fulfilled').length;
results.forEach((result, index) => {
  if (result.status === 'rejected') {
    console.error(cards[index].cast.id, result.reason);
    cards[index].label.textContent = `Unable to load: ${result.reason.message}`;
    cards[index].element.dataset.error = 'true';
  }
});
status.textContent = `${ready} / ${cards.length} merchants ready`;
status.dataset.ready = String(ready); status.classList.toggle('error', ready !== cards.length);
playback();
function tick(now) {
  if (stopped) return;
  const delta = Math.min((now - previous) / 1000, C.maxDeltaSeconds); previous = now;
  if (!document.hidden) {
    if (!state.paused) state.time += delta * state.speed;
    cards.forEach((card, index) => {
      if (!card.element.hidden) card.draw(state.time, actionAt(state.time, index, state.mode), state.size === 'game' ? gameSize : null);
    });
    frameCount++;
    if (now - fpsAt >= 1000) {
      $('#fps').textContent = `${Math.round(frameCount * 1000 / (now - fpsAt))} fps`;
      frameCount = 0; fpsAt = now;
    }
    if (lastInfo < 0 || Math.abs(state.time - lastInfo) >= C.diagnosticsInterval) {
      const progress = modulo(state.time, C.cycleSeconds);
      if (document.activeElement !== $('#timeline')) $('#timeline').value = String(progress);
      if (document.activeElement !== $('#seconds')) $('#seconds').value = progress.toFixed(2);
      $('#time-status').textContent = state.paused ? 'Paused · scrub to inspect' : 'Playing';
      lastInfo = state.time;
    }
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
window.addEventListener('pagehide', () => { stopped = true; cards.forEach(card => card.destroy()); }, { once: true });
