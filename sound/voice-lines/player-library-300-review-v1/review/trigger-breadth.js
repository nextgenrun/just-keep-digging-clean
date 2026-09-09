// Shows broader gameplay situations with accepted words and explicitly unapproved drafts.
import { LEO_TRIGGER_REVIEW as C } from '../../../../values/playerVoiceTriggerBreadthV2.js';
import { createTriggerDecisions } from './trigger-breadth-decisions.js';

const el = id => document.getElementById(id);
const put = (id, value) => { el(id).textContent = value; };
const seconds = ms => `${ms / 1000} s`;
let current = C.moments.findIndex(m => m.id === C.defaultMoment);
let frames = 0;
let lines;
let decisions;
let activeSituation = 0;
const baseMoment = () => C.moments[current];
const moment = () => {
  const base = baseMoment();
  const selected = base.situations[activeSituation];
  return { ...base, ...selected, id: base.id, urgent: !!selected.urgent, random: !!selected.random, ore: !!selected.oreMaterial };
};
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

function renderSituations() {
  const base = baseMoment();
  el('situations').replaceChildren(...base.situations.map((item, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = item.title;
    button.setAttribute('aria-pressed', String(index === activeSituation));
    button.addEventListener('click', () => { activeSituation = index; renderMoment(); });
    return button;
  }));
  put('case-help', `${base.situations.length} valid situation${base.situations.length === 1 ? '' : 's'} in this family. Select each one to inspect its own cue and sentence. Yes/no covers the whole family.`);
}

function renderMoment() {
  renderSituations();
  const m = moment();
  const line = lines.get(m.line);
  el('moment').value = m.id;
  put('position', `${current + 1} / ${C.moments.length}`);
  put('moment-id', `B${String(current + 1).padStart(2, '0')} · ${m.random ? 'RARE THOUGHT' : 'EVENT REACTION'}`);
  put('line-id', `${line.id} · ${line.decision === 'draft' ? 'NEW DRAFT · NOT YET APPROVED' : 'ACCEPTED WORDS · NEW USAGE PROPOSED'}`);
  el('line-id').classList.toggle('draft', line.decision === 'draft');
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
  if (m.ore) el('ore-image').src = C.oreImage.replaceAll('{material}', m.oreMaterial);
  else el('ore-image').removeAttribute('src');
  put('play', m.random ? 'Show quiet opening → Leo thinks' : 'Show event → Leo reacts');
  stopPreview();
  decisions.render(baseMoment());
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
  C.moments.forEach((family, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'cadence-row coverage-row';
    const number = document.createElement('span'); number.textContent = String(index + 1).padStart(2, '0');
    const title = document.createElement('span'); title.className = 'cadence-event';
    const name = document.createElement('strong'); name.textContent = family.title;
    const count = document.createElement('small'); count.textContent = `${family.situations.length} RELEVANT SITUATION${family.situations.length === 1 ? '' : 'S'}`;
    title.append(name, count);
    const cases = document.createElement('span'); cases.className = 'cadence-result';
    cases.textContent = family.situations.map(item => item.title).join(' · ');
    button.append(number, title, cases);
    button.addEventListener('click', () => {
      current = index; activeSituation = 0; el('context').value = 'clear'; renderMoment();
      el('review-title').scrollIntoView({ block: 'start', behavior: 'auto' });
    });
    el('cadence').append(button);
  });
}

async function boot() {
  const response = await fetch(C.approvalUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Approved selection could not load (${response.status}).`);
  const approved = await response.json();
  if (approved.catalogHash !== C.catalogHash) throw new Error('Approved catalog changed. Reconcile it before reviewing these triggers.');
  lines = new Map(approved.lines.filter(line => line.decision === 'yes').map(line => [line.id, line]));
  for (const draft of C.draftLines) {
    if (lines.has(draft.id) || draft.decision !== 'draft') throw new Error('Draft ID conflicts with an accepted script.');
    lines.set(draft.id, draft);
  }
  for (const family of C.moments) {
    for (const item of family.situations) {
      const line = lines.get(item.line);
      if (!line || !['yes', 'draft'].includes(line.decision) || line.requires || line.text !== item.script.text || line.emotion !== item.script.emotion || line.decision !== item.script.decision) throw new Error(`Invalid example: ${item.line}`);
    }
  }
  decisions = createTriggerDecisions(C, lines, baseMoment);
  el('moment').replaceChildren(...C.moments.map((m, i) => {
    const option = document.createElement('option'); option.value = m.id;
    option.textContent = `${String(i + 1).padStart(2, '0')} · ${m.title}`; return option;
  }));
  el('moment').disabled = false;
  el('stage').style.backgroundImage = `url("${C.background}")`;
  el('story').hidden = false;
  el('moment').addEventListener('change', () => { activeSituation = 0; current = C.moments.findIndex(m => m.id === el('moment').value); renderMoment(); });
  el('previous').addEventListener('click', () => { activeSituation = 0; current = (current - 1 + C.moments.length) % C.moments.length; renderMoment(); });
  el('next').addEventListener('click', () => { activeSituation = 0; current = (current + 1) % C.moments.length; renderMoment(); });
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
