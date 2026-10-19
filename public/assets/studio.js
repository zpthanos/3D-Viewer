import {MODELS,TABLE_SRC,TABLES,previewFor,PARENT_ORIGINS} from './models.js?v=framing-20261012c';
import {cameraFor,eventMatches,canRotate} from './studio-core.js?v=framing-20261012c';
import {ensureRenderer} from './renderer.js?v=framing-20261012c';
import {createShowcase} from './showcase.js?v=framing-20261012c';
const $=s=>document.querySelector(s);
const viewer=$('#viewer'),scene=$('#scene'),auto=$('#auto-btn'),gate=$('#explore-gate');
const loading=$('#model-loading'),error=$('#model-error'),progress=$('#progress');
const query=new URL(location.href).searchParams,embed=query.get('embed')==='1',keys=Object.keys(MODELS);
const fromPath=location.pathname.split('/').filter(Boolean)[0];
let active=Object.hasOwn(MODELS,query.get('design'))?query.get('design'):Object.hasOwn(MODELS,fromPath)?fromPath:'boho';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let defined=false,ready=false,engaged=false,wanted=false,inView=true,parentVisible=true,view='wide',expected='',ticket=0,timer=0,activation=0,loadFailed=false,tableFailed=false,tableTicket=0;
let parentOrigin='',heightRAF=0,lastHeight=0,lastSize='';
let tableStyle='walnut',tableExpected='',showcase=null;
if(embed)document.documentElement.classList.add('embed');
try{const origin=new URL(document.referrer).origin;if(PARENT_ORIGINS.includes(origin))parentOrigin=origin;}catch{}
function post(data){if(embed&&parentOrigin&&parent!==window)parent.postMessage(data,parentOrigin);}
function notifyHeight(){
  if(!embed||heightRAF)return;
  heightRAF=requestAnimationFrame(()=>{heightRAF=0;const height=Math.ceil($('.studio').getBoundingClientRect().height);if(Math.abs(height-lastHeight)>1){lastHeight=height;post({type:'mennoo-stand-studio:height',height});}});
}
function rotate(){
  const run=canRotate({wanted,ready,engaged,inView,hidden:document.hidden,parentVisible});
  viewer.toggleAttribute('auto-rotate',run);
  auto.setAttribute('aria-pressed',String(wanted));auto.classList.toggle('active',wanted);
  $('#auto-label').textContent=wanted?'Παύση':'Περιστροφή';
  auto.setAttribute('aria-label',wanted?'Παύση αυτόματης περιστροφής':'Έναρξη αυτόματης περιστροφής');
}
function controls(){
  const enabled=engaged&&ready;
  viewer.setAttribute('aria-busy',String(engaged&&!ready&&!loadFailed));
  viewer.toggleAttribute('camera-controls',enabled);viewer.setAttribute('tabindex',enabled?'0':'-1');
  scene.dataset.interactive=String(enabled);
  gate.hidden=engaged;$('#lock-btn').hidden=!engaged;
  for(const button of document.querySelectorAll('[data-camera-control]'))button.disabled=!enabled;
  rotate();
}
function applyView(next,snap=false){
  view=next;const box=scene.getBoundingClientRect();
  const c=cameraFor(MODELS[active].height,next,box.width/Math.max(box.height,1));
  // Reset lens zoom too: otherwise a previous pinch carries into the wide finale.
  viewer.setAttribute('field-of-view',c.fov);
  viewer.setAttribute('camera-orbit',c.orbit);viewer.setAttribute('camera-target',c.target);
  $('#view-btn').setAttribute('aria-pressed',String(next==='close'));$('#top-btn').setAttribute('aria-pressed',String(next==='top'));
  if(snap||reduced.matches)viewer.jumpCameraToGoal?.();
}
function failed(message){
  clearTimeout(timer);ready=false;wanted=false;loadFailed=true;loading.hidden=true;
  error.hidden=!engaged;$('#error-message').textContent=message;viewer.showPoster?.();controls();notifyHeight();
  showcase?.refresh();
  if(engaged&&document.activeElement===$('#lock-btn'))$('#retry-btn').focus({preventScroll:true});
}
function loadTable(force=false){
  const table=$('#cafe-table');
  const source=TABLES[tableStyle].src;
  if(table.getAttribute('src')===source&&!force)return;
  tableFailed=false;$('#table-status').hidden=true;
  tableExpected=source+(force?`?retry=${++tableTicket}`:'');
  table.setAttribute('src',tableExpected);
}
function updatePoster(){
  const m=previewFor(active,tableStyle);
  $('#poster-img').src=m.poster;$('#poster-mobile').srcset=m.posterMobile;viewer.setAttribute('poster',m.poster);
}
for(const button of document.querySelectorAll('[data-table]'))button.addEventListener('click',()=>{
  if(!Object.hasOwn(TABLES,button.dataset.table)||button.dataset.table===tableStyle)return;
  tableStyle=button.dataset.table;scene.dataset.table=tableStyle;updatePoster();
  for(const other of document.querySelectorAll('[data-table]'))other.setAttribute('aria-pressed',String(other===button));
  if(defined&&engaged)loadTable();
});
function loadModel(force=loadFailed){
  if(!defined||!engaged)return;
  ticket++;const current=ticket;ready=false;loadFailed=false;controls();error.hidden=true;loading.hidden=false;progress.textContent='';
  expected=MODELS[active].src+(force?`?retry=${ticket}`:'');
  viewer.showPoster?.();applyView('wide',true);viewer.setAttribute('src',expected);
  clearTimeout(timer);timer=setTimeout(()=>{if(current===ticket&&!ready)failed('Η φόρτωση καθυστερεί. Η προεπισκόπηση παραμένει διαθέσιμη.');},35000);
}
function select(id,update=true){
  if(!Object.hasOwn(MODELS,id)||id===active&&expected)return;
  const previous=active;active=id;ready=false;expected='';clearTimeout(timer);wanted=false;
  const m=MODELS[id];$('#model-name').textContent=m.name;$('#model-description').textContent=m.description;$('#model-count').textContent=`0${keys.indexOf(id)+1} / 04`;
  $('#model-height').textContent=`${Math.round(m.height*1000)} mm`;
  updatePoster();viewer.setAttribute('alt',`${m.name}, μαύρο PLA, εσοχή QR 41 επί 41 επί 3 χιλιοστά`);
  for(const node of document.querySelectorAll('[data-id]')){const yes=node.dataset.id===id;node.classList.toggle('active',yes);node.setAttribute('aria-pressed',String(yes));}
  viewer.showPoster?.();error.hidden=true;loading.hidden=true;controls();
  if(engaged){if(defined)loadModel();else{engaged=false;engage(false);}}
  if(update){const next=new URL(location.href);next.pathname='/'+id;next.searchParams.delete('design');history.replaceState(null,'',next);post({type:'mennoo-stand-studio:design',design:id});}
  if(previous!==id&&!reduced.matches)$('#model-name').animate?.([{opacity:.4,transform:'translateY(7px)'},{opacity:1,transform:'none'}],{duration:280,easing:'ease-out'});
  document.title=`${m.name} | MENNOO Stand Studio`;notifyHeight();
}
async function engage(focus=true){
  if(engaged)return;
  const current=++activation,retry=loadFailed;
  engaged=true;loadFailed=false;error.hidden=true;controls();
  if(focus)$('#lock-btn').focus({preventScroll:true});
  if(ready){loadTable(tableFailed);viewer.dismissPoster?.();if(focus)viewer.focus({preventScroll:true});return;}
  if(defined){loadTable(tableFailed);loadModel(retry);return;}
  loading.hidden=false;$('#loading-message').textContent='Φορτώνεται η προβολή 3D…';
  clearTimeout(timer);timer=setTimeout(()=>{if(current===activation&&!defined&&engaged)failed('Η προβολή 3D δεν φορτώθηκε. Δοκιμάστε ξανά όταν έχετε σύνδεση.');},25000);
  try{
    await ensureRenderer();defined=true;
    if(current!==activation||!engaged)return;
    clearTimeout(timer);loadTable(tableFailed);loadModel();
  }catch(reason){
    if(current===activation&&engaged)failed(reason?.code==='WEBGL_UNAVAILABLE'?'Η συσκευή δεν μπορεί να εμφανίσει 3D αυτή τη στιγμή. Μπορείτε να δείτε όλα τα σχέδια στις προεπισκοπήσεις.':'Η προβολή 3D δεν ήταν διαθέσιμη. Μπορείτε να δοκιμάσετε ξανά.');
  }
}
function lock(){activation++;engaged=false;wanted=false;clearTimeout(timer);loading.hidden=true;error.hidden=true;controls();if(defined)applyView('wide');$('#explore-btn').focus({preventScroll:true});}
$('#explore-btn').addEventListener('click',()=>engage());$('#lock-btn').addEventListener('click',lock);
$('#retry-btn').addEventListener('click',()=>{if(defined)loadModel(true);else{engaged=false;engage();}});
$('#retry-table-btn').addEventListener('click',()=>{if(defined)loadTable(true);});
scene.addEventListener('keydown',event=>{if(event.key==='Escape'&&engaged){event.preventDefault();lock();}});
for(const node of document.querySelectorAll('[data-id]'))node.addEventListener('click',()=>select(node.dataset.id));
for(const node of document.querySelectorAll('.light-choice[data-light]'))node.addEventListener('click',()=>{
  scene.dataset.light=node.dataset.light;viewer.setAttribute('exposure',node.dataset.light==='evening'?'1.05':'1.35');
  for(const other of document.querySelectorAll('.light-choice[data-light]'))other.setAttribute('aria-pressed',String(other===node));
});
auto.addEventListener('click',()=>{if(engaged&&ready){wanted=!wanted;rotate();}});
$('#view-btn').addEventListener('click',()=>{if(ready&&engaged){wanted=false;rotate();applyView(view==='close'?'wide':'close');}});
$('#top-btn').addEventListener('click',()=>{if(ready&&engaged){wanted=false;rotate();applyView('top');}});
$('#reset-btn').addEventListener('click',()=>{if(ready&&engaged){wanted=false;rotate();applyView('wide');}});
// Only real interaction with the canvas stops the tour. SDK camera-change events
// also fire during programmatic motion and must never immediately cancel autoplay.
function manual(){if(wanted){wanted=false;rotate();}showcase?.manual();}
viewer.addEventListener('pointerdown',manual,{passive:true});viewer.addEventListener('wheel',manual,{passive:true});
viewer.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageUp','PageDown'].includes(event.key))manual();});
viewer.addEventListener('progress',event=>{if(expected&&!ready&&eventMatches(event,expected,location.href)&&Number.isFinite(event.detail?.totalProgress))progress.textContent=`${Math.round(Math.max(0,Math.min(1,event.detail.totalProgress))*100)}%`;});
viewer.addEventListener('load',event=>{
  if(event.target!==viewer||!expected||!eventMatches(event,expected,location.href)||viewer.loaded===false)return;
  clearTimeout(timer);ready=true;loadFailed=false;loading.hidden=true;error.hidden=true;
  viewer.dismissPoster?.();applyView('wide',true);controls();
  showcase?.refresh();
  if(engaged&&document.activeElement===$('#lock-btn'))viewer.focus({preventScroll:true});
  $('#load-status').textContent=`Το ${MODELS[active].name} είναι έτοιμο. Σύρετε οριζόντια ή επιλέξτε αυτόματη περιστροφή.`;
});
viewer.addEventListener('error',event=>{if(event.target===viewer&&expected&&eventMatches(event,expected,location.href))failed('Το μοντέλο δεν φορτώθηκε. Δοκιμάστε ξανά ή επιλέξτε άλλο σχέδιο.');});
$('#cafe-table').addEventListener('error',event=>{if(eventMatches(event,tableExpected,location.href)){tableFailed=true;$('#table-status').hidden=false;}});
$('#cafe-table').addEventListener('load',event=>{if(eventMatches(event,tableExpected,location.href)){tableFailed=false;$('#table-status').hidden=true;}});
reduced.addEventListener('change',()=>{if(reduced.matches)manual();});
document.addEventListener('visibilitychange',rotate);
if('IntersectionObserver'in window)new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;rotate();showcase?.visibility(inView&&parentVisible);}).observe(scene);
addEventListener('pagehide',()=>{parentVisible=false;rotate();clearTimeout(timer);});
addEventListener('pageshow',event=>{
  parentVisible=true;
  if(event.persisted&&engaged&&!ready&&error.hidden){
    if(defined)loadModel(true);else{engaged=false;engage(false);}
  }
  rotate();lastHeight=0;notifyHeight();
});
addEventListener('message',event=>{
  if(!embed||event.source!==parent||!PARENT_ORIGINS.includes(event.origin)||event.data?.type!=='mennoo-stand-studio:host')return;
  const firstContact=parentOrigin!==event.origin;
  parentOrigin=event.origin;parentVisible=event.data.visible===true;rotate();showcase?.visibility(inView&&parentVisible);lastHeight=0;notifyHeight();
  if(firstContact)post({type:'mennoo-stand-studio:design',design:active});
});
if('ResizeObserver'in window){
  new ResizeObserver(notifyHeight).observe($('.studio'));
  new ResizeObserver(([entry])=>{const size=`${Math.round(entry.contentRect.width)}:${Math.round(entry.contentRect.height)}`;if(size!==lastSize){lastSize=size;if(ready)applyView(view,true);}}).observe(scene);
}else addEventListener('resize',()=>{notifyHeight();if(ready)applyView(view,true);},{passive:true});
document.fonts?.ready.then(notifyHeight);addEventListener('load',notifyHeight);
const dialog=$('#qr-dialog'),qrButton=$('#qr-open');
if(embed){qrButton.insertAdjacentElement('afterend',dialog);qrButton.setAttribute('aria-controls','qr-dialog');qrButton.setAttribute('aria-expanded','false');}
qrButton.addEventListener('click',()=>{
  const method=embed?'show':'showModal';if(typeof dialog[method]!=='function'){open('https://mennoo.app/b/167026e5','_blank','noopener,noreferrer');return;}
  if(dialog.open){dialog.close();return;}manual();dialog[method]();
  if(embed){qrButton.setAttribute('aria-expanded','true');notifyHeight();dialog.scrollIntoView({block:'nearest',behavior:'auto'});}
});
$('#qr-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{if(embed){qrButton.setAttribute('aria-expanded','false');notifyHeight();}qrButton.focus({preventScroll:true});});
select(active,false);
showcase=createShowcase({
  activate:engage,
  getState:()=>({ready,failed:loadFailed}),
  camera:(next,playing,index)=>{
    viewer.setAttribute('interpolation-decay',reduced.matches?'0':'260');
    applyView(next,reduced.matches);
    if(index===0){
      const c=cameraFor(MODELS[active].height,'wide',scene.clientWidth/Math.max(scene.clientHeight,1));
      const radius=parseFloat(c.orbit.split(' ')[2])*1.18;
      viewer.setAttribute('camera-orbit',`-12deg 67deg ${radius.toFixed(4)}m`);
    }
    wanted=playing&&index===1;rotate();
  },
  reset:()=>{wanted=false;rotate();viewer.setAttribute('interpolation-decay','90');if(ready)applyView('wide');},
  notifyHeight
});
// A ready signal complements the parent's load event. No wildcard target origins.
if(embed&&parent!==window){
  const origins=parentOrigin?[parentOrigin]:PARENT_ORIGINS;
  for(const origin of origins)parent.postMessage({type:'mennoo-stand-studio:ready'},origin);
}
