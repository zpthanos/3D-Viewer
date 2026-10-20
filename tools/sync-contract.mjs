import {readFileSync,writeFileSync} from 'node:fs';
const contract=JSON.parse(readFileSync(new URL('../integrations/viewer-contract.json',import.meta.url)));
writeFileSync(new URL('../public/assets/viewer-contract.js',import.meta.url),'// Generated from integrations/viewer-contract.json; run npm run build.\nexport const CONTRACT = '+JSON.stringify(contract)+';\n');
