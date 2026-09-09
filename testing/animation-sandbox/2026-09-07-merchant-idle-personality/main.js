import { GAME_CONFIG } from '../../../values/gameConfig.js';
import { NPC_ACTIVITY_CONFIG } from '../../../values/npcActivityConfig.js';
import { MERCHANT_MOTION_CAST } from '../../../values/merchantMotion.js';
import { MERCHANT_MOTION_RIGS } from '../../../values/merchantMotionRigs.js';
import { MERCHANT_IDLE_PERSONALITY as C } from '../../../values/merchantIdlePersonalitySandbox.js';
import { PersonalityCard } from './PersonalityCard.js';

const $ = selector => document.querySelector(selector);
const state = { time: 0, paused: matchMedia('(prefers-reduced-motion: reduce)').matches, compare: false, speed: 1, mode: 'natural', size: 'fit', focus: null };
const grid = $('#merchants'), status = $('#status');
const gameSize = GAME_CONFIG.playerDisplaySizePx * NPC_ACTIVITY_CONFIG.render.displayScale;
for (const { id, label } of C.activities) $('#mode').add(new Option(label, id));
const cards = MERCHANT_MOTION_CAST.map((cast, index) => {
  const card = new PersonalityCard(cast, MERCHANT_MOTION_RIGS[cast.id], index, { focus, cue });
  grid.append(card.element); return card;
});
let stopped = false, frame = 0, previous = performance.now(), frameCount = 0, fpsAt = previous, infoAt = 0;

function focus(id) {
  state.focus = state.focus === id ? null : id;
  document.body.classList.toggle('focused', Boolean(state.focus)); $('#back').hidden = !state.focus;
  cards.forEach(card => { card.element.hidden = Boolean(state.focus && state.focus !== card.cast.id); });
}
function cue(card, activity) {
  card.cue = { activity, at: state.time - (state.paused ? C.fadeInStart + C.fadeInSeconds : 0) };
}
function playback() {
  $('#pause').textContent = state.paused ? 'Play' : 'Pause';
  $('#pause').setAttribute('aria-pressed', String(state.paused));
  $('#time-status').textContent = state.paused ? 'Paused' : 'Playing';
  document.body.dataset.paused = String(state.paused);
}
function replay() {
  state.time = 0; state.paused = false;
  cards.forEach(card => { card.cue = null; card.select.value = ''; });
  playback();
}
function seek(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return;
  state.time = Math.floor(state.time / C.cycleSeconds) * C.cycleSeconds + Math.max(0, Math.min(C.cycleSeconds - C.scrubEndEpsilon, parsed));
  state.paused = true; cards.forEach(card => { card.cue = null; card.select.value = ''; }); playback();
}
$('#pause').addEventListener('click', () => { state.paused = !state.paused; playback(); });
$('#replay').addEventListener('click', replay);
$('#mode').addEventListener('change', event => {
  state.mode = event.target.value;
  state.time = state.paused ? C.firstActivity + C.previewStagger * (cards.length - 1) + C.fadeInStart + C.fadeInSeconds : 0;
  cards.forEach(card => { card.cue = null; card.select.value = ''; });
});
$('#speed').addEventListener('change', event => { state.speed = Number(event.target.value); });
$('#size').addEventListener('change', event => { state.size = event.target.value; });
$('#background').addEventListener('change', event => { document.body.dataset.background = event.target.value; });
$('#compare').addEventListener('click', () => {
  state.compare = !state.compare; grid.classList.toggle('compare', state.compare);
  $('#compare').setAttribute('aria-pressed', String(state.compare));
  $('#compare').textContent = state.compare ? 'Show restored only' : 'Compare with today';
});
$('#back').addEventListener('click', () => focus(null));
$('#timeline').addEventListener('input', event => seek(event.target.value));
$('#seconds').addEventListener('input', event => seek(event.target.value));
document.addEventListener('keydown', event => {
  if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(document.activeElement?.tagName)) return;
  if (event.code === 'Space') { event.preventDefault(); state.paused = !state.paused; playback(); }
  if (event.code === 'Escape') focus(null);
});
document.addEventListener('visibilitychange', () => { previous = performance.now(); });
window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  stopped = true; cancelAnimationFrame(frame); cards.forEach(card => card.destroy());
});
function fail(error) {
  stopped = true; cancelAnimationFrame(frame);
  status.textContent = error.message; status.classList.add('error'); document.body.dataset.error = error.message;
  console.error(error);
}
function tick(now) {
  if (stopped) return;
  const delta = Math.max(0, Math.min((now - previous) / C.millisecondsPerSecond, C.maxDeltaSeconds)); previous = now;
  if (!document.hidden) {
    if (!state.paused) state.time += delta * state.speed;
    try { cards.forEach(card => { if (!card.element.hidden) card.draw(state, gameSize); }); } catch (error) { fail(error); return; }
    frameCount++;
    if (now - infoAt > C.infoIntervalMs) {
      const time = state.time % C.cycleSeconds;
      if (document.activeElement !== $('#timeline')) $('#timeline').value = String(time);
      if (document.activeElement !== $('#seconds')) $('#seconds').value = time.toFixed(2);
      document.body.dataset.time = state.time.toFixed(3); infoAt = now;
    }
    if (now - fpsAt > C.fpsIntervalMs) { $('#fps').textContent = Math.round(frameCount * C.millisecondsPerSecond / (now - fpsAt)) + ' fps'; frameCount = 0; fpsAt = now; }
  }
  frame = requestAnimationFrame(tick);
}
playback();
$('#actual-size').textContent = 'Game size: ' + gameSize.toFixed(1) + ' px sprite square';
try {
  const results = await Promise.allSettled(cards.map(card => card.load()));
  const failure = results.find(result => result.status === 'rejected');
  if (failure) { cards.forEach(card => card.destroy()); throw failure.reason; }
  status.textContent = '6 merchants · 42 recovered poses';
  document.body.dataset.ready = 'true'; previous = performance.now(); frame = requestAnimationFrame(tick);
} catch (error) { fail(error); }
