import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const bank=JSON.parse(fs.readFileSync(new URL('../app/challenges.json',import.meta.url)));
const source=fs.readFileSync(new URL('../app/game.ts',import.meta.url),'utf8').replace("import bank from './challenges.json';",'const bank='+JSON.stringify(bank)+';');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {deck,skills,badges,emptyProfile}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
assert.equal(bank.length,100);assert.equal(new Set(bank.map(q=>q.id)).size,100);
for(const lang of ['zh','en','ja'])assert.equal(new Set(bank.map(q=>q.claim[lang])).size,100);
for(const q of bank){assert.ok(skills[q.skill]);for(const lang of ['zh','en','ja']){assert.ok(q.claim[lang].length>0);assert.ok(q.good[lang].length>0);}}
for(const seed of [1,2,42,1999999999]){const d=deck(seed);assert.deepEqual(d,deck(seed));assert.equal(new Set(d.map(q=>q.id)).size,100);assert.equal(d.filter(q=>q.bonus).length,20);assert.ok(d.filter(q=>q.correct===0).length>30);assert.ok(d.filter(q=>q.correct===1).length>30);for(const q of d)for(const lang of ['zh','en','ja'])assert.equal(q.options[q.correct][lang],q.good[lang]);}
assert.notDeepEqual(deck(1).map(q=>q.id),deck(2).map(q=>q.id));assert.ok(badges.every(b=>!b.test(emptyProfile())));
console.log('PASS 100 unique trilingual events; six skill categories; deterministic fair decks; balanced answer positions; double-score events; fresh achievements');
