import {answerMatches} from './normalize.js';

const $ = (q) => document.querySelector(q);
const esc = (v='') => String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

function flattenCourse(course) {
  return new Map(course.flatMap(module => (module.phrases || []).map(phrase => [phrase.id, phrase])));
}

function acceptedAnswers(step, phrases) {
  return step.accept.flatMap(id => {
    const p = phrases.get(id);
    return p ? [p.bxr, ...(p.alternatives || [])] : [];
  });
}

async function initSpeaking() {
  const root = $('#speaking');
  if (!root) return;
  const [course, config] = await Promise.all([
    fetch('/assets/data/course.json').then(r => r.json()),
    fetch('/assets/data/speaking.json').then(r => r.json())
  ]);
  const phrases = flattenCourse(course);
  const state = {scenario:0, step:0, revealed:false, correct:0, attempts:0};

  const scenarioButtons = $('#speakingScenarioList');
  const title = $('#speakingTitle');
  const mood = $('#speakingMood');
  const prompt = $('#speakingPrompt');
  const counter = $('#speakingCounter');
  const answer = $('#speakingAnswer');
  const feedback = $('#speakingFeedback');
  const check = $('#speakingCheck');
  const reveal = $('#speakingReveal');
  const next = $('#speakingNext');
  const progress = $('#speakingProgressBar');

  function currentScenario(){ return config.scenarios[state.scenario]; }
  function currentStep(){ return currentScenario().steps[state.step]; }

  function renderScenarioList(){
    scenarioButtons.innerHTML = config.scenarios.map((s,i) =>
      `<button class="speaking-scenario ${i===state.scenario?'active':''}" type="button" data-speaking-scenario="${i}"><strong>${esc(s.title)}</strong><small>${esc(s.mood)}</small></button>`
    ).join('');
    scenarioButtons.querySelectorAll('[data-speaking-scenario]').forEach(btn => {
      btn.onclick = () => { state.scenario=Number(btn.dataset.speakingScenario); state.step=0; state.revealed=false; render(); };
    });
  }

  function render(){
    const s=currentScenario(), st=currentStep();
    title.textContent=s.title;
    mood.textContent=s.mood;
    prompt.textContent=st.prompt;
    counter.textContent=`${state.step+1} / ${s.steps.length}`;
    progress.style.width=`${((state.step+1)/s.steps.length)*100}%`;
    answer.value='';
    answer.disabled=false;
    feedback.className='speaking-feedback hidden';
    feedback.innerHTML='';
    check.classList.remove('hidden');
    reveal.classList.remove('hidden');
    next.classList.add('hidden');
    state.revealed=false;
    renderScenarioList();
    answer.focus({preventScroll:true});
  }

  function finish(ok, answers){
    state.attempts++;
    if(ok) state.correct++;
    answer.disabled=true;
    feedback.className=`speaking-feedback ${ok?'ok':'bad'}`;
    feedback.innerHTML = ok
      ? '<strong>Сказано.</strong><p>Главное — сначала произнести вслух, а уже потом проверять себя письмом.</p>'
      : `<strong>Попробуй ещё раз вслух.</strong><p>Один естественный вариант: <b>${esc(answers[0] || '')}</b></p>`;
    check.classList.add('hidden');
    reveal.classList.add('hidden');
    next.classList.remove('hidden');
  }

  check.onclick=()=>{
    const value=answer.value.trim();
    if(!value){ feedback.className='speaking-feedback bad'; feedback.innerHTML='<strong>Сначала скажи ответ вслух и напиши его.</strong>'; return; }
    const answers=acceptedAnswers(currentStep(),phrases);
    finish(answers.some(a=>answerMatches(value,a)),answers);
  };

  reveal.onclick=()=>{
    const answers=acceptedAnswers(currentStep(),phrases);
    state.revealed=true;
    feedback.className='speaking-feedback bad';
    feedback.innerHTML=`<span class="tag">Опора</span><p class="speaking-reveal">${esc(answers[0] || '')}</p><p>Прочитай вслух два раза, закрой подсказку глазами и повтори ещё раз.</p>`;
  };

  next.onclick=()=>{
    const s=currentScenario();
    if(state.step < s.steps.length-1){ state.step++; render(); return; }
    const total=state.attempts || s.steps.length;
    const score=state.correct;
    $('#speakingPrompt').textContent='Сценарий пройден.';
    $('#speakingFeedback').className='speaking-feedback ok';
    $('#speakingFeedback').innerHTML=`<strong>${score} уверенных ответа из ${total}.</strong><p>Вернись к этому разговору завтра и постарайся отвечать быстрее, не переводя фразу слово за словом.</p>`;
    document.dispatchEvent(new CustomEvent('buryad:daily-complete',{detail:{stage:'speak'}}));
    next.classList.add('hidden');
    check.classList.add('hidden');
    reveal.classList.add('hidden');
    answer.disabled=true;
  };

  render();
}

