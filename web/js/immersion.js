import {answerMatches} from './normalize.js';

const $=(q)=>document.querySelector(q);
const esc=(v='')=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

function vocabKey(id){return `buryad.vocab.${id}`;}
function vocabState(id){try{return JSON.parse(localStorage.getItem(vocabKey(id))||'{"state":"unseen","seen":0,"recognized":0,"active":0}');}catch{return {state:'unseen',seen:0,recognized:0,active:0};}}
function touchWord(word,event){
 const s=vocabState(word.id); s.seen=Number(s.seen||0)+1;
 if(event==='recognized')s.recognized=Number(s.recognized||0)+1;
 if(event==='active')s.active=Number(s.active||0)+1;
 s.state=s.active>=3?'automatic':s.active>=1?'active':s.recognized>=2?'recognized':'seen';
 localStorage.setItem(vocabKey(word.id),JSON.stringify(s));
 document.dispatchEvent(new CustomEvent('buryad:vocabulary-change',{detail:{id:word.id,state:s.state}}));
}

async function initImmersion(){
 const root=$('#immersion'); if(!root)return;
 const [data,imageManifest,audioManifest]=await Promise.all([fetch('/assets/data/immersion.json').then(r=>r.json()),fetch('/assets/data/image-manifest.json').then(r=>r.json()).catch(()=>({assets:[]})),fetch('/assets/data/native-audio-queue.json').then(r=>r.json()).catch(()=>({recordingQueue:[]}))]);
 const imageAssets=new Map((imageManifest.assets||[]).map(x=>[x.id,x]));
 const audioAssets=new Map((audioManifest.recordingQueue||[]).filter(x=>x.status==='verified'&&x.natural).map(x=>[x.text,x]));
 const state={scene:0,step:0,help:0,correct:0,helpUses:0,russianUses:0,startedAt:performance.now()};
 const completedScenes=()=>data.scenes.filter(s=>{try{return JSON.parse(localStorage.getItem(`buryad.immersion.${s.id}`)||'{}').completed===true;}catch{return false;}});
 const firstIncomplete=data.scenes.findIndex(s=>{try{return JSON.parse(localStorage.getItem(`buryad.immersion.${s.id}`)||'{}').completed!==true;}catch{return true;}});state.scene=firstIncomplete>=0?firstIncomplete:0;
 const immersionImage=$('#immersionImage'), immersionListen=$('#immersionListen'), immersionRecord=$('#immersionRecord'), immersionStop=$('#immersionStop'), immersionReplay=$('#immersionReplay');
 let shadowRecorder=null,shadowChunks=[],shadowUrl=null;
 const sceneList=$('#immersionScenes'), title=$('#immersionTitle'), subtitle=$('#immersionSubtitle'), cue=$('#immersionCue'), visual=$('#immersionVisual'), choices=$('#immersionChoices'), answer=$('#immersionAnswer'), check=$('#immersionCheck'), next=$('#immersionNext'), help=$('#immersionHelp'), helpBox=$('#immersionHelpBox'), meta=$('#immersionMeta'), vocab=$('#immersionVocab');

 function scene(){return data.scenes[state.scene];}
 function step(){return scene().steps[state.step];}
 function renderScenes(){
  const completed=new Set(completedScenes().map(s=>s.id));
  sceneList.innerHTML=`<div class="scene-picker-head"><span class="tag">Путь сцен</span><small>${completed.size} / ${data.scenes.length} пройдено</small></div><select id="immersionSceneSelect" aria-label="Выбрать бытовую сцену">${data.scenes.map((s,i)=>`<option value="${i}" ${i===state.scene?'selected':''}>${completed.has(s.id)?'✓ ':''}${i+1}. ${esc(s.title)}</option>`).join('')}</select><p>Сайт открыл следующую рекомендуемую сцену. Выбрать другую можно здесь.</p>`;
  const select=sceneList.querySelector('#immersionSceneSelect');
  select.onchange=()=>{state.scene=Number(select.value);state.step=0;state.help=0;state.correct=0;state.helpUses=0;state.russianUses=0;state.startedAt=performance.now();render();};
 }
 function renderVocab(){
  vocab.innerHTML=scene().newWords.map(w=>{const s=vocabState(w.id);return `<div class="immersion-word"><span>${w.visual}</span><div><strong>${esc(w.bxr)}</strong><small>${s.state==='unseen'?'новое':s.state==='seen'?'видел':s.state==='recognized'?'узнаю':s.state==='active'?'говорю':'автоматически'}</small></div></div>`;}).join('');
 }
 function render(){
  const s=scene(),st=step(); title.textContent=s.title;subtitle.textContent=s.subtitle;
  meta.textContent=`${state.step+1} / ${s.steps.length}`; cue.textContent=st.cue; visual.textContent=st.visual||'';
  const cover=imageAssets.get(`scene-${s.id}`);if(cover&&immersionImage){immersionImage.src=cover.path;immersionImage.alt=cover.alt||s.title;immersionImage.classList.remove('hidden');immersionImage.onerror=()=>immersionImage.classList.add('hidden');immersionImage.onload=()=>immersionImage.classList.remove('hidden');}
  const audioItem=audioAssets.get(st.cue);if(immersionListen){immersionListen.classList.toggle('hidden',!audioItem);immersionListen.onclick=()=>{if(audioItem?.natural)new Audio(audioItem.natural).play();};}
  if(immersionRecord){immersionRecord.classList.toggle('hidden',!audioItem);immersionStop.classList.add('hidden');immersionReplay.classList.add('hidden');immersionRecord.onclick=async()=>{const stream=await navigator.mediaDevices.getUserMedia({audio:true});shadowChunks=[];shadowRecorder=new MediaRecorder(stream);shadowRecorder.ondataavailable=e=>shadowChunks.push(e.data);shadowRecorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());if(shadowUrl)URL.revokeObjectURL(shadowUrl);shadowUrl=URL.createObjectURL(new Blob(shadowChunks,{type:shadowRecorder.mimeType||'audio/webm'}));immersionReplay.classList.remove('hidden');immersionStop.classList.add('hidden');immersionRecord.classList.remove('hidden');};shadowRecorder.start();immersionRecord.classList.add('hidden');immersionStop.classList.remove('hidden');};immersionStop.onclick=()=>{if(shadowRecorder?.state==='recording')shadowRecorder.stop();};immersionReplay.onclick=()=>{if(shadowUrl)new Audio(shadowUrl).play();};}
  choices.innerHTML='';answer.value='';answer.classList.add('hidden');check.classList.add('hidden');next.classList.add('hidden');helpBox.classList.add('hidden');helpBox.textContent='';help.textContent='Нужна опора';state.help=0;
  s.newWords.forEach(w=>{if(st.cue.toLowerCase().includes(w.bxr.toLowerCase()))touchWord(w,'seen');});
  if(st.type==='choose'){
   choices.innerHTML=(st.visuals||[]).map((x,i)=>`<button type="button" class="immersion-choice" data-choice="${i}"><span>${x.v}</span><small>${esc(x.label||'')}</small></button>`).join('');
   choices.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{const item=st.visuals[Number(b.dataset.choice)];b.classList.add(item.correct?'correct':'wrong');if(item.correct){s.newWords.filter(w=>w.bxr===item.label).forEach(w=>touchWord(w,'recognized'));next.classList.remove('hidden');}});
  } else if(st.type==='respond'){
   answer.classList.remove('hidden');check.classList.remove('hidden');answer.focus({preventScroll:true});
  } else if(st.type==='finish'){
   next.textContent='Закончить сцену';next.classList.remove('hidden');
  } else {
   next.textContent=st.type==='act'?'Сделал →':'Дальше →';next.classList.remove('hidden');
  }
  renderScenes();renderVocab();
 }
 help.onclick=()=>{
  const st=step();const hints=st.help||[];if(!hints.length)return;
  helpBox.classList.remove('hidden');
  if(state.help===0){state.helpUses++;helpBox.textContent=hints[0]||'Посмотри на ситуацию ещё раз.';state.help=1;help.textContent='Показать по-русски';}
  else {state.russianUses++;helpBox.textContent=hints[1]||hints[0]||'';state.help=2;help.textContent='Перевод показан';}
 };
 check.onclick=()=>{
  const st=step(),value=answer.value.trim();if(!value)return;
  const ok=(st.answers||[]).some(a=>answerMatches(value,a));
  const box=$('#immersionFeedback');box.className=`immersion-feedback ${ok?'ok':'bad'}`;box.innerHTML=ok?'<strong>Һайн.</strong><span> Скажи ещё раз вслух.</span>':`<strong>Ещё раз.</strong><span> ${esc(st.answers?.[0]||'')}</span>`;
  if(ok){state.correct++;scene().newWords.filter(w=>(st.answers||[]).some(a=>a.toLowerCase().includes(w.bxr.toLowerCase()))).forEach(w=>touchWord(w,'active'));next.classList.remove('hidden');check.classList.add('hidden');answer.disabled=true;}
  renderVocab();
 };
 next.onclick=()=>{
  answer.disabled=false;$('#immersionFeedback').className='immersion-feedback hidden';$('#immersionFeedback').innerHTML='';
  if(state.step<scene().steps.length-1){state.step++;render();return;}
  const elapsedSeconds=Math.round((performance.now()-state.startedAt)/1000);
  localStorage.setItem(`buryad.immersion.${scene().id}`,JSON.stringify({completed:true,score:state.correct,helpUses:state.helpUses,russianUses:state.russianUses,noRussian:state.russianUses===0,elapsedSeconds,updatedAt:new Date().toISOString()}));
  document.dispatchEvent(new CustomEvent('buryad:daily-complete',{detail:{stage:'live'}}));
  cue.textContent='Сцена завершена.';visual.textContent='🌄';choices.innerHTML='';answer.classList.add('hidden');check.classList.add('hidden');next.classList.add('hidden');help.classList.add('hidden');helpBox.classList.remove('hidden');helpBox.textContent='Завтра эта же лексика вернётся в другой ситуации.';
 };
 render();
}
initImmersion().catch(console.error);
