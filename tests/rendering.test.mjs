import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {supportsWebGL} from '../public/assets/renderer.js';
import {MODELS,TABLE_SRC} from '../public/assets/models.js';

test('graphics capability probe handles absent, denied and lost WebGL contexts',()=>{
 for(const document of [
  {createElement:()=>({getContext:()=>null})},
  {createElement:()=>({getContext:()=>{throw new Error('GPU denied');}})},
  {createElement:()=>({getContext:()=>({isContextLost:()=>true,getExtension:()=>null})})}
 ])assert.equal(supportsWebGL(document),false);
});
test('graphics capability probe releases its temporary context',()=>{
 let released=0,requested='';
 const doc={createElement:()=>({getContext:type=>{requested=type;return {isContextLost:()=>false,getExtension:()=>({loseContext:()=>released++})};}})};
 assert.equal(supportsWebGL(doc),true);assert.equal(requested,'webgl2');assert.equal(released,1);
});
test('deployment CSP permits embedded GLB texture fetches and SDK WebAssembly',()=>{
 const text=readFileSync(new URL('../public/_headers',import.meta.url),'utf8');
 const policy=text.match(/Content-Security-Policy: (.*)/)[1];
 const directives=Object.fromEntries(policy.split(';').map(s=>s.trim().split(/\s+/)).map(([key,...values])=>[key,values]));
 assert.ok(directives['connect-src'].includes('blob:'));
 assert.ok(directives['script-src'].includes("'wasm-unsafe-eval'"));
 assert.ok(!directives['script-src'].includes("'unsafe-eval'"));
 assert.deepEqual(directives['object-src'],["'none'"]);
});
test('all active models and responsive previews exist in the deploy directory',()=>{
 const paths=[TABLE_SRC,...Object.values(MODELS).flatMap(m=>[m.src,m.poster,m.posterMobile])];
 for(const path of paths)assert.ok(existsSync(new URL('../public'+path,import.meta.url)),path);
});
