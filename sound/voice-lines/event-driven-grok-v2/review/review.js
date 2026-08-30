const SOURCE_URL = "../2026-08-30-event-voice-library-v2-source.json";
const MANIFEST_URL = "../2026-08-30-event-voice-library-v2-manifest.json";
const AUDIO_BASE_URL = "../audio/";
const PLAYLIST_GAP_MS = 750;
const RAPID_TRIGGER_COUNT = 5;

const state = {
  source: null,
  manifest: null,
  visibleClips: [],
  currentClipId: null,
  playlist: [],
  playlistTimer: null,
};

const elements = {
  plannedCount: document.querySelector("#planned-count"),
  readyCount: document.querySelector("#ready-count"),
  familyCount: document.querySelector("#family-count"),
  costValue: document.querySelector("#cost-value"),
  familyFilter: document.querySelector("#family-filter"),
  voiceFilter: document.querySelector("#voice-filter"),
  searchFilter: document.querySelector("#search-filter"),
  playFiltered: document.querySelector("#play-filtered"),
  stopPlayback: document.querySelector("#stop-playback"),
  simulateAdmission: document.querySelector("#simulate-admission"),
  player: document.querySelector("#library-player"),
  playPulse: document.querySelector("#play-pulse"),
  nowPlayingTitle: document.querySelector("#now-playing-title"),
  nowPlayingCopy: document.querySelector("#now-playing-copy"),
  policyCard: document.querySelector("#policy-card"),
  simulationLog: document.querySelector("#simulation-log"),
  filterSummary: document.querySelector("#filter-summary"),
  clipGrid: document.querySelector("#clip-grid"),
  clipTemplate: document.querySelector("#clip-template"),
};

async function fetchOptionalJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function familyById(id) {
  return state.source.families.find(family => family.id === id);
}

function generatedClipIds() {
  return new Set((state.manifest?.clips || []).map(clip => clip.id));
}

function formatDuration(ms) {
  if (!ms) return "Once-only or immediate rule";
  if (ms >= 60000) return `${Math.round(ms / 60000)} min`;
  return `${Math.round(ms / 1000)} sec`;
}

function populateFilters() {
  for (const family of state.source.families) {
    const option = new Option(family.label, family.id);
    elements.familyFilter.add(option);
  }
  for (const voice of state.source.voices) {
    elements.voiceFilter.add(new Option(voice.toUpperCase(), voice));
  }
}

function updateMetrics() {
  const ready = generatedClipIds().size;
  const characters = state.source.clips.reduce((sum, clip) => sum + clip.text.length, 0);
  const cost = characters * state.source.priceUsdPerMillionCharacters / 1_000_000;
  elements.plannedCount.textContent = state.source.clips.length;
  elements.readyCount.textContent = ready;
  elements.familyCount.textContent = state.source.families.length - 1;
  elements.costValue.textContent = `$${cost.toFixed(4)}`;
}

function updatePolicy() {
  const selectedId = elements.familyFilter.value;
  const family = familyById(selectedId) || state.source.families[1];
  const rows = [
    ["Trigger", family.trigger],
    ["Admission", family.admission],
    ["Cooldown", formatDuration(family.cooldownMs)],
    ["Queue lifetime", family.queueTtlMs ? formatDuration(family.queueTtlMs) : "Never queued"],
    ["Ambient quiet tail", formatDuration(family.quietTailMs)],
    ["Priority", String(family.priority)],
  ];
  const list = document.createElement("dl");
  for (const [term, value] of rows) {
    const row = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = value;
    row.append(dt, dd);
    list.append(row);
  }
  elements.policyCard.replaceChildren(list);
}

function filteredClips() {
  const family = elements.familyFilter.value;
  const voice = elements.voiceFilter.value;
  const search = elements.searchFilter.value.trim().toLowerCase();
  return state.source.clips.filter(clip => (
    (family === "all" || clip.family === family)
    && (voice === "all" || clip.voice === voice)
    && (!search || `${clip.text} ${clip.speaker} ${clip.delivery}`.toLowerCase().includes(search))
  ));
}

function clipTitle(clip) {
  const family = familyById(clip.family);
  return `${family.label} · ${clip.voice.toUpperCase()} · variant ${clip.variant}`;
}

