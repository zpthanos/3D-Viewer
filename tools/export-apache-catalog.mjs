// Run locally, never on the PHP server: node tools/export-apache-catalog.mjs /path/to/site
// MODELS is the single source for the homepage and the interactive studio.
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { MODELS } from '../public/assets/models.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = process.argv[2];
if (!destination) throw new Error('Supply the Apache site directory as the first argument.');
const site = resolve(destination);
if (!existsSync(resolve(site, 'app/bootstrap.php'))) throw new Error('Not a MENNOO PHP site.');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const manifestPath = resolve(site, 'data/stand-catalog.json');
const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath)) : null;
const models = Object.entries(MODELS).map(([id, model]) => {
  const thumbnail = readFileSync(resolve(root, 'public' + model.thumbnail));
  const mesh = readFileSync(resolve(root, 'public' + model.src));
  const thumbnailSha256 = digest(thumbnail), modelSha256 = digest(mesh);
  if (!model.thumbnail.includes(thumbnailSha256.slice(0, 12)) || !model.src.includes(modelSha256.slice(0, 12))) {
    throw new Error(`${id}: asset bytes do not match the filename fingerprint.`);
  }
  const old = previous?.models.find(item => item.id === id);
  if (old && old.modelSha256 !== modelSha256 && old.thumbnailSha256 === thumbnailSha256) {
    throw new Error(`${id}: changed GLB needs an updated canonical thumbnail before export.`);
  }
  const thumbnailPath = 'assets/images/stands/' + basename(model.thumbnail);
  mkdirSync(dirname(resolve(site, thumbnailPath)), { recursive: true });
  copyFileSync(resolve(root, 'public' + model.thumbnail), resolve(site, thumbnailPath));
  return { id, name: model.name, description: model.description, heightMm: Math.round(model.height * 1000),
    thumbnail: thumbnailPath, viewerThumbnail: model.thumbnail, model: model.src, thumbnailSha256, modelSha256 };
});
const data = { schema: 1, viewerOrigin: 'https://stands.mennoo.gr', models };
const manifest = { ...data, revision: digest(JSON.stringify(data)).slice(0, 12) };
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Synced ${models.length} actual model thumbnails; catalog ${manifest.revision}. No remote runtime requests.`);
