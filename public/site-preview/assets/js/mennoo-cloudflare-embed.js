// Copy this file into /assets/js/mennoo-cloudflare-embed.js on Apache.
window.addEventListener('message',(event)=>{
  if(event.origin!=='https://stands.mennoo.cfd')return;
  const frame=document.getElementById('mennoo-3d-studio');
  if(!frame || event.source!==frame.contentWindow)return;
  const msg=event.data;
  if(!msg || msg.type!=='mennoo-stand-studio:height')return;
  const h=Number(msg.height);
  if(Number.isFinite(h) && h>=450 && h<=2500)frame.style.height=`${Math.ceil(h)+4}px`;
});
