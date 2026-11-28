import {readFileSync,writeFileSync} from 'node:fs';
import {resources} from '../docs/portal/content.mjs';
const previews=Object.fromEntries(resources.filter(r=>!r.page).map(r=>[r.path,readFileSync(new URL('../'+r.path,import.meta.url),'utf8').replace(/\r\n/g,'\n')]));
const output='// Generated from repository Markdown by scripts/build_portal_previews.mjs.\nexport const previews = '+JSON.stringify(previews,null,2)+';\n';
const path=new URL('../docs/portal/previews.mjs',import.meta.url);
if(process.argv.includes('--check')){if(readFileSync(path,'utf8')!==output)throw Error('Portal previews stale: run node scripts/build_portal_previews.mjs');console.log('PASS: '+Object.keys(previews).length+' previews match source Markdown');}else writeFileSync(path,output,'utf8');
