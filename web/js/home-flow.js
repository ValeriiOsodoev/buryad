function hasStarted(){
  return Object.keys(localStorage).some(k=>k.startsWith('buryad.immersion.')||k.startsWith('buryad.vocab.'));
}
function completedSceneCount(){
  return Object.keys(localStorage).filter(k=>k.startsWith('buryad.immersion.')).filter(k=>{try{return JSON.parse(localStorage.getItem(k)||'{}').completed===true;}catch{return false;}}).length;
}
function updateHome(){
  const started=hasStarted(),count=completedSceneCount();
  const title=document.querySelector('#todayTitle'),sub=document.querySelector('#todaySubtitle'),cta=document.querySelector('#heroPrimaryAction'),stats=document.querySelector('#heroStats');
  if(!title||!sub||!cta)return;
  if(!started){
    title.textContent='Начни с первой живой сцены';
    sub.textContent='10 минут. Чай, вода, чашка — смысл понятен из ситуации.';
    cta.href='#immersion'; cta.firstChild.textContent='Начать первую сцену ';
    if(stats)stats.textContent='Никакой подготовки не нужно';
  }else{
    title.textContent='Продолжи сегодняшнюю практику';
    sub.textContent='Сайт собрал короткий маршрут из того, что тебе сейчас полезнее.';
    cta.href='#daily'; cta.firstChild.textContent='Продолжить сегодня ';
    if(stats)stats.textContent=count?count+' жизненных сцен уже пройдено':'Продолжай с того места, где остановился';
  }
}
updateHome();
document.addEventListener('buryad:daily-complete',updateHome);
document.addEventListener('buryad:vocabulary-change',updateHome);
