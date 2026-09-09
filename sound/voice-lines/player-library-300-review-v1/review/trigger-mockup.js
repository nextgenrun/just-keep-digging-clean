// Renders approved text and a silent event/caption/music storyboard for review.
import { LEO_TRIGGER_REVIEW as C } from '../../../../values/playerVoiceTriggerReviewV1.js';
import { createTriggerDecisions } from './trigger-decisions.js';

const el = id => document.getElementById(id);
const put = (id, value) => { el(id).textContent = value; };
const seconds = ms => `${ms / 1000} s`;
let current = C.moments.findIndex(m => m.id === C.defaultMoment);
let frames = 0;
let lines;
let decisions;
const moment = () => C.moments[current];
const smooth = n => { const x = Math.max(0, Math.min(1, n)); return x * x * (3 - 2 * x); };

function musicLevel(level) {
  put('music-value', `${Math.round(level * 100)}%`);
  el('music-fill').style.width = `${level * 100}%`;
}

function progress(phase) {
  for (const id of ['event', 'voice', 'music']) el(`step-${id}`).classList.toggle('active', id === phase);
}

function stopPreview() {
  cancelAnimationFrame(frames);
  frames = 0;
  el('stage').dataset.phase = 'ready';
  put('target-label', moment().random ? 'BEFORE THE QUIET OPENING' : 'BEFORE THE EVENT');
  put('event-cue', moment().before);
  put('speaker', 'LEO · WAITING FOR THE MOMENT');
  put('caption', moment().random ? 'A thought needs a quiet opening.' : 'The event comes first.');
  put('preview-status', C.copy.ready);
  put('music-note', '0.9 s down · hold under the sentence · 2.4 s back up');
  musicLevel(1);
  progress('');
}

function renderMoment() {
  const m = moment();
  const line = lines.get(m.line);
  el('moment').value = m.id;
  put('position', `${current + 1} / ${C.moments.length}`);
  put('moment-id', `T${String(current + 1).padStart(2, '0')} · ${m.random ? 'RARE THOUGHT' : 'EVENT REACTION'}`);
  put('line-id', `${line.id} · APPROVED WORDING`);
  put('moment-title', m.title);
  put('script', `“${line.text}”`);
  put('delivery', `${line.emotion} · ${m.delivery}`);
  put('place', m.place);
  put('trigger', m.trigger);
  put('repeat', m.repeat);
  put('change', m.change);
  put('avoid', m.avoid);
  el('context').querySelector('[value=cooldown]').textContent = m.urgent ? 'An urgent warning played 10 seconds ago' : 'Leo spoke 10 seconds ago';
  const start = m.urgent ? 'Immediately; a warning cannot wait for a music fade.' : `About ${seconds(m.delayMs)} after this confirmation.`;
  put('when', m.random ? 'Only inside the quiet opportunity. There is no event to explain.' : `${start} Drop after ${seconds(m.expiryMs)} or as soon as the cue stops being relevant.`);
  el('ore-image').hidden = !m.ore;
  if (m.ore) el('ore-image').src = C.oreImage.replaceAll('{material}', m.id);
  else el('ore-image').removeAttribute('src');
  put('play', m.random ? 'Show quiet opening → Leo thinks' : 'Show event → Leo reacts');
  stopPreview();
  decisions.render(m);
}

function blockedReason(context) {
  if (context === 'npc') return moment().random ? `${C.copy.npc} ${C.copy.randomBlock}` : C.copy.npc;
  if (context === 'stale') return moment().random ? C.copy.randomBlock : C.copy.stale;
  if (context === 'cooldown') return moment().urgent ? 'Silent: an urgent warning just played. Urgent remarks share a 45 s gap.' : C.copy.cooldown;
  if (context === 'muted') return 'Silent: voice volume is muted. No Leo caption or music dip.';
  return '';
}

