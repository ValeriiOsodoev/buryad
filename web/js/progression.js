const $=(q)=>document.querySelector(q);
const esc=(v='')=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

async function initProgression(){
  const root=$('#path'); if(!root)return;
  const data=await fetch('/assets/data/progression.json').then(r=>r.json());
  const state={week:Number(localStorage.getItem('buryad.path.week')||1),checkpointIndex:0};
  const list=$('#pathWeeks'), title=$('#pathTitle'), focus=$('#pathFocus'), modules=$('#pathModules'), cpTitle=$('#checkpointTitle'), cpPrompt=$('#checkpointPrompt'), cpCounter=$('#checkpointCounter'), cpNext=$('#checkpointNext'), cpDone=$('#checkpointDone'), cpHelp=$('#checkpointHelp'), cpHelpBox=$('#checkpointHelpBox');

  function current(){return data.weeks.find(w=>w.week===state.week)||data.weeks[0];}
  function renderWeeks(){
    list.innerHTML=data.weeks.map(w=>{const done=localStorage.getItem(`buryad.path.week.${w.week}.checkpoint`)==='done';return `<button type="button" class="path-week ${w.week===state.week?'active':''} ${done?'done':''}" data-week="${w.week}"><span>${done?'✓':String(w.week).padStart(2,'0')}</span><strong>${esc(w.title)}</strong><small>${esc(w.focus)}</small></button>`;}).join('');
    list.querySelectorAll('[data-week]').forEach(btn=>btn.onclick=()=>{state.week=Number(btn.dataset.week);state.checkpointIndex=0;localStorage.setItem('buryad.path.week',String(state.week));render();});
  }

  function render(){
    const w=current();
    const immersion=Number(w.immersionLevel||0);
    root.dataset.immersion=String(immersion);
    title.textContent=`Неделя ${w.week} · ${w.title}`;
    focus.textContent=w.focus;
    modules.textContent=`Фокус курса: ${w.modules.join(' · ')}`;
    cpTitle.textContent=w.checkpoint.title;
    const useBuryat=immersion>=1 && Array.isArray(w.checkpoint.bxrPrompts);
    const prompts=useBuryat ? w.checkpoint.bxrPrompts : w.checkpoint.prompts;
    cpPrompt.textContent=prompts[state.checkpointIndex];
    cpCounter.textContent=`${state.checkpointIndex+1} / ${prompts.length}`;
    const immersionNote=document.querySelector('#checkpointImmersion');
    if(immersionNote){
      immersionNote.textContent=immersion===0?'Подсказки на русском':immersion===1?'Сцена уже по-бурятски':immersion===2?'Русский только если застрял':'Полное погружение';
    }
    cpNext.classList.toggle('hidden',state.checkpointIndex>=prompts.length-1);
    cpDone.classList.toggle('hidden',state.checkpointIndex<prompts.length-1);
    cpHelpBox.classList.add('hidden');
    cpHelpBox.textContent='';
    cpHelp.dataset.level='0';
    cpHelp.textContent='Нужна опора';
    renderWeeks();
  }

  cpNext.onclick=()=>{const w=current();const prompts=(Number(w.immersionLevel||0)>=1&&Array.isArray(w.checkpoint.bxrPrompts))?w.checkpoint.bxrPrompts:w.checkpoint.prompts;if(state.checkpointIndex<prompts.length-1){state.checkpointIndex++;render();}};
  cpHelp.onclick=()=>{const w=current();const level=Number(cpHelp.dataset.level||0);cpHelpBox.classList.remove('hidden');if(level===0){cpHelpBox.textContent=w.checkpoint.help?.primary||'Вспомни знакомые слова.';cpHelp.dataset.level='1';cpHelp.textContent='Ещё помощь';return;}cpHelpBox.textContent=w.checkpoint.help?.secondary||'Посмотри смысл и снова ответь по-бурятски.';cpHelp.dataset.level='2';cpHelp.textContent='Опора показана';};
  cpDone.onclick=()=>{localStorage.setItem(`buryad.path.week.${state.week}.checkpoint`,'done'); cpPrompt.textContent='Эта контрольная сцена завершена. Повтори её ещё раз без чтения подсказок.'; cpDone.classList.add('hidden'); renderWeeks(); if(state.week<8){const nextButton=document.querySelector(`[data-week="${state.week+1}"]`); if(nextButton){nextButton.classList.add('recommended');}}};
  render();
}

initProgression().catch(err=>console.error(err));