initSpeaking().catch(err => {
  console.error(err);
  const el=document.querySelector('#speakingPrompt');
  if(el) el.textContent='Не удалось загрузить разговорную практику.';
});


async function initPatterns() {
  const setSelect = document.querySelector('#patternSet');
  if (!setSelect) return;
  const [course, config] = await Promise.all([
    fetch('/assets/data/course.json').then(r => r.json()),
    fetch('/assets/data/patterns.json').then(r => r.json())
  ]);
  const phrases = flattenCourse(course);
  const state = {setIndex:0, order:[], index:0, streak:0, answered:false};

  const prompt = document.querySelector('#patternPrompt');
  const answer = document.querySelector('#patternAnswer');
  const counter = document.querySelector('#patternCounter');
  const streak = document.querySelector('#patternStreak');
  const feedback = document.querySelector('#patternFeedback');
  const check = document.querySelector('#patternCheck');
  const reveal = document.querySelector('#patternReveal');
  const next = document.querySelector('#patternNext');

  function shuffle(items) {
    const copy=[...items];
    for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
    return copy;
  }

  function selectedSet(){ return config.sets[state.setIndex]; }
  function currentPhrase(){ return phrases.get(state.order[state.index]); }

  function rebuild() {
    state.order=shuffle(selectedSet().items);
    state.index=0;
    state.answered=false;
    render();
  }

  function render() {
    const phrase=currentPhrase();
    counter.textContent=`${state.index+1} / ${state.order.length}`;
    streak.textContent=`${state.streak} подряд`;
    prompt.textContent=phrase?.ru || 'Загрузка…';
    answer.value='';
    answer.disabled=false;
    feedback.className='speaking-feedback hidden';
    feedback.innerHTML='';
    check.classList.remove('hidden');
    reveal.classList.remove('hidden');
    next.classList.add('hidden');
    answer.focus({preventScroll:true});
  }

  setSelect.innerHTML=config.sets.map((s,i)=>`<option value="${i}">${esc(s.title)}</option>`).join('');
  setSelect.onchange=()=>{state.setIndex=Number(setSelect.value);state.streak=0;rebuild();};
  document.querySelector('#patternShuffle').onclick=()=>{state.streak=0;rebuild();};

  function finish(ok) {
    const phrase=currentPhrase();
    state.answered=true;
    if(ok) state.streak++; else state.streak=0;
    streak.textContent=`${state.streak} подряд`;
    feedback.className=`speaking-feedback ${ok?'ok':'bad'}`;
    feedback.innerHTML=ok
      ? '<strong>Есть.</strong><p>Скажи эту же фразу ещё один раз без взгляда на экран.</p>'
      : `<strong>Правильная опора:</strong><p class="speaking-reveal">${esc(phrase?.bxr || '')}</p><p>Повтори вслух два раза, затем продолжай.</p>`;
    answer.disabled=true;
    check.classList.add('hidden');
    reveal.classList.add('hidden');
    next.classList.remove('hidden');
  }

  check.onclick=()=>{
    const phrase=currentPhrase();
    const value=answer.value.trim();
    if(!value){feedback.className='speaking-feedback bad';feedback.innerHTML='<strong>Сначала скажи и напиши ответ.</strong>';return;}
    const accepted=[phrase.bxr,...(phrase.alternatives||[])];
    finish(accepted.some(a=>answerMatches(value,a)));
  };

  reveal.onclick=()=>finish(false);

  next.onclick=()=>{
    if(state.index < state.order.length-1){state.index++;render();return;}
    document.dispatchEvent(new CustomEvent('buryad:daily-complete',{detail:{stage:'flex'}}));
    state.order=shuffle(selectedSet().items);
    state.index=0;
    render();
  };

  rebuild();
}

initPatterns().catch(err => console.error(err));
