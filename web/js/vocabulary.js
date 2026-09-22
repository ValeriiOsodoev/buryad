const $=(q)=>document.querySelector(q);
const esc=(v='')=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

function stateFor(id){
 try{return JSON.parse(localStorage.getItem(`buryad.vocab.${id}`)||'{"state":"unseen"}');}
 catch{return {state:'unseen'};}
}
async function initVocabulary(){
 const root=$('#my-words');if(!root)return;
 const data=await fetch('/assets/data/vocabulary.json').then(r=>r.json());
 const rows=data.items.map(item=>({...item,learning:stateFor(item.id)}));
 const rank={unseen:0,seen:1,recognized:2,active:3,automatic:4};
 const count=(min)=>rows.filter(x=>(rank[x.learning.state]||0)>=min).length;
 $('#vocabSeen').textContent=count(1);
 $('#vocabRecognized').textContent=count(2);
 $('#vocabActive').textContent=count(3);
 $('#vocabAutomatic').textContent=count(4);
 const learned=rows.filter(x=>x.learning.state!=='unseen').sort((a,b)=>(rank[b.learning.state]||0)-(rank[a.learning.state]||0));
 $('#vocabStateGrid').innerHTML=learned.length?learned.map(x=>`<article class="vocab-state-card" data-vocab-id="${x.id}"><span>${x.visual}</span><div><strong>${esc(x.bxr)}</strong><small>${x.learning.state==='seen'?'встречал':x.learning.state==='recognized'?'узнаю':x.learning.state==='active'?'говорю':'автоматически'}</small></div><button type="button" class="text-button vocab-practice" data-vocab-practice="${x.id}">${x.learning.state==='seen'?'Узнать':'Сказать'}</button></article>`).join(''):'<p class="vocab-empty">Начни первую жизненную сцену — слова появятся здесь сами.</p>';
 document.querySelectorAll('[data-vocab-practice]').forEach(btn=>btn.onclick=()=>{const item=rows.find(x=>x.id===btn.dataset.vocabPractice);if(!item)return;const value=prompt(item.learning.state==='seen'?`Что это? ${item.visual}`:`Скажи по-бурятски: ${item.ru}`)||'';if(!value.trim())return;const ok=value.trim().toLocaleLowerCase('ru-RU')===item.bxr.toLocaleLowerCase('ru-RU');if(ok){const s=stateFor(item.id);s.seen=Number(s.seen||0)+1;if(s.state==='seen'){s.recognized=Number(s.recognized||0)+1;s.state=s.recognized>=2?'recognized':'seen';}else{s.active=Number(s.active||0)+1;s.state=s.active>=3?'automatic':'active';}localStorage.setItem(`buryad.vocab.${item.id}`,JSON.stringify(s));document.dispatchEvent(new CustomEvent('buryad:vocabulary-change'));}else{alert(`Опора: ${item.bxr}`);}});
}
initVocabulary().catch(console.error);
document.addEventListener('buryad:vocabulary-change',()=>initVocabulary());
