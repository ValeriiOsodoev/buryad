import {answerMatches} from './normalize.js';
const $=q=>document.querySelector(q);
async function initAssessment(){
 const root=$('#assessment');if(!root)return;
 const data=await fetch('/assets/data/baseline.json').then(r=>r.json());
 let index=0,score=0,started=performance.now(),times=[];
 const prompt=$('#assessmentPrompt'),answer=$('#assessmentAnswer'),feedback=$('#assessmentFeedback'),next=$('#assessmentNext'),check=$('#assessmentCheck'),counter=$('#assessmentCounter');
 function render(){const q=data.questions[index];prompt.textContent=q.prompt;counter.textContent=`${index+1} / ${data.questions.length}`;answer.value='';answer.disabled=false;feedback.textContent='';check.classList.remove('hidden');next.classList.add('hidden');started=performance.now();}
 check.onclick=()=>{const q=data.questions[index];const ok=q.accept.some(a=>answerMatches(answer.value,a));times.push(performance.now()-started);if(ok)score++;feedback.textContent=ok?'Һайн.':`Опора: ${q.accept[0]}`;answer.disabled=true;check.classList.add('hidden');next.classList.remove('hidden');};
 next.onclick=()=>{if(index<data.questions.length-1){index++;render();return;}const avg=Math.round(times.reduce((a,b)=>a+b,0)/Math.max(1,times.length)/100)/10;const label=data.interpretation.find(x=>score<=x.max)?.label||data.interpretation.at(-1).label;localStorage.setItem('buryad.baseline',JSON.stringify({score,total:data.questions.length,avgSeconds:avg,at:new Date().toISOString()}));prompt.textContent=label;feedback.textContent=`${score} из ${data.questions.length} · средний ответ ${avg} с. Это стартовая точка, не оценка.`;answer.classList.add('hidden');check.classList.add('hidden');next.classList.add('hidden');};
 render();
}
initAssessment().catch(console.error);