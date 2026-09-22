import {flattenCourse, taskId} from './course.js';

const $=(q)=>document.querySelector(q);

function progressFromStorage(){
  try{return JSON.parse(localStorage.getItem('buryad.progress')||'{}');}catch{return {};}
}

function todayKey(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function dailyState(){
  try{return JSON.parse(localStorage.getItem(`buryad.daily.${todayKey()}`)||'{}');}catch{return {};}
}

function saveDaily(value){
  localStorage.setItem(`buryad.daily.${todayKey()}`,JSON.stringify(value));
}

function dueCount(progress){
  const now=Date.now();
  return Object.values(progress).filter(item=>Number(item?.next_review_at||Number.MAX_SAFE_INTEGER)<=now).length;
}

function weakCount(progress){
  return Object.values(progress).filter(item=>{
    const attempts=Number(item?.attempts||0);
    return attempts>=2 && Number(item?.correct||0)/Math.max(1,attempts)<.6;
  }).length;
}

function masteredCourse(course,progress){
  return flattenCourse(course).filter(phrase=>{
    const item=progress[taskId(phrase.id,'recall')];
    return item && (item.status==='mastered'||Number(item.review_step||-1)>=4);
  }).length;
}

async function initDaily(){
  const root=$('#daily');
  if(!root)return;
  const course=await fetch('/assets/data/course.json').then(r=>r.json());
  const progress=progressFromStorage();
  const saved=dailyState();
  const totalPhrases=flattenCourse(course).length;
  const due=dueCount(progress);
  const weak=weakCount(progress);
  const mastered=masteredCourse(course,progress);

  const stages=[
    {id:'live',title:'Пожить на языке',minutes:10,target:'#immersion',detail:'Одна бытовая сцена: смотри, действуй и отвечай без перевода',cta:'Начать сцену'},
    {id:'live',title:'Пожить на бурятском',minutes:10,target:'#immersion',detail:'Одна бытовая сцена: смотри, действуй, отвечай',cta:'Начать сцену'},
    {id:'review',title:'Разбудить язык',minutes:5,target:'#course',detail:due?`${due} повторов уже ждут тебя`:'Повтори несколько знакомых фраз',cta:'Повторить'},
    {id:'speak',title:'Поговорить',minutes:6,target:'#speaking',detail:'Один бытовой сценарий вслух, без подсказок',cta:'Говорить'},
    {id:'flex',title:'Перестроить фразы',minutes:4,target:'#patternTitle',detail:'Быстрая серия на автоматизм',cta:'Автоматизм'},
    {id:'listen',title:'Услышать',minutes:5,target:'#video',detail:'Один фрагмент: слушай → запиши → переслушай',cta:'Слушать'}
  ];

  const list=$('#dailySteps');
  const summary=$('#dailySummary');
  const bar=$('#dailyProgressBar');
  const doneCount=()=>stages.filter(s=>saved[s.id]).length;

  function render(){
    const done=doneCount();
    summary.textContent=done===stages.length
      ? 'Сегодняшний круг завершён. Завтра язык вернётся снова.'
      : `${done} из ${stages.length} этапов · около ${stages.filter(s=>!saved[s.id]).reduce((n,s)=>n+s.minutes,0)} минут осталось`;
    bar.style.width=`${Math.round(done/stages.length*100)}%`;
    list.innerHTML=stages.map((stage,index)=>
      `<article class="daily-step ${saved[stage.id]?'done':''}">
        <div class="daily-step-index">${saved[stage.id]?'✓':String(index+1).padStart(2,'0')}</div>
        <div class="daily-step-copy">
          <span class="tag">${stage.minutes} минут</span>
          <h3>${stage.title}</h3>
          <p>${stage.detail}</p>
        </div>
        <div class="daily-step-actions">
          <a class="secondary" href="${stage.target}" data-daily-go="${stage.id}">${stage.cta}</a>
          <button class="text-button" type="button" data-daily-done="${stage.id}">${saved[stage.id]?'Вернуть':'Готово'}</button>
        </div>
      </article>`).join('');

    list.querySelectorAll('[data-daily-done]').forEach(btn=>{
      btn.onclick=()=>{saved[btn.dataset.dailyDone]=!saved[btn.dataset.dailyDone];saveDaily(saved);render();};
    });
  }

  $('#dailyContext').textContent = mastered
    ? `${mastered} из ${totalPhrases} фраз закреплено · ${due} пора повторить · ${weak} слабых мест`
    : `${totalPhrases} базовых фраз ждут впереди. Сегодня достаточно одного маленького круга.`;

  document.addEventListener('buryad:daily-complete',(event)=>{\n    const stage=event.detail?.stage;\n    if(!stages.some(item=>item.id===stage))return;\n    saved[stage]=true;\n    saveDaily(saved);\n    render();\n  });\n\n  $('#dailyReset').onclick=()=>{for(const s of stages)delete saved[s.id];saveDaily(saved);render();};\n  render();
}

initDaily().catch(err=>console.error(err));
