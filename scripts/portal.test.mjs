import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {VERSION,resources,projects,selectResources} from '../docs/portal/content.mjs';
import {realReturn,reserveCalc} from '../docs/portal/calculations.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7);
test('real return normal case',()=>{const r=realReturn(100000,12,8);near(r.rate,3.7037037037037);near(r.nominalValue,112000);near(r.realValue,103703.7037037);});
test('real return loss and zero capital',()=>{near(realReturn(10,-100,0).rate,-100);near(realReturn(0,12,8).realValue,0);near(realReturn(100,0,-20).realValue,125);});
test('real return invalid inputs',()=>{for(const a of [[1,1,-100],[-1,1,1],[1,-101,1],[NaN,1,1],[1,Infinity,1]])assert.throws(()=>realReturn(...a),RangeError);});
test('reserve baseline',()=>{const r=reserveCalc(60000,45000,90000,30000);near(r.before,2);near(r.months,4/3);near(r.recovery,2);near(r.gap,0);});
test('reserve deficit and recovery',()=>{const r=reserveCalc(100,80,10,50);near(r.gap,40);near(r.months,0);near(r.recovery,2.5);assert.equal(reserveCalc(80,80,100,10).recovery,null);assert.equal(reserveCalc(0,80,100,0).recovery,0);});
test('reserve rejects division by zero and invalid input',()=>{assert.throws(()=>reserveCalc(1,0,1,1),RangeError);assert.throws(()=>reserveCalc(1,1,-1,1),RangeError);assert.throws(()=>reserveCalc(1,1,1,NaN),RangeError);});
test('search and filters',()=>{assert.equal(selectResources('','all').length,resources.length);assert.equal(selectResources('инфляции','practice')[0].id,'real');assert.equal(selectResources('ИНФЛЯЦИИ','research').length,0);assert.equal(selectResources('несуществующий материал').length,0);assert.equal(selectResources('  РЕЗЕРВ  ','practice')[0].id,'reserve');});
test('digital ruble is discoverable in library',()=>{assert.equal(selectResources('цифровой рубль','research')[0].id,'ruble');assert.equal(selectResources('пенсия','research')[0].id,'ruble');assert.ok(existsSync(new URL('../docs/'+resources.find(r=>r.id==='ruble').page+'index.html',import.meta.url)));});
test('version and source paths',()=>{assert.equal(VERSION,readFileSync(new URL('../VERSION',import.meta.url),'utf8').trim());for(const item of [...resources,...projects])assert.ok(existsSync(new URL('../'+item.path,import.meta.url)),item.path);assert.equal(new Set(resources.map(x=>x.id)).size,resources.length);});

import {researchPublications,recentResearch} from '../docs/portal/content.mjs';
test('Unified research registry, mandatory search and bounded feed',()=>{assert.ok(recentResearch(3).length<=3);assert.equal(new Set(researchPublications.map(x=>x.id)).size,researchPublications.length);for(const item of researchPublications){assert.equal(item.format,'interactive');assert.deepEqual(item.sourceChecks.map(x=>x.source),['cbr','habr','reddit']);assert.ok(item.sourceChecks.every(x=>['reviewed','not-found','limited'].includes(x.status)&&x.date&&x.query));const page=readFileSync(new URL('../docs/'+item.page+'index.html',import.meta.url),'utf8');assert.ok(page.includes('data-research-presentation')&&page.includes('data-presentation-mode="living-canvas"'));assert.ok(resources.find(r=>r.id===item.id));}const home=readFileSync(new URL('../docs/index.html',import.meta.url),'utf8');assert.ok(home.includes('id="research-catalog"')&&home.includes('id="research-feed"')&&!home.includes('class="featured-research"'));assert.ok(!home.match(/<nav class="nav"[^>]*>[^\n]*href="ruble\//));assert.ok(home.indexOf('class="hero"')<home.indexOf('id="feed"'));});
