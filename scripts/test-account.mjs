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

const {handleAccount,getAccount,validateRegistration}=await import(await moduleUrl('../lib/account-server.ts'));
const {withAccountConnection}=await import(await moduleUrl('../lib/account-connections.ts'));
const {unseal}=await import(await moduleUrl('../lib/connection-crypto.ts'));
const origin='https://farfly.vercel.app', key='b'.repeat(64), userA='11111111-1111-4111-8111-111111111111',userB='22222222-2222-4222-8222-222222222222';
process.env.PINTEREST_SESSION_KEY=key;
const req=(action,{method='POST',cookie='',body,host=origin}={})=>new Request(origin+'/api/account/'+action,{method,headers:{origin:host,cookie,'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})});
const registration={firstName:'Rafi',lastName:'Alim',email:'person@example.com',password:'a-long-test-password',confirmPassword:'a-long-test-password'};
assert.equal(validateRegistration(registration),true);
for(const patch of [{firstName:''},{lastName:' '},{confirmPassword:'different'},{password:'short',confirmPassword:'short'}])assert.equal(validateRegistration({...registration,...patch}),false);
let calls=0;
globalThis.fetch=async()=>{calls++;throw Error('Must not request upstream');};
assert.equal((await handleAccount(req('register',{host:'https://bad.example',body:registration}))).status,403);
assert.equal((await handleAccount(req('register',{body:{...registration,confirmPassword:'wrong'}}))).status,400);
assert.equal((await handleAccount(req('register',{body:null}))).status,400);
assert.equal((await handleAccount(req('register',{body:[]}))).status,400);
assert.equal(calls,0);
globalThis.fetch=async(url,options)=>{assert.match(url,/auth\/v1\/signup$/);const b=JSON.parse(options.body);assert.equal(b.data.first_name,'Rafi');assert.equal(b.confirmPassword,undefined);return Response.json({user:{id:userA}});};
let response=await handleAccount(req('register',{body:registration}));assert.equal((await response.json()).verificationRequired,true);assert.equal(response.headers.getSetCookie().length,0);
globalThis.fetch=async()=>Response.json({access_token:'test-access',refresh_token:'test-refresh',expires_in:3600});
response=await handleAccount(req('login',{body:registration}));assert.equal(response.status,200);assert.equal(response.headers.getSetCookie().length,2);assert.match(response.headers.getSetCookie()[0],/Secure; HttpOnly; SameSite=Lax/);assert.equal((await response.json()).access_token,undefined);
assert.equal(await getAccount(req('session',{method:'GET'})),null);
let stage=0;
globalThis.fetch=async(url,options)=>{stage++;if(stage===1)return Response.json({}, {status:401});if(stage===2){assert.match(url,/grant_type=refresh_token/);assert.equal(JSON.parse(options.body).refresh_token,'refresh-a');return Response.json({access_token:'rotated',refresh_token:'rotated-refresh',expires_in:3600});}assert.equal(new Headers(options.headers).get('authorization'),'Bearer rotated');return Response.json({id:userA});};
const account=await getAccount(req('session',{method:'GET',cookie:'ff_access=expired; ff_refresh=refresh-a'}));assert.equal(account.user.id,userA);assert.equal(account.cookies.length,2);
globalThis.fetch=async()=>Response.json({}, {status:503});await assert.rejects(()=>getAccount(req('session',{method:'GET',cookie:'ff_refresh=keep-me'})));
// Simulated database checks complement real two-user RLS tests on Supabase.
let row=null,owner=userA,writes=0;
globalThis.fetch=async(url,options={})=>{
 if(url.endsWith('/auth/v1/user'))return Response.json({id:owner,email:'person@example.com'});
 if(url.includes('/rest/v1/provider_connections')){
  assert.equal(new Headers(options.headers).get('authorization'),'Bearer account-access');
  if(options.method==='POST'||options.method==='PATCH'){row=JSON.parse(options.body);writes++;return new Response(null,{status:204});}
  if(options.method==='DELETE'){row=null;writes++;return new Response(null,{status:204});}
  return Response.json(row?[{encrypted_tokens:row.encrypted_tokens}]:[]);
 }
 if(url.includes('/auth/v1/logout'))return new Response(null,{status:204});
 throw Error('Unexpected endpoint');
};
const providerReq=(action,cookie='ff_access=account-access',method='GET')=>new Request(origin+'/api/spotify/'+action,{method,headers:{origin,cookie}});
let invoked=false;
response=await withAccountConnection(providerReq('token','', 'POST'),'spotify',async()=>{invoked=true;return Response.json({});});assert.equal(response.status,401);assert.equal(invoked,false);
response=await withAccountConnection(providerReq('connection','ff_access=account-access; sp_access=legacy-token'),'spotify',async r=>{assert.equal(r.headers.get('cookie'),'');return Response.json({connected:false});});assert.equal(response.status,200);
response=await withAccountConnection(providerReq('connect','ff_access=account-access','POST'),'spotify',async()=>new Response(null,{status:303,headers:{Location:'https://accounts.spotify.com/authorize'}}));
const binding=response.headers.getSetCookie().find(c=>c.startsWith('ff_link_spotify=')).split(';')[0];
response=await withAccountConnection(providerReq('callback','ff_access=account-access; '+binding),'spotify',async()=>{const res=Response.json({connected:true});res.headers.append('Set-Cookie','sp_access=provider-access; Path=/api/spotify; HttpOnly');res.headers.append('Set-Cookie','sp_refresh=provider-refresh; Path=/api/spotify; HttpOnly');return res;});
assert.equal(response.status,200);assert.equal(writes,1);assert.ok(!row.encrypted_tokens.includes('provider-refresh'));assert.equal(response.headers.getSetCookie().some(c=>c.startsWith('sp_access=')),false);
const decoded=await unseal(row.encrypted_tokens,userA+':spotify',key);assert.equal(JSON.parse(decoded.value).sp_refresh,'provider-refresh');assert.equal(await unseal(row.encrypted_tokens,userB+':spotify',key),null);
response=await withAccountConnection(providerReq('token','ff_access=account-access','POST'),'spotify',async r=>{assert.match(r.headers.get('cookie'),/sp_refresh=provider-refresh/);return Response.json({access_token:'provider-access'});});assert.equal(response.status,200);
owner=userB;invoked=false;
response=await withAccountConnection(providerReq('callback','ff_access=account-access; '+binding),'spotify',async()=>{invoked=true;return Response.json({});});assert.equal(response.status,403);assert.equal(invoked,false);
owner=userA;
response=await handleAccount(req('logout',{cookie:'ff_access=account-access'}));assert.equal(response.status,200);assert.ok(row);assert.ok(response.headers.getSetCookie().every(c=>c.includes('Max-Age=0')));
response=await withAccountConnection(providerReq('connection','ff_access=account-access','POST'),'spotify',async()=>{const r=Response.json({connected:false});r.headers.append('Set-Cookie','sp_access=; Max-Age=0');r.headers.append('Set-Cookie','sp_refresh=; Max-Age=0');return r;});assert.equal(response.status,200);assert.equal(row,null);
console.log('PASS: account validation, CSRF, private cookies, refresh, transient failures, encrypted persistence, account-bound OAuth, legacy-token rejection, logout retention and explicit disconnect.');

