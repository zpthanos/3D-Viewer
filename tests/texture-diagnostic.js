// Preview-only browser regression fixture. Copy with its HTML to public on a QA branch.
import {MODELS,TABLE_SRC} from './assets/models.js';
const list=document.querySelector('#checks');
let failures=0,count=0;
function record(text,success){const item=document.createElement('li');item.textContent=(success?'PASS ':'FAIL ')+text;list.append(item);if(!success)failures++;}
try{
 await WebAssembly.compile(new Uint8Array([0,97,115,109,1,0,0,0]));record('WebAssembly allowed by deployed CSP',true);
}catch(error){record('WebAssembly: '+error.message,false);}
for(const url of [...Object.values(MODELS).map(m=>m.src),TABLE_SRC]){
 try{
  const response=await fetch(url);if(!response.ok)throw new Error('HTTP '+response.status);
  const bytes=await response.arrayBuffer(),view=new DataView(bytes),jsonLength=view.getUint32(12,true);
  const gltf=JSON.parse(new TextDecoder().decode(bytes.slice(20,20+jsonLength))),start=28+jsonLength;
  for(const [index,image] of gltf.images.entries()){
   const buffer=gltf.bufferViews[image.bufferView],offset=start+(buffer.byteOffset||0);
   const blob=new Blob([bytes.slice(offset,offset+buffer.byteLength)],{type:image.mimeType}),blobURL=URL.createObjectURL(blob);
   try{
    const decoded=await createImageBitmap(await (await fetch(blobURL)).blob());
    if(!decoded.width||!decoded.height)throw new Error('Empty texture');
    count++;record(url.split('/').pop()+' texture '+index+' · '+decoded.width+'×'+decoded.height,true);
    if((url.includes('/boho.')&&index===1)||(url.includes('/cafe-table.')&&index===0)){
     const canvas=document.createElement('canvas');canvas.width=240;canvas.height=240;
     canvas.getContext('2d').drawImage(decoded,0,0,240,240);document.querySelector('#images').append(canvas);
    }
    decoded.close();
   }finally{URL.revokeObjectURL(blobURL);}
  }
 }catch(error){record(url+': '+error.message,false);}
}
document.querySelector('#result').textContent=failures?'FAIL · '+failures+' errors':'PASS · '+count+' embedded textures decoded';
