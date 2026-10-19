import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {MODELS,TABLE_SRC,TABLES,previewFor,PARENT_ORIGINS} from '../public/assets/models.js';
import {cameraFor,eventMatches,canRotate} from '../public/assets/studio-core.js';
const script=readFileSync(new URL('../public/assets/studio.js',import.meta.url),'utf8').replace(/^import.*;\n/gm,'');
const turn=()=>new Promise(r=>setImmediate(r));
async function fixture({reduce=false,embed=false,passive=false,holdRenderer=false}={}){
  const nodes=new Map(),globalEvents={},documentEvents={},timers=new Map(),raf=new Map(),observers=[],sent=[];let sequence=0,rendererCalls=0,resolveRenderer,rejectRenderer,showcaseHooks;
  const rendererTask=holdRenderer?new Promise((resolve,reject)=>{resolveRenderer=resolve;rejectRenderer=reject;}):Promise.resolve();
  class Node{
    constructor(id=''){this.id=id;this.dataset={};this.attributes={};this.events={};this.hidden=false;this.src='';this.disabled=false;this.textContent='';this.width=600;this.height=610;const classes=new Set();this.classList={add:x=>classes.add(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)};this.loaded=false;this.history=[];}
    addEventListener(name,fn){(this.events[name]??=[]).push(fn);}
    fire(name,detail={},extra={}){if(name==='load'&&this.id==='viewer')this.loaded=true;for(const f of this.events[name]||[])f({type:name,target:this,detail,...extra});}
    setAttribute(key,value){this.attributes[key]=String(value);this.history.push([key,value]);if(key==='src')this.loaded=false;}
    getAttribute(key){return this.attributes[key]??null;}
    toggleAttribute(key,value){if(value)this.attributes[key]='';else delete this.attributes[key];}
    hasAttribute(key){return key in this.attributes;}
    getBoundingClientRect(){return{width:this.width,height:this.height};}
    jumpCameraToGoal(){this.jumps=(this.jumps||0)+1;}
    showPoster(){this.posterShown=true;}
    dismissPoster(){this.posterShown=false;}
    showModal(){this.open=true;}
    show(){this.open=true;this.nonModal=true;}
    insertAdjacentElement(where,element){this.adjacent={where,element};}
    scrollIntoView(){this.scrolled=true;}
    close(){this.open=false;this.fire('close');}
    focus(){this.focused=true;document.activeElement=this;}
  }
  const get=id=>{if(!nodes.has(id))nodes.set(id,new Node(id));return nodes.get(id);};
  const modelButtons=Object.keys(MODELS).map(id=>{const n=get('choice-'+id);n.dataset.id=id;return n;});
  const lights=['golden','evening'].map(id=>{const n=get('light-'+id);n.dataset.light=id;return n;});
  const finishes=['walnut','stone'].map(id=>{const n=get('table-'+id);n.dataset.table=id;return n;});
  const document={hidden:false,referrer:embed?'https://mennoo.sbs/stands.php':'',documentElement:get('html'),body:{scrollHeight:9999},querySelector:s=>get(s==='.studio'?'studio':s.slice(1)),querySelectorAll:s=>s==='[data-table]'?finishes:s==='[data-id]'?modelButtons:s==='[data-camera-control]'?['auto-btn','reset-btn','view-btn','top-btn'].map(get):lights,addEventListener:(k,f)=>documentEvents[k]=f,fonts:{ready:Promise.resolve()}};
  get('studio').height=1280;
  const pref={matches:reduce,addEventListener:(k,f)=>pref.listener=f};
  const parent={postMessage:(data,origin)=>sent.push({data,origin})};
  const location={pathname:'/',href:'https://stands.mennoo.sbs/'+(embed?'?embed=1':''),reload(){this.reloaded=true;}};
  const history={replaceState(a,b,url){location.href=String(url);}};
  const context={ensureRenderer:()=>{rendererCalls++;return rendererTask;},MODELS,TABLE_SRC,PARENT_ORIGINS,cameraFor,eventMatches,canRotate,document,location,history,parent,URL,console,matchMedia:()=>pref,customElements:{whenDefined:()=>Promise.resolve()},setTimeout:(f,ms)=>{const id=++sequence;timers.set(id,{f,ms});return id;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:f=>{const id=++sequence;raf.set(id,f);return id;},addEventListener:(k,f)=>globalEvents[k]=f,open(){},ResizeObserver:class{constructor(f){this.f=f;}observe(){}},IntersectionObserver:class{constructor(f){this.f=f;observers.push(this);}observe(){}}};context.window=context;
  Object.assign(context,{TABLES,previewFor,createShowcase:hooks=>{showcaseHooks=hooks;return {manual(){},refresh(){},visibility(){}};}});
  vm.runInNewContext(script,context);await turn();if(!passive){get('explore-btn').fire('click');await turn();}
  function flush(){const batch=[...raf.values()];raf.clear();batch.forEach(f=>f());}
  flush();
  return{get,location,resolveRenderer,rejectRenderer,showcaseHooks,get rendererCalls(){return rendererCalls;},globalEvents,documentEvents,document,pref,sent,raf,timers,observers,parent,flush,
    load(id='boho'){get('viewer').fire('load',{url:new URL(MODELS[id].src,location.href).href});},
    close(){globalEvents.pagehide();}};
}
test('selecting an already loaded model does not restart its loader',async()=>{const f=await fixture();f.load();const before=f.get('viewer').history.length;f.get('choice-boho').fire('click');assert.equal(f.get('viewer').history.length,before);assert.equal(f.get('model-loading').hidden,true);f.close();});
test('late loads from an older model cannot dismiss the current loading state',async()=>{const f=await fixture();f.get('choice-mini-votsalo').fire('click');f.load('boho');assert.equal(f.get('model-loading').hidden,false);f.load('mini-votsalo');assert.equal(f.get('model-loading').hidden,true);assert.equal(f.get('model-name').textContent,'MINI ΒΟΤΣΑΛΟ');f.close();});
test('a model error leaves a poster and offers a real retry with a new request URL',async()=>{const f=await fixture();const old=f.get('viewer').getAttribute('src');f.get('viewer').fire('error',{url:new URL(old,f.location.href).href});assert.equal(f.get('model-error').hidden,false);assert.equal(f.get('auto-btn').disabled,true);f.get('retry-btn').fire('click');assert.notEqual(f.get('viewer').getAttribute('src'),old);assert.equal(f.get('model-error').hidden,true);assert.equal(f.get('viewer').posterShown,true);f.close();});
test('autoplay stops offscreen, in hidden tabs and under reduced motion',async()=>{const f=await fixture();f.load();f.get('auto-btn').fire('click');assert.equal(f.get('viewer').hasAttribute('auto-rotate'),true);f.observers[0].f([{isIntersecting:false}]);assert.equal(f.get('viewer').hasAttribute('auto-rotate'),false);f.observers[0].f([{isIntersecting:true}]);assert.equal(f.get('viewer').hasAttribute('auto-rotate'),true);f.document.hidden=true;f.documentEvents.visibilitychange();assert.equal(f.get('viewer').hasAttribute('auto-rotate'),false);f.document.hidden=false;f.pref.matches=true;f.pref.listener();assert.equal(f.get('auto-btn').disabled,false);assert.equal(f.get('viewer').hasAttribute('auto-rotate'),false);f.close();});
test('iframe height uses intrinsic content, can shrink, and authenticates the parent',async()=>{const f=await fixture({embed:true});assert.equal(f.sent.at(-1).data.height,1280);f.get('studio').height=1050;f.globalEvents.message({origin:'https://evil.example',source:f.parent,data:{type:'mennoo-stand-studio:host',visible:false}});f.flush();assert.equal(f.sent.at(-1).data.height,1280);f.globalEvents.message({origin:'https://mennoo.sbs',source:f.parent,data:{type:'mennoo-stand-studio:host',visible:true}});f.flush();assert.equal(f.sent.at(-1).data.height,1050);assert.equal(f.sent.at(-1).origin,'https://mennoo.sbs');f.close();});
test('top view and QR close-up pause rotation and closing restores focus',async()=>{const f=await fixture();f.load();f.get('auto-btn').fire('click');f.get('top-btn').fire('click');assert.match(f.get('viewer').getAttribute('camera-orbit'),/0deg 8deg/);assert.equal(f.get('viewer').hasAttribute('auto-rotate'),false);f.get('qr-open').fire('click');assert.equal(f.get('qr-dialog').open,true);f.get('qr-close').fire('click');assert.equal(f.get('qr-open').focused,true);f.close();});
test('camera presets respect actual model height and give narrow screens more clearance',()=>{assert.notEqual(cameraFor(.065).target,cameraFor(.025).target);const radius=c=>Number(c.orbit.split(' ').at(-1).slice(0,-1));assert.ok(radius(cameraFor(.065,'wide',.6))>radius(cameraFor(.065,'wide',1.2)));for(const h of [.025,.065])assert.ok(radius(cameraFor(h,'close',.6))>.12);});
test('embedded QR opens next to its trigger and resizing can follow its content',async()=>{const f=await fixture({embed:true});f.get('qr-open').fire('click');assert.equal(f.get('qr-dialog').nonModal,true);assert.equal(f.get('qr-open').adjacent.element,f.get('qr-dialog'));assert.equal(f.get('qr-open').getAttribute('aria-expanded'),'true');assert.equal(f.get('qr-dialog').scrolled,true);f.get('qr-close').fire('click');assert.equal(f.get('qr-open').getAttribute('aria-expanded'),'false');f.close();});

test('initial view does not download the SDK or models, and selecting a poster remains passive',async()=>{
 const f=await fixture({passive:true});assert.equal(f.rendererCalls,0);assert.equal(f.get('viewer').getAttribute('src'),null);assert.equal(f.get('explore-gate').hidden,false);assert.equal(f.get('viewer').hasAttribute('camera-controls'),false);
 f.get('choice-mini-polygon').fire('click');assert.equal(f.rendererCalls,0);assert.equal(f.get('viewer').getAttribute('src'),null);assert.equal(new URL(f.location.href).pathname,'/mini-polygon');
 f.get('explore-btn').fire('click');await turn();assert.equal(f.rendererCalls,1);assert.equal(f.get('viewer').getAttribute('src'),MODELS['mini-polygon'].src);assert.equal(f.get('auto-btn').disabled,true);
 f.load('mini-polygon');assert.equal(f.get('viewer').posterShown,false);assert.equal(f.get('viewer').hasAttribute('camera-controls'),true);f.close();
});
test('programmatic camera events do not cancel auto; a real touch does',async()=>{
 const f=await fixture();f.load();f.get('auto-btn').fire('click');f.get('viewer').fire('camera-change',{source:'none'});assert.equal(f.get('viewer').hasAttribute('auto-rotate'),true);assert.equal(f.get('auto-label').textContent,'Παύση');
 f.get('viewer').fire('pointerdown');assert.equal(f.get('viewer').hasAttribute('auto-rotate'),false);assert.equal(f.get('auto-label').textContent,'Περιστροφή');f.close();
});
test('locking disables the canvas and stops rotation; re-entry reuses the loaded model',async()=>{
 const f=await fixture();f.load();f.get('auto-btn').fire('click');f.get('lock-btn').fire('click');assert.equal(f.get('viewer').hasAttribute('auto-rotate'),false);assert.equal(f.get('viewer').hasAttribute('camera-controls'),false);assert.equal(f.get('explore-btn').focused,true);
 const sources=f.get('viewer').history.filter(([key])=>key==='src').length;f.get('explore-btn').fire('click');await turn();assert.equal(f.get('viewer').hasAttribute('camera-controls'),true);assert.equal(f.get('viewer').history.filter(([key])=>key==='src').length,sources);assert.equal(f.rendererCalls,1);f.close();
});
test('reduced motion starts still but permits an explicit requested rotation',async()=>{
 const f=await fixture({reduce:true});f.load();assert.equal(f.get('viewer').hasAttribute('auto-rotate'),false);f.get('auto-btn').fire('click');assert.equal(f.get('viewer').hasAttribute('auto-rotate'),true);f.close();
});

test('locking during SDK download prevents a late activation and model/table requests',async()=>{
 const f=await fixture({holdRenderer:true});f.get('lock-btn').fire('click');f.resolveRenderer();await turn();
 assert.equal(f.get('explore-gate').hidden,false);assert.equal(f.get('viewer').getAttribute('src'),null);assert.equal(f.get('cafe-table').getAttribute('src'),null);assert.equal(f.get('model-error').hidden,true);f.close();
});
test('rapid activation-lock-activation commits only the current model load',async()=>{
 const f=await fixture({holdRenderer:true});f.get('lock-btn').fire('click');f.get('explore-btn').fire('click');f.resolveRenderer();await turn();
 assert.equal(f.get('viewer').history.filter(([key])=>key==='src').length,1);assert.equal(f.get('cafe-table').history.filter(([key])=>key==='src').length,1);assert.equal(f.get('model-loading').hidden,false);f.load();assert.equal(f.get('viewer').hasAttribute('camera-controls'),true);f.close();
});
test('changing design during SDK download retains loading feedback and loads the chosen design',async()=>{
 const f=await fixture({holdRenderer:true});f.get('choice-chonaki').fire('click');assert.equal(f.get('model-loading').hidden,false);assert.ok([...f.timers.values()].some(t=>t.ms===25000));
 f.resolveRenderer();await turn();assert.equal(f.get('viewer').getAttribute('src'),MODELS.chonaki.src);assert.equal(f.get('viewer').history.filter(([key])=>key==='src').length,1);f.close();
});
test('a late SDK failure cannot cover the locked activation button',async()=>{
 const f=await fixture({holdRenderer:true});f.get('lock-btn').fire('click');f.rejectRenderer(new Error('offline'));await turn();assert.equal(f.get('model-error').hidden,true);assert.equal(f.get('explore-gate').hidden,false);f.close();
});
test('returning from back-forward cache recovers an interrupted model load',async()=>{
 const f=await fixture();f.globalEvents.pagehide();assert.equal(f.timers.size,0);f.globalEvents.pageshow({persisted:true});assert.ok([...f.timers.values()].some(t=>t.ms===35000));assert.match(f.get('viewer').getAttribute('src'),/retry=/);f.close();
});
test('a late model failure stays quiet while locked and re-entry retries its URL',async()=>{
 const f=await fixture();const src=f.get('viewer').getAttribute('src');f.get('lock-btn').fire('click');f.get('viewer').fire('error',{url:src});assert.equal(f.get('model-error').hidden,true);f.get('explore-btn').fire('click');await turn();assert.notEqual(f.get('viewer').getAttribute('src'),src);assert.match(f.get('viewer').getAttribute('src'),/retry=/);f.close();
});
test('table retry does not reload or disable a ready stand',async()=>{
 const f=await fixture();f.load();const src=f.get('viewer').getAttribute('src');f.get('cafe-table').fire('error');assert.equal(f.get('table-status').hidden,false);f.get('retry-table-btn').fire('click');assert.match(f.get('cafe-table').getAttribute('src'),/retry=/);assert.equal(f.get('viewer').getAttribute('src'),src);assert.equal(f.get('viewer').hasAttribute('camera-controls'),true);f.close();
});
test('keyboard focus follows activation, and Escape restores focus to the gate',async()=>{
 const f=await fixture();assert.equal(f.document.activeElement,f.get('lock-btn'));f.load();assert.equal(f.document.activeElement,f.get('viewer'));let prevented=false;
 f.get('scene').fire('keydown',{}, {key:'Escape',preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(f.get('viewer').hasAttribute('camera-controls'),false);assert.equal(f.document.activeElement,f.get('explore-btn'));f.close();
});
test('each design selects matching mobile and desktop preview assets without starting WebGL',async()=>{
 const f=await fixture({passive:true});
 for(const id of Object.keys(MODELS)){
  f.get('choice-'+id).fire('click');
  assert.equal(f.get('poster-img').src,MODELS[id].poster);
  assert.equal(f.get('poster-mobile').srcset,MODELS[id].posterMobile);
  assert.match(MODELS[id].poster,/\.[a-f0-9]{12}\.webp$/);
  assert.match(MODELS[id].posterMobile,/-mobile\.[a-f0-9]{12}\.webp$/);
 }
 assert.equal(f.rendererCalls,0);f.close();
});
test('a device without WebGL keeps a preview, disables 3D controls and explains the limitation',async()=>{
 const f=await fixture({holdRenderer:true});
 f.rejectRenderer(Object.assign(new Error('Unavailable'),{code:'WEBGL_UNAVAILABLE'}));await turn();
 assert.equal(f.get('model-error').hidden,false);
 assert.match(f.get('error-message').textContent,/προεπισκοπήσεις/);
 assert.equal(f.get('viewer').posterShown,true);
 assert.equal(f.get('viewer').getAttribute('src'),null);
 assert.equal(f.get('auto-btn').disabled,true);
 f.get('lock-btn').fire('click');assert.equal(f.get('explore-gate').hidden,false);f.close();
});

test('table material selection updates both responsive previews without activating graphics',async()=>{
 const f=await fixture({passive:true});f.get('table-stone').fire('click');
 assert.equal(f.get('poster-img').src,TABLES.stone.posters.boho.poster);
 assert.equal(f.get('poster-mobile').srcset,TABLES.stone.posters.boho.posterMobile);
 assert.equal(f.rendererCalls,0);
 f.get('choice-mini-polygon').fire('click');
 assert.equal(f.get('poster-img').src,TABLES.stone.posters['mini-polygon'].poster);
 f.get('table-walnut').fire('click');assert.equal(f.get('poster-img').src,MODELS['mini-polygon'].poster);f.close();
});
test('changing the 3D tabletop preserves the loaded stand and ignores stale table failures',async()=>{
 const f=await fixture();f.load();const stand=f.get('viewer').getAttribute('src');
 f.get('table-stone').fire('click');assert.equal(f.get('cafe-table').getAttribute('src'),TABLES.stone.src);
 assert.equal(f.get('viewer').getAttribute('src'),stand);assert.equal(f.get('auto-btn').disabled,false);
 f.get('cafe-table').fire('error',{url:TABLE_SRC});assert.equal(f.get('table-status').hidden,true);
 f.get('cafe-table').fire('error',{url:TABLES.stone.src});assert.equal(f.get('table-status').hidden,false);f.close();
});

// Regression: zoom must not carry from the QR close-up into the wide finale.
test('presentation final camera restores distance, angle and lens after a top view or pinch',async()=>{
 const f=await fixture();f.load();const viewer=f.get('viewer');
 f.showcaseHooks.camera('top',true,2);
 assert.match(viewer.getAttribute('camera-orbit'),/^0deg 8deg 0\.3000m$/);
 viewer.setAttribute('field-of-view','27deg');
 f.showcaseHooks.camera('wide',false,3);
 assert.equal(viewer.getAttribute('camera-orbit'),cameraFor(.065,'wide',600/610).orbit);
 assert.equal(viewer.getAttribute('field-of-view'),'36deg');
 assert.equal(viewer.hasAttribute('auto-rotate'),false);
 f.close();
});
test('all presets leave horizontal clearance even in the formerly oversized portrait embed',()=>{
 for(const h of [.025,.065])for(const aspect of [.3,.45,.6,1,1.8])for(const view of ['wide','close','top']){
  const c=cameraFor(h,view,aspect),r=parseFloat(c.orbit.split(' ')[2]);
  // Conservative 70 mm envelope, 50 mm foreground depth, at the minimum 36° FOV.
  const occupancy=.07/(2*(r-.05)*Math.tan(Math.PI/10)*aspect);
  assert.ok(occupancy<.58,`${view} / ${h} / ${aspect}: ${occupancy}`);
 }
});
