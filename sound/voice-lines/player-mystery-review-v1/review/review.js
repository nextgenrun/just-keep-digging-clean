"use strict";
const {source, manifest} = window.AUDITION;
const byId = id => document.getElementById(id);
const qa = new URLSearchParams(location.search).has("qa");
const storageKey = "understar-mystery-voice-review-20260907";
let state = {choices:{},notes:{},voice:"undecided",overall:""};
try {
  if (!qa) {
    const restored = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (restored && typeof restored === "object") state = {...state,...restored};
  }
} catch {}
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const allClips = source.groups.flatMap(group => group.clips);
const audioUrl = record => "../" + record.audio + "?v=" + (record.audioSha256 || record.sha256).slice(0,12);
const recordings = new Map(manifest.clips.map(clip => [clip.id + "-" + clip.voice,clip]));
const durations = manifest.clips.map(clip => clip.durationSeconds);
byId("stats").innerHTML = '<span><strong>12</strong> short scripts</span><span><strong>16</strong> real recordings</span><span><strong>4–7</strong> words each</span><span><strong>' + Math.min(...durations).toFixed(1) + '–' + Math.max(...durations).toFixed(1) + ' sec</strong> per recording</span>';
function audioButtons(clip) {
  return manifest.clips.filter(record => record.id === clip.id).map(record => '<button type="button" data-recording="' + clip.id + '-' + record.voice + '" aria-label="Play ' + clip.id + ' in ' + record.voice + '"><span class="play-icon" aria-hidden="true"></span>' + record.voice.toUpperCase() + ' · ' + record.durationSeconds.toFixed(1) + 's</button>').join("");
}
byId("scenarios").innerHTML = source.groups.map(group => '<section class="scenario" id="scenario-' + group.id + '" aria-labelledby="title-' + group.id + '"><div class="scenario-header"><span class="scenario-letter">' + group.id + '</span><div class="scenario-title"><h2 id="title-' + group.id + '">' + escapeHtml(group.title) + '</h2><small>' + escapeHtml(group.event) + '</small></div></div><div class="condition"><div><strong>ONLY WHEN</strong><p>' + escapeHtml(group.condition) + '</p></div><div><strong>STAY SILENT</strong><p>' + escapeHtml(group.exclude) + '</p></div><p class="frequency">' + escapeHtml(group.frequency) + '</p></div><div class="variants">' + group.clips.map(clip => '<article class="clip" id="clip-' + clip.id + '"><div class="clip-top"><span class="clip-id">' + clip.id + '</span><span>' + escapeHtml(clip.style) + '</span></div><blockquote>“' + escapeHtml(clip.text) + '”</blockquote><p class="hint">' + escapeHtml(clip.hint) + '</p><div class="plays">' + audioButtons(clip) + '</div><p class="review-label">Script + proposed condition</p><div class="votes">' + [["accept","Accept"],["reject","Reject"],["pending","Reset"]].map(([choice,label]) => '<button data-id="' + clip.id + '" data-choice="' + choice + '" aria-label="' + label + ' ' + clip.id + '" aria-pressed="false">' + label + '</button>').join("") + '</div><p class="decision-label" id="verdict-' + clip.id + '">Not reviewed</p><details><summary>Add a note</summary><textarea rows="2" data-note="' + clip.id + '" aria-label="Notes for ' + clip.id + '" placeholder="Wording, delivery, clarity, or trigger…"></textarea></details></article>').join("") + '</div></section>').join("");
byId("rules").innerHTML = source.rules.slice(1).map(rule => "<li>" + escapeHtml(rule) + "</li>").join("");
byId("voice-choice").value = state.voice;
byId("overall-notes").value = state.overall;
document.querySelectorAll("[data-note]").forEach(input => {input.value = state.notes[input.dataset.note] || "";});
function save() {
  if (qa) { byId("save-state").textContent = "Test preview: choices are not saved."; return; }
  try { localStorage.setItem(storageKey,JSON.stringify(state)); }
  catch { byId("save-state").textContent = "Browser storage is unavailable. Prepare and copy your reply before closing."; }
}
function updateVotes() {
  let count = 0;
  allClips.forEach(clip => {
    const choice = state.choices[clip.id] || "pending";
    if (choice !== "pending") count++;
    byId("clip-" + clip.id).classList.toggle("accepted",choice === "accept");
    byId("clip-" + clip.id).classList.toggle("rejected",choice === "reject");
    byId("verdict-" + clip.id).textContent = choice === "accept" ? "Accepted for design review" : choice === "reject" ? "Rejected" : "Not reviewed";
    document.querySelectorAll('[data-id="' + clip.id + '"]').forEach(button => button.setAttribute("aria-pressed",String(choice === button.dataset.choice && choice !== "pending")));
  });
  byId("decision-count").textContent = count + " / " + allClips.length + " reviewed";
}
const montageAudio = byId("montage");
const singleAudio = new Audio();
singleAudio.preload = "metadata";
let activeMontage = null;
let currentLabel = "";
let playbackEpoch = 0;
function stopAudio() {
  playbackEpoch++;
  montageAudio.pause(); singleAudio.pause();
  if (Number.isFinite(montageAudio.duration)) montageAudio.currentTime = 0;
  if (Number.isFinite(singleAudio.duration)) singleAudio.currentTime = 0;
  byId("now-playing").textContent = "Stopped.";
}
async function startAudio(player,label) {
  const epoch = playbackEpoch;
  try { await player.play(); if (epoch === playbackEpoch) byId("now-playing").textContent = label; }
  catch (error) {
    if (epoch !== playbackEpoch || error.name === "AbortError") return;
    byId("now-playing").textContent = "Playback could not start. Try the play button again, or open this review in a browser.";
  }
}
document.querySelectorAll("[data-recording]").forEach(button => button.addEventListener("click",() => {
  stopAudio();
  const record = recordings.get(button.dataset.recording);
  singleAudio.src = audioUrl(record);
  currentLabel = record.id + " · " + record.voice.toUpperCase() + " · “" + record.text + "”";
  startAudio(singleAudio,currentLabel);
}));
function playMontage(kind) {
  stopAudio(); activeMontage = manifest.montages[kind];
  montageAudio.src = audioUrl(activeMontage);
  startAudio(montageAudio,kind === "primary" ? "All twelve · Leo" : "Leo / Rex · matched comparison");
}
byId("play-all").addEventListener("click",() => playMontage("primary"));
byId("compare").addEventListener("click",() => playMontage("comparison"));
byId("stop").addEventListener("click",stopAudio);
montageAudio.addEventListener("play",() => singleAudio.pause());
singleAudio.addEventListener("play",() => montageAudio.pause());
montageAudio.addEventListener("timeupdate",() => {
  if (!activeMontage || montageAudio.paused) return;
  const entry = activeMontage.timeline.find(item => montageAudio.currentTime >= item.startSeconds && montageAudio.currentTime < item.startSeconds + item.durationSeconds);
  byId("now-playing").textContent = entry ? entry.id + " · " + entry.voice.toUpperCase() + " · “" + entry.text + "”" : "Next line…";
});
singleAudio.addEventListener("ended",() => {byId("now-playing").textContent = "Finished " + currentLabel;});
montageAudio.addEventListener("ended",() => {byId("now-playing").textContent = "Playlist finished. Review the scripts and conditions below.";});
for (const player of [singleAudio,montageAudio]) player.addEventListener("error",() => {byId("now-playing").textContent = "Audio could not load. Keep the review folder beside its audio folder, or use the local preview link.";});
montageAudio.src = audioUrl(manifest.montages.primary);
document.querySelectorAll("[data-choice]").forEach(button => button.addEventListener("click",() => {
  state.choices[button.dataset.id] = button.dataset.choice; updateVotes(); save();
}));
document.querySelectorAll("[data-note]").forEach(input => input.addEventListener("input",() => {state.notes[input.dataset.note] = input.value; save();}));
byId("voice-choice").addEventListener("change",event => {state.voice = event.target.value; save();});
byId("overall-notes").addEventListener("input",event => {state.overall = event.target.value; save();});
function prepareReply() {
  const lines = ["UNDERSTAR mystery voice audition — design review","Preferred voice: " + state.voice,""];
  allClips.forEach(clip => {
    const choice = state.choices[clip.id] || "pending";
    if (choice !== "pending" || state.notes[clip.id]) lines.push(clip.id + " " + choice.toUpperCase() + ' — "' + clip.text + '"' + (state.notes[clip.id] ? " | " + state.notes[clip.id] : ""));
  });
  if (lines.length === 3) lines.push("No individual decisions yet.");
  if (state.overall) lines.push("","Overall: " + state.overall);
  lines.push("","Accept/reject covers the script and its proposed condition. No game integration approved.");
  byId("reply").value = lines.join("\n");
  for (const id of ["reply","reply-label","copy-reply"]) byId(id).hidden = false;
}
byId("prepare-reply").addEventListener("click",prepareReply);
byId("copy-reply").addEventListener("click",async () => {
  prepareReply();
  try {await navigator.clipboard.writeText(byId("reply").value); byId("copy-state").textContent = "Copied. Paste it into the conversation.";}
  catch {byId("reply").select(); byId("copy-state").textContent = "Select and copy the reply below.";}
});
byId("audio-summary").textContent = "GROK VOICE TTS · LEO + REX · SPEECH ONLY";
updateVotes();
if (qa) save();
