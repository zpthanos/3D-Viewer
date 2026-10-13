// Preview branch only. Mirrors the real host's authenticated height protocol.
const frame=document.querySelector('iframe'),report=document.querySelector('#report');
let changes=0;
function notify(){frame.contentWindow?.postMessage({type:'mennoo-stand-studio:host',visible:!document.hidden},location.origin);}
for(const button of document.querySelectorAll('[data-width]'))button.addEventListener('click',()=>{
  frame.style.width=button.dataset.width+'px';notify();
});
addEventListener('message',event=>{
  if(event.source!==frame.contentWindow||event.origin!==location.origin||event.data?.type!=='mennoo-stand-studio:height')return;
  const height=event.data.height;
  if(!Number.isFinite(height)||height<320||height>4000)return;
  frame.style.height=height+'px';changes++;
  report.textContent=`${Math.round(frame.getBoundingClientRect().width)} × ${height} px · height reports: ${changes}`;
});
frame.addEventListener('load',notify);
document.addEventListener('visibilitychange',notify);