function renderLibrary() {
  const readyIds = generatedClipIds();
  state.visibleClips = filteredClips();
  elements.clipGrid.replaceChildren();
  for (const clip of state.visibleClips) {
    const fragment = elements.clipTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".clip-card");
    const ready = readyIds.has(clip.id);
    card.dataset.clipId = clip.id;
    card.classList.toggle("playing", state.currentClipId === clip.id);
    fragment.querySelector(".family-badge").textContent = familyById(clip.family).label;
    const readyBadge = fragment.querySelector(".ready-badge");
    readyBadge.textContent = ready ? "READY" : "PENDING";
    readyBadge.classList.toggle("missing", !ready);
    fragment.querySelector("h3").textContent = clipTitle(clip);
    fragment.querySelector(".transcript").textContent = `“${clip.text}”`;
    fragment.querySelector(".voice").textContent = clip.voice.toUpperCase();
    fragment.querySelector(".speaker").textContent = clip.speaker;
    fragment.querySelector(".delivery").textContent = clip.delivery;
    const button = fragment.querySelector(".play-clip");
    button.disabled = !ready;
    button.addEventListener("click", () => playClip(clip));
    elements.clipGrid.append(fragment);
  }
  const readyVisible = state.visibleClips.filter(clip => readyIds.has(clip.id)).length;
  elements.filterSummary.textContent = `${state.visibleClips.length} shown · ${readyVisible} playable`;
  elements.playFiltered.disabled = readyVisible === 0;
  updatePolicy();
}

function stopPlayback(resetCopy = true) {
  window.clearTimeout(state.playlistTimer);
  state.playlist.length = 0;
  elements.player.pause();
  elements.player.removeAttribute("src");
  elements.player.load();
  state.currentClipId = null;
  elements.playPulse.classList.remove("active");
  if (resetCopy) {
    elements.nowPlayingTitle.textContent = "Nothing playing";
    elements.nowPlayingCopy.textContent = "The audition player is idle; gameplay runtime state is untouched.";
  }
  renderLibrary();
}

async function playClip(clip, preservePlaylist = false) {
  if (!preservePlaylist) {
    window.clearTimeout(state.playlistTimer);
    state.playlist.length = 0;
  }
  elements.player.pause();
  state.currentClipId = clip.id;
  elements.player.src = `${AUDIO_BASE_URL}${encodeURIComponent(clip.file)}`;
  elements.nowPlayingTitle.textContent = clipTitle(clip);
  elements.nowPlayingCopy.textContent = clip.text;
  elements.playPulse.classList.add("active");
  renderLibrary();
  try {
    await elements.player.play();
  } catch (error) {
    elements.nowPlayingTitle.textContent = "Playback failed";
    elements.nowPlayingCopy.textContent = error.message;
    elements.playPulse.classList.remove("active");
  }
}

function startFilteredPlaylist() {
  const readyIds = generatedClipIds();
  state.playlist = state.visibleClips.filter(clip => readyIds.has(clip.id));
  const first = state.playlist.shift();
  if (first) playClip(first, true);
}

function continuePlaylist() {
  state.currentClipId = null;
  elements.playPulse.classList.remove("active");
  const next = state.playlist.shift();
  if (!next) {
    elements.nowPlayingTitle.textContent = "Sequence complete";
    elements.nowPlayingCopy.textContent = "Every candidate used the same single audio channel with a 750 ms gap.";
    renderLibrary();
    return;
  }
  state.playlistTimer = window.setTimeout(() => playClip(next, true), PLAYLIST_GAP_MS);
}

function simulateRapidTriggers() {
  const selectedId = elements.familyFilter.value === "all"
    ? "earthquakeWarning"
    : elements.familyFilter.value;
  const family = familyById(selectedId);
  elements.simulationLog.replaceChildren();
  for (let index = 0; index < RAPID_TRIGGER_COUNT; index += 1) {
    const item = document.createElement("li");
    const admitted = index === 0 && family.id !== "voiceCasting";
    item.className = admitted ? "admitted" : "dropped";
    item.textContent = admitted
      ? `Request ${index + 1}: admitted to the single channel.`
      : `Request ${index + 1}: rejected by ${family.cooldownMs ? "cooldown/deduplication" : "once-only or review-only admission"}.`;
    elements.simulationLog.append(item);
  }
}

function bindControls() {
  const refresh = () => renderLibrary();
  elements.familyFilter.addEventListener("change", refresh);
  elements.voiceFilter.addEventListener("change", refresh);
  elements.searchFilter.addEventListener("input", refresh);
  elements.playFiltered.addEventListener("click", startFilteredPlaylist);
  elements.stopPlayback.addEventListener("click", () => stopPlayback());
  elements.simulateAdmission.addEventListener("click", simulateRapidTriggers);
  elements.player.addEventListener("ended", continuePlaylist);
  elements.player.addEventListener("error", () => {
    elements.playPulse.classList.remove("active");
    elements.nowPlayingTitle.textContent = "Audio asset unavailable";
    elements.nowPlayingCopy.textContent = "Refresh after generation completes, then try again.";
  });
}

async function initialize() {
  try {
    state.source = await fetchOptionalJson(SOURCE_URL);
    try { state.manifest = await fetchOptionalJson(MANIFEST_URL); } catch (_) { state.manifest = null; }
    populateFilters();
    updateMetrics();
    bindControls();
    renderLibrary();
  } catch (error) {
    elements.filterSummary.textContent = `Catalog failed to load: ${error.message}`;
  }
}

initialize();
