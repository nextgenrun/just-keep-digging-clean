import { createMixPreview } from "./mix-preview.js";
const data = window.LEO_LIBRARY_REVIEW;
const { lines, groups, persona, policy } = data;
const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const params = new URLSearchParams(location.search);
const qa = params.has("qa");
const persistQa = params.get("qa") === "storage";
const storageKey = policy.review.storageKey + (persistQa ? "-qa-only" : "");
const byId = new Map(lines.map(line => [line.id, line]));
const byGroup = new Map(groups.map(group => [group.id, group]));
let state = {decisions:{}, notes:{}, overall:"", resumeId:lines[0].id};
let index = 0;
function readDecisions(saved) {
  if (saved.libraryId !== policy.libraryId || saved.schemaVersion !== policy.review.schemaVersion) throw Error("This file belongs to a different review.");
  const next = {decisions:{},notes:{},overall:String(saved.overall || "").slice(0,policy.review.maximumNoteCharacters),resumeId:saved.resumeId};
  let changed = 0;
  for (const record of saved.lines || []) {
    const line = byId.get(record.id);
    if (!line) continue;
    if (record.fingerprint !== line.fingerprint) { changed++; continue; }
    if (["yes","no","pending"].includes(record.decision)) next.decisions[line.id] = record.decision;
    next.notes[line.id] = String(record.note || "").slice(0,policy.review.maximumNoteCharacters);
  }
  return {next,changed};
}
try {
  if (!qa || persistQa) {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (saved) state = readDecisions(saved).next;
  }
} catch { $("storage-status").textContent = "Saved data could not be read. Download decisions as a backup after reviewing."; }
$("persona-name").textContent = persona.name;
$("persona-premise").textContent = persona.premise;
$("persona-boundary").textContent = persona.canonBoundary;
$("persona-traits").innerHTML = persona.traits.map(t => "<li>"+esc(t)+"</li>").join("");
$("persona-delivery").innerHTML = persona.deliveryRules.map(t => "<li>"+esc(t)+"</li>").join("");
for (const group of groups) {
  const option = document.createElement("option");
  option.value = group.id; option.textContent = group.title; $("group-filter").append(option);
}
$("overall-note").value = state.overall;
index = Math.max(0, lines.findIndex(line => line.id === state.resumeId));
const mix = createMixPreview(data, qa);
function filtered() {
  const group = $("group-filter").value, decision = $("decision-filter").value;
  const search = $("search").value.trim().toLowerCase();
  return lines.filter(line => (!group || line.group === group)
    && (!decision || (state.decisions[line.id] || "pending") === decision)
    && (!search || [line.id,line.text,line.emotion,line.flavour,byGroup.get(line.group).title].join(" ").toLowerCase().includes(search)));
}
function pageSize() { return $("view-mode").value === "single" ? 1 : policy.review.pageSize; }
function exportData() {
  return {schemaVersion:policy.review.schemaVersion,libraryId:policy.libraryId,catalogHash:data.sourceHash,
    reviewScope:"script, emotional intention and exact trigger; no runtime integration",overall:state.overall,resumeId:state.resumeId,
    lines:lines.map(line => ({id:line.id,text:line.text,group:line.group,fingerprint:line.fingerprint,
      decision:state.decisions[line.id] || "pending",note:state.notes[line.id] || ""}))};
}
function save() {
  if (qa && !persistQa) { $("storage-status").textContent = "QA preview: choices are not saved; audio output is muted."; return; }
  try { localStorage.setItem(storageKey,JSON.stringify(exportData())); }
  catch { $("storage-status").textContent = "Browser storage unavailable. Download your decisions before closing."; }
}
function card(line) {
  const group = byGroup.get(line.group), decision = state.decisions[line.id] || "pending";
  const audio = line.audio.length ? '<div class="audio-buttons">'+line.audio.map((take,i) =>
    '<button data-listen="'+line.id+'" data-take="'+i+'" aria-label="Play '+line.id+' '+esc(take.label)+'">'+esc(take.label)+' · '+take.duration.toFixed(1)+'s</button>').join("")+'</div>'
    : '<p class="audio-note">'+(decision==="yes"?"Approved script; recording pending.":decision==="no"?"Rejected; excluded from recording.":"Script awaiting your yes/no audit; no recording yet.")+'</p>';
  return '<article tabindex="0" class="card '+decision+'" id="card-'+line.id+'"><div class="card-top"><strong>'+line.id+'</strong><span>'+esc(group.title)+'</span></div>'
    +'<blockquote>“'+esc(line.text)+'”</blockquote><p class="mood">'+esc(line.emotion)+' · '+esc(line.flavour.replaceAll("-"," "))+' · '+line.wordCount+' words</p>'+audio
    +'<div class="moment"><strong>'+(group.type==="random"?"Quiet moment":"What the player notices")+'</strong><p>'+esc(group.visibleCue)+'</p></div>'
    +'<p class="condition">'+esc(group.condition)+'</p>'+(line.requires?.daylight?'<p class="requirements">This line requires actual daylight.</p>':"")
    +'<details><summary>Must stay silent when…</summary><p>'+esc(group.exclude)+'</p><p>'+esc(group.admission)+'. '+(group.maxAgeMs?'Start within '+(group.maxAgeMs/1000)+' seconds of this eligible moment, or discard it.':'No queued random lines.')+'</p><p>All shared voice, safety, rarity and quiet-gap rules apply.</p></details>'
    +'<div class="votes"><button class="yes-button" data-vote="'+line.id+'" data-value="yes" aria-label="Yes '+line.id+'" aria-pressed="'+(decision==="yes")+'">Yes — keep</button>'
    +'<button class="no-button" data-vote="'+line.id+'" data-value="no" aria-label="No '+line.id+'" aria-pressed="'+(decision==="no")+'">No — reject</button><button data-vote="'+line.id+'" data-value="pending" aria-label="Reset '+line.id+'">Reset</button></div>'
    +'<p class="decision-label">Your decision: '+esc(decision)+'</p><details '+(state.notes[line.id]?"open":"")+'><summary>Optional note</summary><textarea data-note="'+line.id+'" aria-label="Note '+line.id+'" rows="2" maxlength="'+policy.review.maximumNoteCharacters+'">'+esc(state.notes[line.id] || "")+'</textarea></details></article>';
}
function render() {
  const list = filtered(), size = pageSize();
  index = Math.max(0,Math.min(index,Math.max(0,list.length-1)));
  const shown = list.slice(index,index+size);
  if (shown.length) state.resumeId = shown[0].id;
  const yes = lines.filter(line => state.decisions[line.id]==="yes").length;
  const no = lines.filter(line => state.decisions[line.id]==="no").length;
  $("totals").textContent = yes+" yes · "+no+" no · "+(lines.length-yes-no)+" left";
  $("audit-progress").value = yes+no;
  $("cards").classList.toggle("page",size>1);
  $("cards").innerHTML = shown.length ? shown.map(card).join("") : '<p class="panel">No lines match these filters.</p>';
  $("page-status").textContent = list.length ? (index+1)+(shown.length>1?"–"+(index+shown.length):"")+" of "+list.length+" in this selection" : "0 matching lines";
  $("previous").disabled = index===0; $("next").disabled = index+size>=list.length;
  for (const option of $("group-filter").options) {
    if (!option.value) continue;
    const groupLines=lines.filter(l=>l.group===option.value),done=groupLines.filter(l=>["yes","no"].includes(state.decisions[l.id])).length;
    option.textContent=byGroup.get(option.value).title+" · "+done+"/"+groupLines.length;
  }
}
function vote(id,value) {
  if (!byId.has(id) || !["yes","no","pending"].includes(value)) return;
  const hadFocus=$("cards").contains(document.activeElement), oldIndex=index;
  state.decisions[id]=value;
  if (pageSize()===1 && value!=="pending") {
    const after=filtered();
    index=after.some(line=>line.id===id) ? Math.min(oldIndex+1,after.length-1) : oldIndex;
  }
  render(); save();
  if(hadFocus && pageSize()===1){const next=document.querySelector(".card");next?.focus({preventScroll:true});next?.scrollIntoView({block:"start"});}
}
$("cards").addEventListener("click",event=>{
  const button=event.target.closest("button");
  if (button?.dataset.vote) vote(button.dataset.vote,button.dataset.value);
  if (button?.dataset.listen) {
    const line=byId.get(button.dataset.listen), take=line.audio[Number(button.dataset.take)];
    mix.requestLine(take.url,line.id+" · "+line.text);
  }
});
$("cards").addEventListener("input",event=>{
  if (!event.target.dataset.note) return;
  state.notes[event.target.dataset.note]=event.target.value.slice(0,policy.review.maximumNoteCharacters); save();
});
for (const id of ["group-filter","decision-filter","view-mode"]) $(id).addEventListener("change",()=>{index=0;render();save();});
$("search").addEventListener("input",()=>{index=0;render();});
$("previous").addEventListener("click",()=>{index=Math.max(0,index-pageSize());render();save();});
$("next").addEventListener("click",()=>{index+=pageSize();render();save();});
$("next-pending").addEventListener("click",()=>{
  $("decision-filter").value="";
  const list=filtered(), after=list.findIndex((l,i)=>i>index && !["yes","no"].includes(state.decisions[l.id]));
  const first=list.findIndex(l=>!["yes","no"].includes(state.decisions[l.id]));
  if (first<0) { $("page-status").textContent="No unreviewed lines in this selection."; return; }
  index=after<0?first:after;render();save();
});
$("overall-note").addEventListener("input",event=>{state.overall=event.target.value;save();});
document.addEventListener("keydown",event=>{
  if (!$("library").contains(event.target) || event.repeat || event.ctrlKey || event.metaKey || event.altKey || pageSize()!==1
    || ["INPUT","TEXTAREA","SELECT"].includes(event.target.tagName)) return;
  const value=({y:"yes",n:"no"})[event.key.toLowerCase()], line=filtered()[index];
  if(value&&line){event.preventDefault();vote(line.id,value);}
});
function prepareReply() {
  const yes=lines.filter(l=>state.decisions[l.id]==="yes"), no=lines.filter(l=>state.decisions[l.id]==="no");
  const notes=lines.filter(l=>state.notes[l.id]);
  $("reply-text").value=["Leo 300-line script and trigger audit",
    "YES ("+yes.length+"): "+(yes.map(l=>l.id).join(", ")||"none yet"),
    "NO ("+no.length+"): "+(no.map(l=>l.id).join(", ")||"none yet"),
    "Unreviewed: "+(lines.length-yes.length-no.length),
    ...notes.map(l=>l.id+" note: "+state.notes[l.id]),
    ...(state.overall?["Overall: "+state.overall]:[]),
    "These are script/trigger decisions. Record accepted new scripts before the final listening pass."].join("\n\n");
  for(const id of ["reply-label","reply-text","copy-reply"])$(id).hidden=false;
}
$("prepare-reply").addEventListener("click",prepareReply);
$("copy-reply").addEventListener("click",async()=>{prepareReply();try{await navigator.clipboard.writeText($("reply-text").value);$("export-status").textContent="Copied. Paste into the conversation.";}catch{$("reply-text").select();$("export-status").textContent="Copy the selected text.";}}); 
$("export-json").addEventListener("click",()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(exportData(),null,2)],{type:"application/json"}));
  const link=document.createElement("a");link.href=url;link.download="leo-300-decisions.json";link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  $("export-status").textContent="Decision backup downloaded.";
});
$("import-json").addEventListener("change",async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try {
    const {next,changed}=readDecisions(JSON.parse(await file.text()));
    state=next;$("overall-note").value=state.overall;
    $("group-filter").value="";$("decision-filter").value="";$("search").value="";
    index=Math.max(0,lines.findIndex(l=>l.id===state.resumeId));render();save();
    $("export-status").textContent="Imported decisions."+(changed?" "+changed+" changed scripts left unreviewed.":"");
  } catch(error) { $("export-status").textContent="Import failed: "+error.message; }
  event.target.value="";
});
render();if(qa)save();
if(persistQa)$("storage-status").textContent="Isolated QA storage test; real review decisions are untouched.";