function playPreview() {
  stopPreview();
  const m = moment();
  const line = lines.get(m.line);
  const context = el('context').value;
  const reason = blockedReason(context);
  put('event-cue', m.cue);
  put('target-label', m.random ? 'QUIET OPENING' : 'VISIBLE CONFIRMATION');
  progress('event');
  if (reason) {
    el('stage').dataset.phase = 'blocked';
    put('speaker', context === 'npc' ? 'NPC / NARRATION · CHANNEL RESERVED' : 'LEO · SILENT');
    put('caption', context === 'npc' ? 'The other voice keeps its moment.' : 'No player remark.');
    put('preview-status', reason);
    if (context === 'npc') { musicLevel(C.timing.duck); put('music-note', C.copy.occupied); }
    return;
  }
  const start = performance.now();
  const voiceEnd = m.delayMs + C.timing.captionMs;
  const riseStart = voiceEnd + C.timing.holdMs;
  const finish = riseStart + C.timing.upMs;
  let lastPhase = '';
  function tick(now) {
    const t = now - start;
    const phase = t < m.delayMs ? 'event' : t < voiceEnd ? 'speaking' : t < finish ? 'restore' : 'finished';
    if (phase !== lastPhase) {
      lastPhase = phase;
      el('stage').dataset.phase = phase;
      if (phase === 'event') { put('preview-status', m.random ? C.copy.randomCue : C.copy.cue); progress('event'); }
      if (phase === 'speaking') {
        put('speaker', `LEO · ${line.emotion.toUpperCase()}`);
        put('caption', `“${line.text}”`);
        put('preview-status', m.random ? C.copy.randomCue : C.copy.speaking);
        progress('voice');
      }
      if (phase === 'restore') { put('preview-status', C.copy.restore); put('speaker', 'LEO · SENTENCE FINISHED'); progress('music'); }
      if (phase === 'finished') { put('preview-status', C.copy.finished); progress(''); }
    }
    const level = t < riseStart ? 1 - (1 - C.timing.duck) * smooth(t / C.timing.downMs)
      : C.timing.duck + (1 - C.timing.duck) * smooth((t - riseStart) / C.timing.upMs);
    musicLevel(level);
    if (t < finish) frames = requestAnimationFrame(tick);
    else frames = 0;
  }
  frames = requestAnimationFrame(tick);
}

function renderCadence() {
  for (const row of C.cadence) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cadence-row';
    button.dataset.result = row.result;
    const time = document.createElement('time');
    time.textContent = row.at;
    const event = document.createElement('span');
    event.className = 'cadence-event';
    const title = document.createElement('strong');
    title.textContent = row.cue;
    const label = document.createElement('small');
    label.textContent = row.result === 'skip' ? 'SILENT' : row.result === 'thought' ? 'RARE THOUGHT' : 'LEO REACTS';
    event.append(title, label);
    const result = document.createElement('span');
    result.className = 'cadence-result';
    result.textContent = row.result === 'skip' ? row.reason : `“${lines.get(row.line).text}”`;
    button.append(time, event, result);
    button.addEventListener('click', () => {
      current = C.moments.findIndex(m => m.id === row.group);
      el('context').value = row.result === 'skip' ? (row.cue.includes('NPC') ? 'npc' : 'cooldown') : 'clear';
      renderMoment();
      // This row's approved alternative remains explicit in the review panel.
      if (row.line !== moment().line) {
        put('preview-status', `Route example uses ${row.line}: “${lines.get(row.line).text}” The panel shows the selected family's main example.`);
      }
      el('review-title').scrollIntoView({ block: 'start', behavior: 'auto' });
    });
    el('cadence').append(button);
  }
}

async function boot() {
  const response = await fetch(C.approvalUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Approved selection could not load (${response.status}).`);
  const approved = await response.json();
  if (approved.catalogHash !== C.catalogHash) throw new Error('Approved catalog changed. Reconcile it before reviewing these triggers.');
  lines = new Map(approved.lines.filter(line => line.decision === 'yes').map(line => [line.id, line]));
  for (const m of C.moments) {
    if (!lines.has(m.line) || lines.get(m.line).group !== m.id || lines.get(m.line).requires) throw new Error(`Invalid or additionally gated example: ${m.line}`);
  }
  for (const row of C.cadence) if (lines.get(row.line)?.group !== row.group) throw new Error(`Invalid route example: ${row.line}`);
  decisions = createTriggerDecisions(C, lines, moment);
  el('moment').replaceChildren(...C.moments.map((m, i) => {
    const option = document.createElement('option'); option.value = m.id;
    option.textContent = `${String(i + 1).padStart(2, '0')} · ${m.title}`; return option;
  }));
  el('moment').disabled = false;
  el('stage').style.backgroundImage = `url("${C.background}")`;
  el('story').hidden = false;
  el('moment').addEventListener('change', () => { current = C.moments.findIndex(m => m.id === el('moment').value); renderMoment(); });
  el('previous').addEventListener('click', () => { current = (current - 1 + C.moments.length) % C.moments.length; renderMoment(); });
  el('next').addEventListener('click', () => { current = (current + 1) % C.moments.length; renderMoment(); });
  el('context').addEventListener('change', stopPreview);
  el('play').addEventListener('click', playPreview);
  el('reset').addEventListener('click', stopPreview);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopPreview(); });
  renderCadence();
  renderMoment();
}

boot().catch(error => {
  el('load-error').hidden = false;
  put('load-error', error.message);
  for (const id of ['play', 'previous', 'next', 'prepare', 'export']) el(id).disabled = true;
});
