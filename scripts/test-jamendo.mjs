import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const modules=new Map();
async function moduleUrl(path){
 if(modules.has(path))return modules.get(path);
 let source=ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const dependencies=[...source.matchAll(/from ['"](\.[^'"]+)['"]/g)];
 for(const match of dependencies){
  const resolved=new URL(match[1]+'.ts',new URL(path,import.meta.url));
  const child=await moduleUrl(resolved.href);
  source=source.replace(match[0],'from '+JSON.stringify(child));
 }
 const url='data:text/javascript;base64,'+Buffer.from(source).toString('base64');
 modules.set(path,url);return url;
}

const {handleMusic}=await import(await moduleUrl('../lib/jamendo-server.ts'));
const {normalizeJamendo,JamendoMusicProvider}=await import(await moduleUrl('../lib/providers/jamendo.ts'));
const track={id:'42',name:'A real song',artist_name:'A real artist',duration:123,audio:'https://prod-1.storage.jamendo.com/stream/42',image:'https://images.jamendo.com/a.jpg',license_ccurl:'http://creativecommons.org/licenses/by-nc/4.0/',musicinfo:{tags:{genres:['ambient'],vartags:['relaxation']}}};
assert.equal(normalizeJamendo(null),null);
assert.equal(normalizeJamendo('bad'),null);
assert.equal(normalizeJamendo(track).id,'jamendo-42');
assert.equal(normalizeJamendo(track).mood.calm,.85);
assert.equal(normalizeJamendo({...track,audio:'javascript:alert(1)'}),null);
assert.equal(normalizeJamendo({...track,audio:'https://jamendo.com.evil.test/a'}),null);
assert.equal(normalizeJamendo({...track,license_ccurl:''}),null);
assert.equal(normalizeJamendo({...track,duration:0}),null);
delete process.env.JAMENDO_CLIENT_ID;
const call=(mood='calm')=>handleMusic(new Request('https://farfly.vercel.app/api/music?mood='+mood));
assert.equal((await (await call()).json()).configured,false);
assert.equal((await call('arbitrary')).status,400);
process.env.JAMENDO_CLIENT_ID='test-client';let calls=0;
globalThis.fetch=async(url)=>{calls++;assert.equal(new URL(url).searchParams.get('client_id'),'test-client');return Response.json({headers:{status:'success'},results:[track,{...track,audio:''}]});};
const result=await (await call()).json();assert.equal(result.tracks.length,1);assert.equal(result.tracks[0].provider,'jamendo');assert.ok(!JSON.stringify(result).includes('test-client'));
await call();assert.equal(calls,1);
await Promise.all([call('warm'),call('warm')]);assert.equal(calls,2);
globalThis.fetch=async()=>new Response('',{status:429});assert.equal((await call('dreamy')).status,429);
globalThis.fetch=async()=>Response.json({headers:{status:'failed'},results:[]});assert.equal((await call('dreamy')).status,502);
globalThis.fetch=async()=>{throw new Error('network failed with secret');};const failure=await call('dreamy');assert.equal(failure.status,502);assert.ok(!(await failure.text()).includes('secret'));
globalThis.fetch=async()=>Response.json({headers:{status:'success'},results:[]});assert.equal((await (await call('dreamy')).json()).tracks.length,0);
assert.equal(await new JamendoMusicProvider('test').getTrack('invalid'),null);
console.log('PASS: Jamendo configuration, normalization, stream safety, attribution, mood tags, bounded queries, caching, concurrency, empty results and API failures.');
