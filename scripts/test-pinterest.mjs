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
const {handlePinterest}=await import(await moduleUrl('../lib/pinterest-server.ts'));
const {seal,unseal}=await import(await moduleUrl('../lib/pinterest-session.ts'));
const secret='a'.repeat(64);
const envelope=await seal('session','test-access-token',Date.now()+10000,secret);
assert.equal((await unseal(envelope,'session',secret)).value,'test-access-token');
assert.equal(await unseal(envelope,'state',secret),null);
assert.equal(await unseal(envelope.slice(0,20)+'x'+envelope.slice(21),'session',secret),null);
assert.equal(await unseal(await seal('session','x',Date.now()-1,secret),'session',secret),null);
assert.equal(await unseal(envelope,'session','b'.repeat(64)),null);
const origin='https://farfly.vercel.app';
const call=(action,options={})=>handlePinterest(new Request(origin+'/api/pinterest/'+action,options));
delete process.env.PINTEREST_ENABLED;
assert.deepEqual(await (await call('connection')).json(),{configured:false,connected:false});
assert.equal((await call('connect',{method:'POST',headers:{origin}})).status,503);
Object.assign(process.env,{PINTEREST_ENABLED:'true',PINTEREST_APP_ID:'test-id',PINTEREST_APP_SECRET:'test-secret',PINTEREST_REDIRECT_URI:origin+'/api/pinterest/callback',PINTEREST_SESSION_KEY:secret});
assert.equal((await call('connect',{method:'POST',headers:{origin:'https://attacker.example'}})).status,403);
assert.equal((await call('connection',{method:'POST'})).status,403);
assert.equal((await call('pins?board=123')).status,401);
const start=await call('connect',{method:'POST',headers:{origin}});
assert.equal(start.status,303);
const oauth=new URL(start.headers.get('location'));
assert.equal(oauth.origin,'https://www.pinterest.com');
assert.equal(oauth.searchParams.get('scope'),'boards:read,pins:read');
const stateCookie=start.headers.getSetCookie().find(c=>c.startsWith('farfly_pin_state=')&&!c.startsWith('farfly_pin_state=;')).split(';')[0];
const state=oauth.searchParams.get('state');
let calls=0;
globalThis.fetch=async()=>{calls++;return Response.json({access_token:'private-test-token',refresh_token:'never-store-this',expires_in:3600,scope:'boards:read pins:read'});};
const rejected=await call('callback?code=abc&state=wrong',{headers:{cookie:stateCookie}});
assert(rejected.headers.get('location').endsWith('invalid_state'));assert.equal(calls,0);
const connected=await call('callback?code=abc&state='+state,{headers:{cookie:stateCookie}});
assert(connected.headers.get('location').endsWith('connected'));assert.equal(calls,1);
const sessionCookie=connected.headers.getSetCookie().find(c=>c.startsWith('farfly_pin_session='));
assert(sessionCookie.includes('HttpOnly'));assert(sessionCookie.includes('Secure'));assert(sessionCookie.includes('SameSite=Lax'));
assert(!sessionCookie.includes('private-test-token'));assert(!sessionCookie.includes('never-store-this'));
const auth={cookie:sessionCookie.split(';')[0]};
const status=await call('connection',{headers:auth});
assert.equal((await status.json()).connected,true);
assert.equal(status.headers.get('cache-control'),'private, no-store');
assert.equal((await call('pins?board=../other',{headers:auth})).status,400);
globalThis.fetch=async(url,options)=>{
 assert.equal(options.headers.Authorization,'Bearer private-test-token');
 assert.equal(options.cache,'no-store');
 if((typeof url==='string'?url:url instanceof URL?url.href:url.url).includes('/boards?'))return Response.json({items:[{id:'123',name:'Forest'}],bookmark:'next-board'});
 return Response.json({items:[
 {id:'456',title:'Quiet forest',dominant_color:'#13579b',media:{images:{original:{url:'https://i.pinimg.com/test.jpg',width:600,height:900}}}},
 {id:'789',media:{images:{original:{url:'https://attacker.example/track.jpg',width:10,height:10}}}}
 ],bookmark:'next-pin'});
};
const boards=await (await call('boards',{headers:auth})).json();assert.equal(boards.cursor,'next-board');
const pins=await (await call('pins?board=123',{headers:auth})).json();
assert.equal(pins.items.length,1);assert.equal(pins.items[0].source,'https://www.pinterest.com/pin/456/');
assert.equal(pins.items[0].dominantColor,'#13579b');assert.equal(pins.items[0].mood.calm,.85);assert.equal(pins.cursor,'next-pin');
globalThis.fetch=async()=>Response.json({}, {status:429});
assert.equal((await call('boards',{headers:auth})).status,429);
globalThis.fetch=async()=>Response.json({}, {status:401});
const expired=await call('boards',{headers:auth});assert.equal(expired.status,401);assert(expired.headers.getSetCookie().some(c=>c.includes('Max-Age=0')));
const disconnected=await call('connection',{method:'POST',headers:{origin,...auth}});
assert.equal(disconnected.status,200);assert(disconnected.headers.getSetCookie().some(c=>c.includes('farfly_pin_session=;')));
console.log('PASS: Pinterest encryption, expiry, CSRF, OAuth state, scopes, private cookies, gated configuration, board/Pin pagination, image allowlist, rate limits and disconnect.');

// Renewable sessions survive access-token expiry without exposing credentials.
const refreshCookie='farfly_pin_refresh='+await seal('refresh','private-refresh',Date.now()+86400000,secret);
globalThis.fetch=async(url,options)=>{
 assert.equal(new URLSearchParams(options.body).get('grant_type'),'refresh_token');
 assert.equal(new URLSearchParams(options.body).get('refresh_token'),'private-refresh');
 return Response.json({access_token:'renewed-access',expires_in:2592000,refresh_token:'rotated-refresh',refresh_token_expires_in:5184000});
};
const renewed=await call('connection',{headers:{cookie:refreshCookie}});
assert.equal((await renewed.json()).connected,true);
assert.equal(renewed.headers.getSetCookie().length,2);
assert(renewed.headers.getSetCookie().every(c=>c.includes('HttpOnly')&&c.includes('Max-Age=')));
assert(!renewed.headers.getSetCookie().join('').includes('rotated-refresh'));
globalThis.fetch=async()=>Response.json({}, {status:503});
const temporary=await call('connection',{headers:{cookie:refreshCookie}});
assert.equal(temporary.status,503);assert.equal(temporary.headers.getSetCookie().length,0);
globalThis.fetch=async()=>Response.json({}, {status:400});
const revoked=await call('connection',{headers:{cookie:refreshCookie}});
assert.equal(revoked.status,401);assert(revoked.headers.getSetCookie().some(c=>c.startsWith('farfly_pin_refresh=;')&&c.includes('Max-Age=0')));
assert(disconnected.headers.getSetCookie().some(c=>c.startsWith('farfly_pin_refresh=;')));
console.log('PASS: persistent refresh, rotation, transient retry, invalid refresh and logout cleanup.');

