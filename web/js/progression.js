const $=(q)=>document.querySelector(q);
const esc=(v='')=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

async function initProgression(){
  const root=$('#path'); if(!root)return;
  const data=await fetch('/assets/data/progression.json').then(r=>r.json());
  const state={week:Number(localStorage.getItem('buryad.path.week')||1),checkpointIndex:0};
  const list=$('#pathWeeks'), title=$('#pathTitle'), focus=$('#pathFocus'), modules=$('#pathModules'), cpTitle=$('#checkpointTitle'), cpPrompt=$('#checkpointPrompt'), cpCounter=$('#checkpointCounter'), cpNext=$('#checkpointNext'), cpDone=$('#checkpointDone');

  function current(){return data.weeks.find(w=>w.week===state.week)||data.weeks[0];}
  function renderWeeks(){
    list.innerHTML=data.weeks.map(w=>`<button type="button" class="path-week ${w.week===state.week?'active':''}" data-week="${w.week}"><span>${String(w.week).padStart(2,'0')}</span><strong>${esc(w.title)}</strong><small>${esc(w.focus)}</small></button>`).join('');
    list.querySelectorAll('[data-week]').forEach(btn=>btn.onclick=()=>{state.week=Number(btn.dataset.week);state.checkpointIndex=0;localStorage.setItem('buryad.path.week',String(state.week));render();});
  }

  function render(){
    const w=current();
    title.textContent=`Неделя ${w.week} · ${w.title}`;
    focus.textContent=w.focus;
    modules.textContent=`Фокус курса: ${w.modules.join(' · ')}`;
    cpTitle.textContent=w.checkpoint.title;
    const prompts=w.checkpoint.prompts;
    cpPrompt.textContent=prompts[state.checkpointIndex];
    cpCounter.textContent=`${state.checkpointIndex+1} / ${prompts.length}`;
    cpNext.classList.toggle('hidden',state.checkpointIndex>=prompts.length-1);
    cpDone.classList.toggle('hidden',state.checkpointIndex<prompts.length-1);
    renderWeeks();
  }

  cpNext.onclick=()=>{const w=current();if(state.checkpointIndex<w.checkpoint.prompts.length-1){state.checkpointIndex++;render();}};
  cpDone.onclick=()=>{localStorage.setItem(`buryad.path.week.${state.week}.checkpoint`,'done'); cpPrompt.textContent='Эта контрольная сцена завершена. Повтори её ещё раз без чтения подсказок.'; cpDone.classList.add('hidden');};
  render();
}

initProgression().catch(err=>console.error(err));
