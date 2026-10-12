// Download the renderer only after a deliberate tap. No WebGL or heavy model request on entry.
let pending;
export function supportsWebGL(documentObject=document){
  try{
    const canvas=documentObject.createElement('canvas');
    const gl=canvas.getContext('webgl2',{alpha:true,antialias:false});
    if(!gl)return false;
    const available=!gl.isContextLost();
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return available;
  }catch{return false;}
}
export function ensureRenderer(){
  if(!pending&&!supportsWebGL())return Promise.reject(Object.assign(new Error('WebGL unavailable'),{code:'WEBGL_UNAVAILABLE'}));
  if(!pending)pending=import('https://ajax.googleapis.com/ajax/libs/model-viewer/4.4.0/model-viewer.min.js')
    .then(()=>customElements.whenDefined('model-viewer'))
    .catch(error=>{pending=null;throw error;});
  return pending;
}
