const $=q=>document.querySelector(q);
async function initChallenge(){
 const root=$('#challenge');if(!root)return;
 const data=await fetch('/assets/data/final-challenge.json').then(r=>r.json());
 let timer=null,remaining=data.durationSeconds,index=0,russian=false;
 const clock=$('#challengeClock'),prompt=$('#challengePrompt'),fallback=$('#challengeFallback'),start=$('#challengeStart'),help=$('#challengeHelp');
 const fmt=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
 function render(){clock.textContent=fmt(remaining);prompt.textContent=data.prompts[index].bxr;}
 start.onclick=()=>{if(timer)return;remaining=data.durationSeconds;index=0;russian=false;fallback.classList.add('hidden');start.textContent='Идёт разговор…';render();timer=setInterval(()=>{remaining--;const elapsed=data.durationSeconds-remaining;const nextIndex=Math.min(data.prompts.length-1,Math.floor(elapsed/60));if(nextIndex!==index){index=nextIndex;fallback.classList.add('hidden');render();}clock.textContent=fmt(remaining);if(remaining<=0){clearInterval(timer);timer=null;localStorage.setItem('buryad.finalChallenge',JSON.stringify({completed:true,noRussian:!russian,at:new Date().toISOString()}));prompt.textContent='Табан минута. Дуусаа.';fallback.classList.remove('hidden');fallback.textContent=russian?'Пройдено. В следующий раз попробуй без русского.':'Пять минут без русского — это уже реальная разговорная практика.';start.textContent='Повторить';}},1000);};
 help.onclick=()=>{russian=true;fallback.textContent=data.prompts[index].fallback;fallback.classList.remove('hidden');};
 render();
}
initChallenge().catch(console.error);