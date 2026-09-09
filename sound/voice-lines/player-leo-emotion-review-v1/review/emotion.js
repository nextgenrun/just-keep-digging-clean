"use strict";
const {source,original,baseline,manifest}=window.LEO_EMOTION;
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const qa=new URLSearchParams(location.search).has("qa");
const storageKey="understar-leo-emotion-review-20260907";
let state={choices:{},notes:{},overall:""};
try{if(!qa){const saved=JSON.parse(localStorage.getItem(storageKey)||"null");if(saved&&typeof saved==="object")state={...state,...saved};}}catch{}
const groups=new Map(original.groups.map(g=>[g.id,g]));
const records=new Map(manifest.clips.map(c=>[c.id,c]));
const oldRecords=new Map(baseline.clips.filter(c=>c.voice==="leo").map(c=>[c.id,c]));
const player=$("audition-player");
if(qa)player.muted=true;
let epoch=0,sequence=null,currentLabel="";
const trackUrl=(record,old=false)=>(old?"../../player-mystery-review-v1/":"../")+record.audio+"?v="+(record.audioSha256||record.sha256).slice(0,12);
$("stats").innerHTML="<span><strong>Leo</strong> selected voice</span><span><strong>4</strong> performance comparisons</span><span><strong>8</strong> new lines</span><span><strong>"+manifest.clips.length+" / "+source.clips.length+"</strong> takes recorded</span>";
$("recording-status").textContent=manifest.status==="complete"?"Original then expressive: B1, C1, D1, E2. The playlist compresses these moments for review; in the game they would be widely spaced.":"The new recordings are being prepared. Any original buttons play the previous restrained take; unavailable emotion takes are labelled clearly.";
function buttons(clip){
 const fresh=records.get(clip.id),old=oldRecords.get(clip.originalId);
 return (old?'<button data-play="'+clip.id+'" data-original="true" aria-label="Play original '+clip.originalId+'">Original '+clip.originalId+' · '+old.durationSeconds.toFixed(1)+'s</button>':"")+
 (fresh?'<button class="emotive" data-play="'+clip.id+'" aria-label="Play '+clip.id+' emotive"><span class="play-icon" aria-hidden="true"></span>Leo '+clip.id+' · '+fresh.durationSeconds.toFixed(1)+'s</button>':'<button class="draft" disabled>New take awaiting recording</button>');
}
function card(clip){
 const group=groups.get(clip.group),record=records.get(clip.id);
 const options=clip.kind==="same-words"?[["both","Keep both"],["emotive","Prefer emotive"],["original","Prefer original"],["reject","Reject emotive"]]:[["accept","Accept"],["rewrite","Rewrite"],["reject","Reject"]];
 return '<article class="clip emotion-card" id="card-'+clip.id+'"><div class="clip-top"><span class="clip-id">'+clip.id+'</span><span class="emotion-name">'+esc(clip.emotion)+'</span></div><blockquote>“'+esc(clip.text)+'”</blockquote><p class="hint">'+esc(clip.delivery)+'</p>'+(clip.edge&&clip.edge!=="None"?'<p class="edge-label">'+esc(clip.edge)+'</p>':"")+'<div class="plays">'+buttons(clip)+'</div>'+(record?.durationFlag?'<p class="duration-flag">Longer than the 4-second target. Judge its pacing.</p>':"")+'<div class="context-note"><strong>'+esc(group.event).toUpperCase()+'</strong><p>'+esc(clip.conditionOverride||group.condition)+'</p><details><summary>Silence rules and timing</summary><p>'+esc(clip.excludeOverride||group.exclude)+'</p><p>'+esc(group.frequency)+'</p></details></div><p class="review-label">'+(clip.kind==="same-words"?"Performance choice":"Script + performance + condition")+'</p><div class="votes">'+options.map(([value,label])=>'<button data-id="'+clip.id+'" data-choice="'+value+'" aria-label="'+label+' '+clip.id+'" aria-pressed="false">'+label+'</button>').join("")+'<button data-id="'+clip.id+'" data-choice="pending" aria-label="Reset '+clip.id+'">Reset</button></div><p class="clip-status" id="status-'+clip.id+'">Not reviewed</p><details class="notes"><summary>Add a note</summary><textarea rows="2" data-note="'+clip.id+'" aria-label="Notes for '+clip.id+'" placeholder="Delivery, wording or relevance…"></textarea></details></article>';
}
$("performance-cards").innerHTML=source.clips.filter(c=>c.kind==="same-words").map(card).join("");
$("character-cards").innerHTML=source.clips.filter(c=>c.kind==="new-line").map(card).join("");
$("mix-rules").innerHTML=source.performanceMix.rules.map(rule=>"<li>"+esc(rule)+"</li>").join("");
$("direction-notes").value=state.overall;
document.querySelectorAll("[data-note]").forEach(input=>{input.value=state.notes[input.dataset.note]||"";});
function save(){
 if(qa){$("save-status").textContent="QA preview: choices are not saved and playback is muted.";return;}
 try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{$("save-status").textContent="Browser storage is unavailable. Prepare and copy your reply before closing.";}
}
function updateVotes(){
 let count=0;
 source.clips.forEach(clip=>{
  const choice=state.choices[clip.id]||"pending";
  if(choice!=="pending")count++;
  $("card-"+clip.id).classList.toggle("accepted",["accept","both","emotive","original"].includes(choice));
  $("card-"+clip.id).classList.toggle("rejected",choice==="reject");
  $("status-"+clip.id).textContent=choice==="pending"?"Not reviewed":"Your choice: "+choice;
  document.querySelectorAll('[data-id="'+clip.id+'"]').forEach(button=>button.setAttribute("aria-pressed",String(choice!=="pending"&&choice===button.dataset.choice)));
 });
 $("review-count").textContent=count+" / "+source.clips.length+" reviewed";
}
function stop(){epoch++;player.pause();sequence=null;if(Number.isFinite(player.duration))player.currentTime=0;$("playing-status").textContent="Stopped.";}
async function play(record,label,old=false,timeline=null){
 stop();const token=epoch;sequence=timeline;currentLabel=label;player.src=trackUrl(record,old);
 try{await player.play();if(token===epoch)$("playing-status").textContent=label;}
 catch(error){if(token!==epoch||error.name==="AbortError")return;$("playing-status").textContent="Playback could not start. Try the button again.";}
}
document.querySelectorAll("[data-play]").forEach(button=>button.addEventListener("click",()=>{
 const clip=source.clips.find(c=>c.id===button.dataset.play),isOld=button.dataset.original==="true";
 const record=isOld?oldRecords.get(clip.originalId):records.get(clip.id);
 play(record,(isOld?"Original "+clip.originalId:clip.id+" · "+clip.emotion)+" · “"+clip.text+"”",isOld);
}));
for(const [id,kind,label] of [["compare-takes","performance","Original / expressive comparison"],["play-new","character","Eight new character lines"]]){
 const montage=manifest.montages?.[kind];$(id).disabled=!montage;
 $(id).addEventListener("click",()=>{if(montage)play(montage,label,false,montage.timeline);});
}
player.addEventListener("timeupdate",()=>{
 if(player.paused||!sequence)return;
 const item=sequence.find(t=>player.currentTime>=t.startSeconds&&player.currentTime<t.startSeconds+t.durationSeconds);
 $("playing-status").textContent=item?item.id+" · “"+item.text+"”":"Next take…";
});
player.addEventListener("ended",()=>{$("playing-status").textContent="Finished · "+currentLabel;});
player.addEventListener("error",()=>{$("playing-status").textContent="Audio could not load. Use the local review link with its audio folders."});
$("stop-audio").addEventListener("click",stop);
document.querySelectorAll("[data-choice]").forEach(button=>button.addEventListener("click",()=>{state.choices[button.dataset.id]=button.dataset.choice;updateVotes();save();}));
document.querySelectorAll("[data-note]").forEach(input=>input.addEventListener("input",()=>{state.notes[input.dataset.note]=input.value;save();}));
$("direction-notes").addEventListener("input",event=>{state.overall=event.target.value;save();});
function prepare(){
 const lines=["UNDERSTAR — Leo emotion audition","Voice: Leo. Original restrained takes remain eligible.",""];
 source.clips.forEach(clip=>{const choice=state.choices[clip.id]||"pending";if(choice!=="pending"||state.notes[clip.id])lines.push(clip.id+" "+choice.toUpperCase()+' — "'+clip.text+'"'+(state.notes[clip.id]?" | "+state.notes[clip.id]:""));});
 if(lines.length===3)lines.push("No individual decisions yet.");
 if(state.overall)lines.push("","Overall: "+state.overall);
 lines.push("","Design/listening review only; no runtime integration approved.");
 $("reply-text").value=lines.join("\n");
 for(const id of ["reply-label","reply-text","copy-reply"])$(id).hidden=false;
}
$("prepare-reply").addEventListener("click",prepare);
$("copy-reply").addEventListener("click",async()=>{prepare();try{await navigator.clipboard.writeText($("reply-text").value);$("copy-status").textContent="Copied. Paste into the conversation.";}catch{$("reply-text").select();$("copy-status").textContent="Copy the selected reply below.";}});
updateVotes();if(qa)save();
