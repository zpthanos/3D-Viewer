/** View distances are metres, based on the actual 25 / 65 mm products. */
export function cameraFor(height,view='wide',aspect=1){
  const small=height<.04;
  const phi=view==='top'?8:view==='close'?57:67;
  const radius=(view==='top'?.15:view==='close'?(small?.165:.22):(small?.43:.49))*Math.max(1,.75/Math.max(.45,aspect));
  const target=view==='top'?height-.003:height*(view==='close'?.55:.35);
  return {orbit:`${view==='top'?0:24}deg ${phi}deg ${radius.toFixed(4)}m`,target:`0m ${target.toFixed(5)}m 0m`};
}
export function eventMatches(event,expected,base){
  if(!event.detail?.url)return true;
  try{return new URL(event.detail.url,base).href===new URL(expected,base).href;}catch{return false;}
}
export function canRotate(s){return s.wanted&&s.ready&&s.engaged&&s.inView&&!s.hidden&&s.parentVisible;}
