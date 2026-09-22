const $=q=>document.querySelector(q);
async function init(){
 const data=await fetch('/assets/data/native-audio-queue.json').then(r=>r.json()); const q=data.recordingQueue; let index=0,rec=null,chunks=[],url=null;
 const text=$('#recordingText'),counter=$('#recordingCounter'),start=$('#recordingStart'),stop=$('#recordingStop'),play=$('#recordingPlay'),audio=$('#recordingAudio'),download=$('#recordingDownload'),status=$('#recordingStatus');
 function render(){const item=q[index];text.textContent=item.text;counter.textContent=(index+1)+' / '+q.length;status.textContent=item.scenes.length?'Сцены: '+item.scenes.join(' · '):'';download.classList.add('hidden');play.disabled=true;}
 start.onclick=async()=>{const stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];rec=new MediaRecorder(stream);rec.ondataavailable=e=>chunks.push(e.data);rec.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const blob=new Blob(chunks,{type:rec.mimeType||'audio/webm'});if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(blob);audio.src=url;play.disabled=false;const variant=$('#recordingVariant').value;const speaker=($('#recordingSpeaker').value||'speaker').trim().replace(/\s+/g,'-');download.href=url;download.download=q[index].id+'__'+variant+'__'+speaker+'.webm';download.classList.remove('hidden');status.textContent='Прослушай запись. Если всё естественно — скачай файл.';};rec.start();start.disabled=true;stop.disabled=false;status.textContent='Идёт запись…';};
 stop.onclick=()=>{if(rec&&rec.state==='recording')rec.stop();start.disabled=false;stop.disabled=true;};
 play.onclick=()=>audio.play();
 $('#recordingPrev').onclick=()=>{index=Math.max(0,index-1);render();}; $('#recordingNext').onclick=()=>{index=Math.min(q.length-1,index+1);render();}; render();
}
init().catch(console.error);
