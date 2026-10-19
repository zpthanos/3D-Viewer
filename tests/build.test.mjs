import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=new URL('../',import.meta.url);
test('build resolves every local import to an existing, immutable, content-matched file',()=>{
  execFileSync(process.execPath,['tools/build-modules.mjs'],{cwd:fileURLToPath(root)});
  const html=readFileSync(new URL('public/index.html',root),'utf8');
  const entry=html.match(/data-cfasync="false" type="module" src="(\/build\/studio\.[a-f0-9]{12}\.js)"/)[1];
  const visited=new Set();
  function visit(path){
    if(visited.has(path))return;visited.add(path);
    const content=readFileSync(new URL('public'+path,root),'utf8');
    assert.ok(path.includes(createHash('sha256').update(content).digest('hex').slice(0,12)));
    for(const [,dependency]of content.matchAll(/(?:from\s*|import\s*\(\s*)['"]\.\/([^'"]+)['"]/g)){
      assert.match(dependency,/^[a-z-]+\.[a-f0-9]{12}\.js$/);visit('/build/'+dependency);
    }
  }
  visit(entry);assert.equal(visited.size,7);
  const before=html;
  execFileSync(process.execPath,['tools/build-modules.mjs'],{cwd:fileURLToPath(root)});
  assert.equal(readFileSync(new URL('public/index.html',root),'utf8'),before);
});
