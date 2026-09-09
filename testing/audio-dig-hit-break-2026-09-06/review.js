import { DIG_AUDIO_REVIEW as C } from "../../values/audioDigHitBreakReview.js";
import { createAuditPlayer } from "./player.js";
const $=id=>document.getElementById(id);
const catalog=await(await fetch("catalog.json",{cache:"no-store"})).json();
const sources=[...catalog.sources].sort((a,b)=>C.sourceOrder.indexOf(a.assetId)-C.sourceOrder.indexOf(b.assetId));
const label=s=>C.sourceLabels[s.assetId] || s.assetId;
function stored(key){try{const value=JSON.parse(localStorage.getItem(key)||"{}");return value && typeof value==="object" && !Array.isArray(value)?value:{};}catch{return {};}}
let storageFailed=false;
let decisions=stored(C.decisionStore), notes=stored(C.noteStore), selected=sources[0], player=null, contexts=[], noteDirty=false;
const choice=s=>["keep","reject"].includes(decisions[s.id])?decisions[s.id]:"open";
function persist(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{storageFailed=true;$("save-state").textContent="Storage unavailable — export before leaving.";return false;}}
function progress(){
 const reviewed=sources.filter(s=>choice(s)!=="open").length;
 $("summary").textContent=`${sources.length} recordings · ${catalog.routeCount} routing cases · ${reviewed} / ${sources.length} reviewed`;
}
function filtered(){return sources.filter(s=>$("filter").value==="all" || ($("filter").value==="flagged" ? s.measurement.flags.length : choice(s)===$("filter").value));}
function list(){
 $("list").replaceChildren();
 for(const source of filtered()){
  const b=document.createElement("button");b.setAttribute("aria-current",String(source.id===selected.id));
  b.textContent=`${String(sources.indexOf(source)+1).padStart(2,"0")} · ${label(source)}`;
  const small=document.createElement("small");small.textContent=`${choice(source)==="open"?"Unreviewed":choice(source).toUpperCase()} · ${Math.round(source.measurement.bufferMs)} ms${source.measurement.flags.length?" · check":""}`;b.append(small);
  b.onclick=()=>select(source);$("list").append(b);
 } progress();
}
function saveNote(){
 if(!noteDirty)return;
 const record={note:$("note").value,issues:[...$("issues").querySelectorAll("input:checked")].map(i=>i.value),contextId:$("context").value,updatedAt:new Date().toISOString()};
 notes={...stored(C.noteStore),...(storageFailed?notes:{}),[selected.id]:record};
 if(persist(C.noteStore,notes)){noteDirty=false;$("save-state").textContent="Note saved";}
}
function event(){return contexts.find(r=>r.id===$("context").value)?.events.find(e=>e.sourceId===selected.id);}
function metrics(){
 const e=event(), m=selected.measurement;
 if(!e)return;
 const peak=20*Math.log10(Math.max(1e-9,m.peak*e.outputGain));
 $("metrics").textContent=`${Math.round(m.bufferMs/e.rate)} ms playback · ${Math.round(m.attackMs/e.rate)} ms to main body · rate ${e.rate.toFixed(2)}× · estimated peak ${peak.toFixed(1)} dBFS`;
 $("route-note").textContent=`Current output gain ${e.outputGain.toFixed(4)}. ${contexts.find(r=>r.id===$("context").value)?.gated?"This material is gated to the Level Two review profile.":""}`;
}
function select(source){
 saveNote();player?.stop();$("card").hidden=false;selected=source;noteDirty=false;$("save-state").textContent="";
 $("position").textContent=`RECORDING ${sources.indexOf(source)+1} / ${sources.length}`;
 $("title").textContent=label(source);$("identity").textContent=source.assetId;
 $("decision").textContent=choice(source)==="open"?"Unreviewed":choice(source).toUpperCase();
 $("flags").replaceChildren();for(const flag of source.measurement.flags){const p=document.createElement("p");p.textContent=flag;$("flags").append(p);}
 contexts=catalog.routes.filter(r=>r.events.some(e=>e.sourceId===source.id));
 $("context").replaceChildren();for(const route of contexts){const option=document.createElement("option");option.value=route.id;option.textContent=route.label;$("context").append(option);}
 if(contexts.some(r=>r.id===notes[source.id]?.contextId))$("context").value=notes[source.id].contextId;
 $("note").value=notes[source.id]?.note || "";$("issues").replaceChildren();
 for(const issue of C.issueLabels){const label=document.createElement("label"),input=document.createElement("input");input.type="checkbox";input.value=issue;input.checked=notes[source.id]?.issues?.includes(issue)||false;input.onchange=()=>{noteDirty=true;saveNote();};label.append(input,document.createTextNode(" "+issue));$("issues").append(label);}
 $("routes").replaceChildren();for(const route of contexts){const li=document.createElement("li");li.textContent=route.label;$("routes").append(li);}
 $("detail").textContent=JSON.stringify({id:source.id,path:source.path,originalMs:source.measurement.originalMs,channels:source.measurement.channels,window:source.window,sourcePreserved:true},null,2);
 $("previous").disabled=sources.indexOf(source)===0;$("next").disabled=sources.indexOf(source)===sources.length-1;metrics();list();
}
function decide(value){
 saveNote();const merged={...stored(C.decisionStore),...(storageFailed?decisions:{})};
 if(value==="open")delete merged[selected.id];else merged[selected.id]=value;
 decisions=merged;if(persist(C.decisionStore,decisions)){$("save-state").textContent="Decision saved";$("decision").textContent=value==="open"?"Unreviewed":value.toUpperCase();list();}
}
$("keep").onclick=()=>decide("keep");$("reject").onclick=()=>decide("reject");$("clear").onclick=()=>decide("open");
$("save-note").onclick=saveNote;$("note").oninput=()=>{noteDirty=true;$("save-state").textContent="Unsaved note";};
$("context").onchange=()=>{player?.stop();metrics();};$("filter").onchange=()=>{const rows=filtered();$("card").hidden=!rows.length;if(rows.length)select(rows[0]);else list();};
$("previous").onclick=()=>select(sources[Math.max(0,sources.indexOf(selected)-1)]);
$("next").onclick=()=>select(sources[Math.min(sources.length-1,sources.indexOf(selected)+1)]);
$("stop").onclick=()=>{player?.stop();$("now").textContent="Stopped";};
for(const name of C.materialExamples){const option=document.createElement("option");option.value=name;option.textContent=name.replaceAll("_"," ");$("material").append(option);}
$("export").onclick=()=>{
 saveNote();const choices=storageFailed?decisions:stored(C.decisionStore), auditNotes=storageFailed?notes:stored(C.noteStore);
 const data={schemaVersion:2,reviewOnly:true,runtimeWired:false,scope:catalog.scope,exportedAt:new Date().toISOString(),sourceCatalogHash:catalog.sourceCatalogHash,playbackVerification:$("verification").textContent?JSON.parse($("verification").textContent):null,
  decisions:Object.fromEntries(sources.map(s=>[s.id,["keep","reject"].includes(choices[s.id])?choices[s.id]:"open"])),
  items:sources.map(s=>({id:s.id,path:s.path,assetId:s.assetId,decision:choices[s.id]||"open",auditNote:auditNotes[s.id]||null}))};
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="understar-dig-hit-break-audit.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
select(selected);
try{
 player=await createAuditPlayer(catalog,e=>{
  if(e.type==="check")$("verification-state").textContent=`Checking ${e.done} / ${e.total}`;
  else $("now").textContent=`Playing ${C.sourceLabels[sources.find(s=>s.key===e.key)?.assetId] || e.key} · ${Math.round(e.bufferMs/e.rate)} ms · ${e.rate.toFixed(2)}×`;
 });
 for(const id of ["play","repeat","original","sequence","check"])$(id).disabled=false;
 $("now").textContent="Ready — all current recordings loaded";
 for(const id of ["play","repeat","original"])$(id).onclick=()=>player.play(selected,event(),{repeat:id==="repeat",original:id==="original"}).catch(error=>{$("now").textContent=error.message;});
 $("sequence").onclick=()=>player.sequence($("material").value,$("fallback").checked).catch(error=>{$("now").textContent=error.message;});
 $("check").onclick=async()=>{
  $("check").disabled=true;$("verification-state").textContent="Checking…";
  try{const report=await player.check();$("verification").textContent=JSON.stringify(report,null,2);$("verification-state").textContent=`PASS — ${report.checks.length} native sources, rates, gains and completion checked`;}
  catch(error){$("verification").textContent=JSON.stringify({passed:false,error:error.message},null,2);$("verification-state").textContent="FAIL — "+error.message;}
  $("check").disabled=false;
 };
}catch(error){$("now").textContent="Audio load failed: "+error.message;}
window.addEventListener("pagehide",saveNote);

window.addEventListener("storage",e=>{if(e.key===C.decisionStore){decisions=stored(C.decisionStore);$("decision").textContent=choice(selected)==="open"?"Unreviewed":choice(selected).toUpperCase();list();}if(e.key===C.noteStore&&!noteDirty)notes=stored(C.noteStore);});
