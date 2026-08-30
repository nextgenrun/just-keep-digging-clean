const SOURCE_URL = "../../../../values/playerVoiceCharacterLeoV1.json";
const MANIFEST_URL = "../2026-08-30-player-character-leo-v1-manifest.json";
const AUDIO_BASE_URL = "../audio/";
const PLAYLIST_GAP_MS = 750;
const SIMULATION_ROLLS = [0.04, 0.92, 0.18, 0.67, 0.31, 0.77, 0.09, 0.55, 0.24, 0.83];

const state = {
  source: null,
  manifest: null,
  visible: [],
  currentId: null,
  playlist: [],
  playlistActive: false,
  playlistTimer: null,
};

const $ = selector => document.querySelector(selector);
const elements = {
  planned: $("#planned-count"), ready: $("#ready-count"), families: $("#family-count"), cost: $("#cost-value"),
  traits: $("#character-traits"), rules: $("#writing-rules"), delivery: $("#character-delivery"),
  anchorCopy: $("#anchor-copy"), playAnchor: $("#play-anchor"), family: $("#family-filter"),
  mode: $("#mode-filter"), search: $("#search-filter"), playFiltered: $("#play-filtered"),
  stop: $("#stop-playback"), simulate: $("#simulate-admission"), player: $("#library-player"),
  pulse: $("#play-pulse"), nowTitle: $("#now-playing-title"), nowCopy: $("#now-playing-copy"),
  policy: $("#policy-card"), simulation: $("#simulation-log"), summary: $("#filter-summary"),
  grid: $("#clip-grid"), template: $("#clip-template"),
};

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function familyById(id) {
  return state.source.families.find(family => family.id === id);
}

function readyIds() {
  return new Set((state.manifest?.clips || []).map(clip => clip.id));
}

function effectivePolicy(family) {
  const mode = state.source.runtime.modes[elements.mode.value];
  return {
    chance: Math.min(1, family.chance * mode.chanceMultiplier),
    cooldownMs: family.cooldownMs / mode.cooldownDivisor,
    quietTailMs: family.quietTailMs / mode.quietTailDivisor,
    queueTtlMs: family.queueTtlMs,
    dedupe: family.dedupe,
  };
}

function duration(ms) {
  if (!ms) return "none";
  if (ms >= 60000) return `${Number((ms / 60000).toFixed(1))} min`;
  return `${Number((ms / 1000).toFixed(1))} sec`;
}

function appendList(list, values) {
  list.replaceChildren(...values.map(value => {
    const item = document.createElement("li");
    item.textContent = value;
    return item;
  }));
}

function populateStaticContent() {
  const source = state.source;
  const providerCharacters = source.clips
    .filter(clip => !clip.reuseFrom)
    .reduce((sum, clip) => sum + clip.text.length, 0);
  const estimate = providerCharacters * source.priceUsdPerMillionCharacters / 1_000_000;
  elements.planned.textContent = source.clips.length;
  elements.ready.textContent = readyIds().size;
  elements.families.textContent = source.families.length;
  elements.cost.textContent = `$${estimate.toFixed(6)}`;
  elements.delivery.textContent = source.character.delivery;
  appendList(elements.traits, source.character.traits);
  appendList(elements.rules, source.character.writingRules);
  source.families.forEach(family => elements.family.add(new Option(family.label, family.id)));
  const anchor = source.clips.find(clip => clip.id === "titan-discovery-01");
  elements.anchorCopy.textContent = anchor.text;
  elements.playAnchor.disabled = !readyIds().has(anchor.id);
  elements.playAnchor.addEventListener("click", () => playClip(anchor));
}

function visibleClips() {
  const family = elements.family.value;
  const query = elements.search.value.trim().toLowerCase();
  return state.source.clips.filter(clip => (
    (family === "all" || clip.family === family)
    && (!query || `${clip.text} ${clip.delivery} ${clip.tags.join(" ")}`.toLowerCase().includes(query))
  ));
}

function clipTitle(clip) {
  return `${familyById(clip.family).label} · LEO · variant ${clip.variant}`;
}

function updatePolicy() {
  const family = familyById(elements.family.value) || familyById("titanDiscovery");
  const policy = effectivePolicy(family);
  const rows = [
    ["Trigger", family.trigger], ["Admission", family.admission],
    ["Effective chance", `${Math.round(policy.chance * 100)}%`],
    ["Cooldown", duration(policy.cooldownMs)], ["Queue lifetime", duration(policy.queueTtlMs)],
    ["Quiet tail", duration(policy.quietTailMs)], ["Dedupe", policy.dedupe],
    ["Channel", "One shared channel; active speech is never interrupted"],
  ];
  const list = document.createElement("dl");
  rows.forEach(([term, value]) => {
    const row = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = term; dd.textContent = value; row.append(dt, dd); list.append(row);
  });
  elements.policy.replaceChildren(list);
}

