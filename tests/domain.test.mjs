import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PARENT_ORIGINS} from '../public/assets/models.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('CSP and message origins agree on the exact production and preview hosts',()=>{
 const headers=read('public/_headers');
 const policies=[...headers.matchAll(/^\s+Content-Security-Policy: (.+)$/gm)];
 assert.equal(policies.length,1);
 const ancestors=policies[0][1].match(/frame-ancestors ([^;]+)/)[1].split(/\s+/);
 assert.deepEqual(ancestors,['https://mennoo.gr','https://www.mennoo.gr','https://mennoo-private-preview.ohiosanta-og.chatgpt.site']);
 assert.deepEqual(PARENT_ORIGINS,ancestors);
 assert.match(headers,/^\/\*\n\s+! X-Frame-Options\n/m);
 assert.doesNotMatch(headers,/^\s+X-Frame-Options:/im);
 assert.match(headers,/\/build\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/);
 assert.match(headers,/\/index\.html\n\s+Cache-Control: no-cache/);
});
test('return links and exported viewer origin target the current domain',()=>{
 for(const path of ['public/index.html','public/404.html','tools/export-apache-catalog.mjs']){
  assert.doesNotMatch(read(path),/mennoo\.(?:cfd|sbs)/);
 }
 assert.match(read('public/index.html'),/href="https:\/\/mennoo\.gr\/forms\/interest\/"/);
 assert.match(read('public/404.html'),/href="https:\/\/mennoo\.gr\/"/);
 assert.match(read('tools/export-apache-catalog.mjs'),/viewerOrigin: 'https:\/\/stands\.mennoo\.gr'/);
});
