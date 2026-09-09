// Keeps this trigger proposal's review separate from the immutable earlier review receipts.
export function createTriggerDecisions(config, lines, currentMoment) {
  const el = id => document.getElementById(id);
  const qa = new URLSearchParams(location.search).has('qa');
  let answers = {};
  try {
    const saved = qa ? null : JSON.parse(localStorage.getItem(config.storageKey) || 'null');
    if (saved?.version === config.version && saved?.catalogHash === config.catalogHash && saved?.policy === JSON.stringify(config.timing)) answers = saved.answers || {};
  } catch { el('save-status').textContent = 'Browser storage unavailable. Download the decisions before leaving.'; }

  function validAnswer(m) {
    const answer = answers[m.id];
    return answer?.proposal === JSON.stringify(m) && ['yes', 'no', 'pending'].includes(answer.decision) ? answer : { decision: 'pending', note: '' };
  }

  function receipt() {
    return { id: config.id, version: config.version, catalogHash: config.catalogHash,
      reviewOnly: true, scope: 'Broader families, situations and draft wording only; no generation or gameplay authorization',
      policy: config.timing, decisions: config.moments.map((m, index) => ({
        triggerId: `B${String(index + 1).padStart(2, '0')}`, group: m.id, title: m.title,
        scriptId: m.line, text: lines.get(m.line).text, ...validAnswer(m),
        // Store the readable object in exported receipts; local storage retains its exact fingerprint.
        proposal: m
      })) };
  }

  function totals() {
    const list = config.moments.map(validAnswer);
    const yes = list.filter(a => a.decision === 'yes').length;
    const no = list.filter(a => a.decision === 'no').length;
    return { yes, no, pending: list.length - yes - no };
  }

  function render(m) {
    const answer = validAnswer(m);
    el('yes').setAttribute('aria-pressed', String(answer.decision === 'yes'));
    el('no').setAttribute('aria-pressed', String(answer.decision === 'no'));
    el('note').value = answer.note;
    el('verdict-state').textContent = answer.decision === 'yes' ? 'Yes · this proposed trigger works.' : answer.decision === 'no' ? 'No · rework this proposed trigger.' : 'Not reviewed';
    const t = totals();
    el('review-count').textContent = `${t.yes} yes · ${t.no} no · ${t.pending} to review`;
  }

  function save(decision, refresh = true) {
    const m = currentMoment();
    answers[m.id] = { proposal: JSON.stringify(m), decision: decision || validAnswer(m).decision, note: el('note').value };
    try {
      if (!qa) localStorage.setItem(config.storageKey, JSON.stringify({ version: config.version, catalogHash: config.catalogHash, policy: JSON.stringify(config.timing), answers }));
      el('save-status').textContent = qa ? 'QA mode: test choices are not saved.' : 'Trigger decisions saved in this browser. The earlier review receipts is unchanged.';
    } catch { el('save-status').textContent = 'Browser storage unavailable. Download your decisions.'; }
    if (refresh) render(m);
  }

  function prepare() {
    const data = receipt();
    const t = totals();
    const reviewed = data.decisions.filter(d => d.decision !== 'pending' || d.note);
    el('reply').value = [`Leo broader-trigger mockup v2: ${t.yes} yes, ${t.no} no, ${t.pending} pending.`,
      ...reviewed.map(d => `${d.triggerId} ${d.title}: ${d.decision.toUpperCase()}${d.note ? ` — ${d.note}` : ''}`),
      'These decisions concern the trigger proposal. No generation requested.'].join('\n');
    el('reply-label').hidden = false;
    el('reply').focus();
    el('reply').select();
  }

  el('yes').addEventListener('click', () => save(validAnswer(currentMoment()).decision === 'yes' ? 'pending' : 'yes'));
  el('no').addEventListener('click', () => save(validAnswer(currentMoment()).decision === 'no' ? 'pending' : 'no'));
  el('note').addEventListener('input', () => save(undefined, false));
  el('prepare').addEventListener('click', prepare);
  el('export').addEventListener('click', () => {
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([JSON.stringify(receipt(), null, 2)], { type: 'application/json' }));
    link.href = url; link.download = config.exportName; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  });
  el('save-status').textContent = qa ? 'QA mode: test choices are not saved.' : 'Your trigger choices stay in this browser. Download them to return the full review.';
  return { render };
}