function render() {
  const playable = readyIds();
  state.visible = visibleClips();
  elements.grid.replaceChildren();
  state.visible.forEach(clip => {
    const fragment = elements.template.content.cloneNode(true);
    const card = fragment.querySelector(".clip-card");
    const ready = playable.has(clip.id);
    card.classList.toggle("playing", state.currentId === clip.id);
    fragment.querySelector(".family-badge").textContent = familyById(clip.family).label;
    const badge = fragment.querySelector(".ready-badge");
    badge.textContent = ready ? (clip.reuseFrom ? "APPROVED TAKE" : "READY") : "PENDING";
    badge.classList.toggle("missing", !ready);
    fragment.querySelector("h3").textContent = clipTitle(clip);
    fragment.querySelector(".transcript").textContent = `“${clip.text}”`;
    fragment.querySelector(".delivery").textContent = clip.delivery;
    fragment.querySelector(".tags").textContent = clip.tags.join(" · ");
    const button = fragment.querySelector(".play-clip");
    button.disabled = !ready;
    button.addEventListener("click", () => playClip(clip));
    elements.grid.append(fragment);
  });
  const playableVisible = state.visible.filter(clip => playable.has(clip.id)).length;
  elements.summary.textContent = `${state.visible.length} shown · ${playableVisible} playable`;
  elements.playFiltered.disabled = playableVisible === 0;
  updatePolicy();
}

function stopPlayback(reset = true) {
  window.clearTimeout(state.playlistTimer);
  state.playlist.length = 0;
  state.playlistActive = false;
  elements.player.pause();
  elements.player.removeAttribute("src");
  elements.player.load();
  state.currentId = null;
  elements.pulse.classList.remove("active");
  if (reset) {
    elements.nowTitle.textContent = "Nothing playing";
    elements.nowCopy.textContent = "The single review channel is idle.";
  }
  render();
}

async function playClip(clip, keepPlaylist = false) {
  if (!keepPlaylist) {
    window.clearTimeout(state.playlistTimer);
    state.playlist.length = 0;
    state.playlistActive = false;
  }
  elements.player.pause();
  state.currentId = clip.id;
  elements.player.src = `${AUDIO_BASE_URL}${encodeURIComponent(clip.file)}`;
  elements.nowTitle.textContent = clipTitle(clip);
  elements.nowCopy.textContent = clip.text;
  elements.pulse.classList.add("active");
  render();
  try { await elements.player.play(); }
  catch (error) { elements.nowTitle.textContent = "Playback failed"; elements.nowCopy.textContent = error.message; }
}

function startPlaylist() {
  const playable = readyIds();
  state.playlist = state.visible.filter(clip => playable.has(clip.id));
  state.playlistActive = state.playlist.length > 0;
  const first = state.playlist.shift();
  if (first) playClip(first, true);
}

function continuePlaylist() {
  state.currentId = null;
  elements.pulse.classList.remove("active");
  if (!state.playlistActive) {
    elements.nowTitle.textContent = "Playback complete";
    elements.nowCopy.textContent = "The single review channel is idle again.";
    render();
    return;
  }
  const next = state.playlist.shift();
  if (!next) {
    state.playlistActive = false;
    elements.nowTitle.textContent = "Sequence complete";
    elements.nowCopy.textContent = "Every line used the same audio element with a 750 ms gap.";
    render();
    return;
  }
  state.playlistTimer = window.setTimeout(() => playClip(next, true), PLAYLIST_GAP_MS);
}

function simulateTriggers() {
  const family = familyById(elements.family.value) || familyById("titanDiscovery");
  const policy = effectivePolicy(family);
  const interval = Math.max(500, family.cooldownMs / 10 || 1000);
  let lastAccepted = Number.NEGATIVE_INFINITY;
  let dedupeSeen = false;
  const items = SIMULATION_ROLLS.map((roll, index) => {
    const now = index * interval;
    let reason = null;
    if (dedupeSeen && policy.dedupe !== "none") reason = `${policy.dedupe} dedupe`;
    else if (now - lastAccepted < policy.cooldownMs) reason = "cooldown";
    else if (roll >= policy.chance) reason = `chance roll ${roll.toFixed(2)}`;
    const admitted = reason === null;
    if (admitted) { lastAccepted = now; dedupeSeen = true; }
    const item = document.createElement("li");
    item.className = admitted ? "admitted" : "dropped";
    const elapsed = now === 0 ? "0 sec" : duration(now);
    item.textContent = `T+${elapsed} · ${admitted ? "admitted" : `dropped by ${reason}`}`;
    return item;
  });
  elements.simulation.replaceChildren(...items);
}

function resetSimulation() {
  const item = document.createElement("li");
  item.textContent = "Select a family and simulate its chance, cooldown, and dedupe policy.";
  elements.simulation.replaceChildren(item);
}

function bind() {
  const refreshPolicySelection = () => {
    resetSimulation();
    render();
  };
  elements.family.addEventListener("change", refreshPolicySelection);
  elements.mode.addEventListener("change", refreshPolicySelection);
  elements.search.addEventListener("input", render);
  elements.playFiltered.addEventListener("click", startPlaylist);
  elements.stop.addEventListener("click", () => stopPlayback());
  elements.simulate.addEventListener("click", simulateTriggers);
  elements.player.addEventListener("ended", continuePlaylist);
  elements.player.addEventListener("error", () => {
    elements.pulse.classList.remove("active");
    elements.nowTitle.textContent = "Audio unavailable";
    elements.nowCopy.textContent = "Refresh after the masked generation batch completes.";
  });
}

async function initialize() {
  try {
    state.source = await fetchJson(SOURCE_URL);
    try { state.manifest = await fetchJson(MANIFEST_URL); } catch (_) { state.manifest = null; }
    populateStaticContent();
    elements.family.value = "titanDiscovery";
    bind();
    render();
  } catch (error) {
    elements.summary.textContent = `Catalog failed to load: ${error.message}`;
  }
}

initialize();
