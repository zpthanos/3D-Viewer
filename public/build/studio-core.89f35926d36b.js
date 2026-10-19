/** Metres, for the actual 25 / 65 mm products (65–70 mm across).
 * Keep the table in every preset; the separate QR panel handles scanning.
 * Do not clamp aspect: very tall embeds still need horizontal clearance.
 */
export function cameraFor(height,view='wide',aspect=1){
  const small=height<.04;
  const phi=view==='top'?8:view==='close'?57:67;
  const ratio=Number.isFinite(aspect)&&aspect>0?aspect:1;
  const radius=(view==='top'?.30:view==='close'?(small?.30:.34):(small?.48:.52))*Math.max(1,.75/ratio);
  const target=view==='top'?height-.003:height*(view==='close'?.55:.35);
  return {orbit:`${view==='top'?0:24}deg ${phi}deg ${radius.toFixed(4)}m`,target:`0m ${target.toFixed(5)}m 0m`,fov:'36deg'};
}
export function eventMatches(event,expected,base){
  if(!event.detail?.url)return true;
  try{return new URL(event.detail.url,base).href===new URL(expected,base).href;}catch{return false;}
}
export function canRotate(s){return s.wanted&&s.ready&&s.engaged&&s.inView&&!s.hidden&&s.parentVisible;}