const submitted = window.LEO_SUBMITTED_REVIEW;
if (submitted) {
  $("submitted-review").hidden = false;
  const counts = submitted.summary.counts;
  const current = submitted.summary.catalogHash === data.sourceHash;
  $("submitted-title").textContent = counts.yes+" lines kept.";
  $("submitted-summary").textContent = counts.yes+" accepted · "+counts.no+" rejected · "+counts.pending+" pending. "
    +counts.acceptedEvent+" event reactions and "+counts.acceptedRandom+" rare random thoughts.";
  $("submitted-audio").textContent = counts.withExistingAudio+" accepted scripts have existing Leo audio. "
    +counts.newRecordingsNeeded+" need recording, followed by a listening pass. Gameplay is unchanged.";
  $("library-stage").textContent = "Your submitted script review is saved. Open the accepted selection below to revisit your choices.";
  $("load-submitted").disabled = !current;
  $("submitted-status").textContent = current
    ? "Loading replaces this browser's choices with your submitted decisions."
    : "This submission belongs to an earlier catalog. Reconcile changed lines before recording.";
  $("load-submitted").addEventListener("click",()=>{
    try {
      const {next,changed}=readDecisions(submitted.review);
      if(changed) throw Error("Submitted conditions have changed; import was not applied.");
      state=next; $("overall-note").value=state.overall;
      $("group-filter").value=""; $("decision-filter").value="yes"; $("search").value="";
      index=0; render(); save();
      $("submitted-status").textContent="Submitted choices loaded. Showing accepted scripts; use Decision to see rejected lines.";
      $("library").scrollIntoView({block:"start"});
    } catch(error) { $("submitted-status").textContent=error.message; }
  });
}
