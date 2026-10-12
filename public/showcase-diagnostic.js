// Preview-branch diagnostic only. Never copied into the production public directory.
import { CafeSound, BEAT } from './assets/cafe-sound.js';
const report=document.querySelector('#report');
document.querySelector('#audio-test').addEventListener('click',async()=>{
 try{
  report.textContent='Rendering…';
  const context=new OfflineAudioContext(2,44100*8,44100);
  const sound=new CafeSound({createContext:()=>context});sound.setup();
  sound.master.gain.value=.32*.45;
  for(let step=0;step<16;step++)sound.scheduleStep(step,.02+step*BEAT/2);
  const buffer=await context.startRendering(),data=buffer.getChannelData(0);
  let energy=0,peak=0;for(const n of data){if(!Number.isFinite(n))throw Error('Non-finite sample');energy+=n*n;peak=Math.max(peak,Math.abs(n));}
  const rms=Math.sqrt(energy/data.length);
  if(rms<.0001||peak>=1)throw Error('Silent or clipped audio');
  report.textContent=`PASS · 8 seconds rendered · RMS ${rms.toFixed(5)} · peak ${peak.toFixed(5)} · no clipping`;
 }catch(e){report.textContent='FAIL · '+e.message;}
});
