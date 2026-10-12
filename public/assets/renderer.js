// Download the renderer only after a deliberate tap. No WebGL or heavy model request on entry.
let pending;
export function ensureRenderer(){
  if(!pending)pending=import('https://ajax.googleapis.com/ajax/libs/model-viewer/4.4.0/model-viewer.min.js')
    .then(()=>customElements.whenDefined('model-viewer'))
    .catch(error=>{pending=null;throw error;});
  return pending;
}
