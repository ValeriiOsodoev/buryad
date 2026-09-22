const libraryIds=['course','path','speaking','train','core','verbs','video'];
function syncLibrary(){
 const target=location.hash.replace('#','');
 for(const id of libraryIds){const el=document.getElementById(id);if(!el)continue;el.classList.toggle('library-secondary',target!==id);}
}
window.addEventListener('hashchange',syncLibrary);
document.querySelectorAll('.library-menu a').forEach(a=>a.addEventListener('click',()=>{const details=a.closest('details');if(details)details.open=false;}));
syncLibrary();