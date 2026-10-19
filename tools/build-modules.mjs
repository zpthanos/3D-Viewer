// Dependency-free, deterministic fingerprints for our small, acyclic ES-module graph.
// Keep source modules readable in public/assets; deploy generated files with the HTML.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourceRoot = resolve(root, 'public/assets');
const output = resolve(root, 'public/build');
mkdirSync(output, { recursive: true });
const finished = new Map(), visiting = new Set();
function compile(file) {
  if (finished.has(file)) return finished.get(file);
  if (visiting.has(file)) throw new Error(`Circular module dependency: ${file}`);
  if (dirname(file) !== sourceRoot || extname(file) !== '.js') throw new Error(`Unexpected module: ${file}`);
  visiting.add(file);
  const original = readFileSync(file, 'utf8');
  const code = original.replace(/((?:from\s*|import\s*\(\s*)['"])(\.\/[^'"?]+\.js)(?:\?[^'"]*)?(['"])/g,
    (_, start, relative, end) => start + './' + compile(resolve(dirname(file), relative)) + end);
  const hash = createHash('sha256').update(code).digest('hex').slice(0, 12);
  const filename = basename(file, '.js') + '.' + hash + '.js';
  writeFileSync(resolve(output, filename), code);
  finished.set(file, filename); visiting.delete(file);
  return filename;
}
const entry = compile(resolve(sourceRoot, 'studio.js'));
const htmlPath = resolve(root, 'public/index.html');
const html = readFileSync(htmlPath, 'utf8');
const script = /<script\b[^>]*\bsrc="\/(?:assets\/studio\.js(?:\?[^"\s]*)?|build\/studio\.[a-f0-9]{12}\.js)"[^>]*><\/script>/g;
if ([...html.matchAll(script)].length !== 1) throw new Error('Expected one studio entry script.');
writeFileSync(htmlPath, html.replace(script, `<script data-cfasync="false" type="module" src="/build/${entry}"></script>`));
console.log(`Built ${finished.size} modules. Entry: /build/${entry}`);
