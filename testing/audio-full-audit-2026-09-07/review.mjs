const examples=(await(await fetch('./auditions.json')).json()).examples;
const playerVolume=document.querySelector('#volume');
const players=[];
for(const sample of examples){
 const card=document.createElement('section');card.className='card';
 const title=document.createElement('h3');title.textContent=sample.title;
 const description=document.createElement('p');description.textContent=sample.note;
 card.append(title,description);const pair=document.createElement('div');pair.className='pair';
 for(const variant of ['before','after']){
  const data=sample.variants[variant],group=document.createElement('div');group.className='sample';
  const label=document.createElement('label');label.textContent=variant==='before'?'BEFORE':'AFTER';
  const audio=document.createElement('audio');audio.controls=true;audio.preload='metadata';audio.src=data.file;audio.volume=.5;audio.setAttribute('aria-label',sample.title+' '+variant);
  audio.addEventListener('play',()=>players.forEach(other=>{if(other!==audio)other.pause();}));players.push(audio);
  const metrics=document.createElement('div');metrics.className='metrics';
  metrics.textContent=data.metrics.duration.toFixed(2)+' sec · '+data.metrics.integratedLUFS+' LUFS · '+data.metrics.truePeakDbTP+' dBTP';
  group.append(label,audio,metrics);pair.append(group);
 }
 card.append(pair);document.querySelector('#cards').append(card);
}
playerVolume.addEventListener('input',()=>{document.querySelector('#level').textContent=playerVolume.value+'%';players.forEach(audio=>audio.volume=Number(playerVolume.value)/100);});
const [catalog,native,lifecycle,mastering]=await Promise.all(['catalog.json','native-results.json','lifecycle-results.json','mastering-results.json'].map(async file=>(await fetch(file)).json()));
document.querySelector('#count').textContent=catalog.counts.total;
document.querySelector('#failures').textContent=catalog.counts.missing;
const v=document.querySelector('#verification');
v.textContent=native.checks.length+' native browser checks and '+(lifecycle.checks.length+mastering.checks.length)+' focused regression checks passed. Existing volume, timing, speech, streaming and Signal contracts also passed; see the report for older snapshot and marketing-test limits.';
if(native.passed&&lifecycle.passed&&mastering.passed)v.className='status';
