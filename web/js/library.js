const primaryViews={
  home:['home','daily'],
  today:['daily'],
  immersion:['immersion'],
  progress:['my-words','progress','challenge'],
  assessment:['assessment']
};
const libraryIds=['course','path','speaking','train','core','verbs','video'];

function routeTarget(){
  const hash=location.hash.replace('#','');
  if(!hash||hash==='home')return 'home';
  if(hash==='daily')return 'today';
  if(hash==='immersion')return 'immersion';
  if(hash==='my-words')return 'my-words';
  if(['progress','challenge'].includes(hash))return 'progress';
  if(hash==='assessment')return 'assessment';
  if(libraryIds.includes(hash))return hash;
  return 'home';
}

function syncViews(){
  const target=routeTarget();
  const allIds=[...new Set(Object.values(primaryViews).flat().concat(libraryIds,['assessment']))];
  const visible=new Set(target==='my-words'?['my-words']:(primaryViews[target]||[target]));
  for(const id of allIds){
    const el=document.getElementById(id);
    if(!el)continue;
    el.classList.toggle('app-view-hidden',!visible.has(id));
  }
  document.body.dataset.view=target;
  document.querySelectorAll('[data-nav-view]').forEach(a=>a.classList.toggle('active',a.dataset.navView===target));
  window.scrollTo({top:0,behavior:'instant'});
}

window.addEventListener('hashchange',syncViews);
document.querySelectorAll('.library-menu a').forEach(a=>a.addEventListener('click',()=>{const d=a.closest('details');if(d)d.open=false;}));
syncViews();
