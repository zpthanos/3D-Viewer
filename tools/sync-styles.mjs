// studio.scss uses plain CSS syntax. No Sass/runtime dependency is required.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const css = readFileSync(new URL('src/studio.scss', root));
const hash = createHash('sha256').update(css).digest('hex').slice(0, 12);
const asset = `assets/studio.${hash}.css`;
writeFileSync(new URL(`public/${asset}`, root), css);
// Keep the original URL for older cached HTML.
writeFileSync(new URL('public/assets/studio.css', root), css);
const page = new URL('public/index.html', root);
const html = readFileSync(page, 'utf8');
const link = /href="\/assets\/studio(?:\.[a-f0-9]{12})?\.css(?:\?[^"\s]*)?"/g;
if ([...html.matchAll(link)].length !== 1) throw new Error('Expected one studio stylesheet link');
writeFileSync(page, html.replace(link, `href="/${asset}"`));
console.log(asset);
