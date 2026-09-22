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
 $('#vocabStateGrid').innerHTML=learned.length?learned.map(x=>`<article class="vocab-state-card"><span>${x.visual}</span><div><strong>${esc(x.bxr)}</strong><small>${x.learning.state==='seen'?'встречал':x.learning.state==='recognized'?'узнаю':x.learning.state==='active'?'говорю':'автоматически'}</small></div></article>`).join(''):'<p class="vocab-empty">Начни первую жизненную сцену — слова появятся здесь сами.</p>';
}
initVocabulary().catch(console.error);
document.addEventListener('buryad:vocabulary-change',()=>initVocabulary());
