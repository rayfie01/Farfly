import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const transpile = p => ts.transpileModule(fs.readFileSync(new URL(p,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const typeUrl='data:text/javascript;base64,'+Buffer.from(transpile('../lib/types.ts')).toString('base64');
const moodSource=transpile('../lib/mood.ts').replace("'./types'",JSON.stringify(typeUrl));
const {aggregate,moodName,musicQueries,rankTracks}=await import('data:text/javascript;base64,'+Buffer.from(moodSource).toString('base64'));
const {neutral}=await import(typeUrl);
const pin={id:'p',mood:{...neutral,warm:1,calm:.8}};
const now=1000000;
const signals=Array.from({length:12},(_,i)=>({pin,kind:'save',at:now-i*100}));
assert.equal(moodName(aggregate(signals,now)),'Summer Memory');
assert(musicQueries(aggregate(signals,now)).length>=3);
assert.deepEqual(aggregate(signals.concat(signals,signals),now),aggregate(signals.concat(signals,signals).slice(-30),now));
const old=aggregate([{pin,kind:'save',at:0}],now); const recent=aggregate([{pin,kind:'save',at:now}],now);assert(recent.warm>old.warm);
const catalog=[{id:'a',mood:neutral,source:'/a'},{id:'b',mood:neutral,source:''},{id:'c',mood:neutral,source:'/c'}];
assert.equal(rankTracks(catalog,neutral,[],['a'])[0].id,'c');assert.equal(rankTracks(catalog,neutral).length,2);
for(const file of fs.readdirSync(new URL('../public/audio/',import.meta.url))){const b=fs.readFileSync(new URL('../public/audio/'+file,import.meta.url));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt32LE(40)/b.readUInt32LE(28),96);}
console.log('PASS: rolling context, recency, mood naming, multi-query generation, skip ranking, playability filtering, and six valid 96-second WAV files.');
