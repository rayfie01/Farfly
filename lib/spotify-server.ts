import { encode, seal, unseal } from './spotify-session';
import { isMood, discoveryPage, normalizeSpotify } from './spotify-discovery';
const origin='https://farfly.vercel.app';
const client='639e9cc9dadb4a5f81f7962b599c40af';
const redirect=origin+'/api/spotify/callback';
const scopes='streaming user-read-email user-read-private user-modify-playback-state';
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers});
function cookie(req:Request,name:string){return req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1);}
function set(res:Response,name:string,value:string,age:number){res.headers.append('Set-Cookie',`${name}=${value}; Path=/api/spotify; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`);}
function clear(res:Response){for(const name of ['sp_state','sp_access','sp_refresh'])set(res,name,'',0);return res;}
async function token(body:URLSearchParams){return fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,cache:'no-store',signal:AbortSignal.timeout(10000)});}
async function save(res:Response,t:Record<string,unknown>,key:string){
 if(typeof t.access_token!=='string'||typeof t.expires_in!=='number'||!Number.isFinite(t.expires_in)||t.expires_in<=60)throw Error('Invalid token');
 const age=Math.min(t.expires_in-30,3600);
 const access=await seal('access',t.access_token,Date.now()+age*1000,key);
 if(access.length>3800)throw Error('Token too large');
 set(res,'sp_access',access,age);
 if(typeof t.refresh_token==='string'){
  const refresh=await seal('refresh',t.refresh_token,Date.now()+30*86400000,key);
  if(refresh.length>3800)throw Error('Token too large');
  set(res,'sp_refresh',refresh,30*86400);
 }
 return t.access_token;
}
export async function handleSpotify(req:Request):Promise<Response>{
 const url=new URL(req.url),action=url.pathname.split('/').pop();
 // Reuse the existing server encryption key with a distinct authenticated domain.
 const key=process.env.SPOTIFY_SESSION_KEY||process.env.PINTEREST_SESSION_KEY||'';
 if(!['connect','callback','connection','token','play','recommendations'].includes(action||''))return json({error:'Not found'},404);
 if(!['GET','POST'].includes(req.method))return json({error:'Method not allowed'},405);
 if(url.origin!==origin||(req.method==='POST'&&req.headers.get('origin')!==origin))return json({error:'Invalid origin'},403);
 if(!/^[a-f0-9]{64}$/i.test(key))return json({configured:false,connected:false,error:'Spotify is not configured.'},503);
 if(action==='connection'&&req.method==='POST')return clear(json({connected:false}));
 if(action==='connect'){
  if(req.method!=='POST')return json({error:'Use Connect Spotify'},405);
  const state=encode(crypto.getRandomValues(new Uint8Array(32))),verifier=encode(crypto.getRandomValues(new Uint8Array(48)));
  const challenge=encode(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
  const target='https://accounts.spotify.com/authorize?'+new URLSearchParams({client_id:client,response_type:'code',redirect_uri:redirect,scope:scopes,state,code_challenge_method:'S256',code_challenge:challenge});
  const res=req.headers.get('content-type')?.includes('application/json')?json({url:target}):new Response(null,{status:303,headers:{...headers,Location:target}});
  set(res,'sp_state',await seal('state',JSON.stringify({state,verifier}),Date.now()+600000,key),600);return res;
 }
 if(action==='callback'){
  if(req.method!=='GET')return json({error:'Method not allowed'},405);
  const finish=(result:string)=>{const res=new Response(null,{status:303,headers:{...headers,Location:origin+'/spotify?result='+result}});set(res,'sp_state','',0);return res;};
  try{
   const state=await unseal(cookie(req,'sp_state'),'state',key);
   if(!state)return finish('invalid_state');
   const data=JSON.parse(state.value);
   if(data.state!==url.searchParams.get('state'))return finish('invalid_state');
   if(url.searchParams.has('error'))return finish('denied');
   const code=url.searchParams.get('code');if(!code||code.length>4096)return finish('failed');
   const r=await token(new URLSearchParams({client_id:client,grant_type:'authorization_code',code,redirect_uri:redirect,code_verifier:data.verifier}));
   if(!r.ok)return finish('failed');
   const t=await r.json() as Record<string,unknown>;if(typeof t.scope!=='string'||!scopes.split(' ').every(s=>(t.scope as string).split(' ').includes(s)))return finish('missing_scope');
   const res=finish('connected');await save(res,t,key);return res;
  }catch{return finish('failed');}
 }
 if((action==='connection'&&req.method!=='GET')||(['token','play','recommendations'].includes(action!)&&req.method!=='POST'))return json({error:'Method not allowed'},405);
 const renewed=json({});
 const finish=(res:Response)=>{for(const value of renewed.headers.getSetCookie())res.headers.append('Set-Cookie',value);return res;};
 try{
  let access=await unseal(cookie(req,'sp_access'),'access',key);
  const refresh=await unseal(cookie(req,'sp_refresh'),'refresh',key);
  if((!access||access.expires-Date.now()<60000)&&refresh){
   const r=await token(new URLSearchParams({client_id:client,grant_type:'refresh_token',refresh_token:refresh.value}));
   if(!r.ok){if(r.status===400||r.status===401)return clear(json({connected:false,error:'Please reconnect Spotify.'},401));return json({error:'Spotify is temporarily unavailable.'},503);}
   const value=await save(renewed,await r.json() as Record<string,unknown>,key);access={value,expires:Date.now()+3000000};
  }
  if(action==='connection')return finish(json({configured:true,connected:!!access}));
  if(!access)return json({error:'Connect Spotify first.'},401);
  if(action==='token')return finish(json({access_token:access.value}));
  const body=await req.json().catch(()=>null) as Record<string,unknown>|null;
  if(action==='recommendations'){
   if(!isMood(body?.mood))return finish(json({error:'Choose a picture mood first.'},400));
   const page=body.page??0;
   if(typeof page!=='number'||!Number.isInteger(page)||page<0||page>29)return finish(json({error:'Invalid discovery page.'},400));
   const selection=discoveryPage(body.mood,page);
   const items:unknown[][]=[];
   for(const q of selection.queries){
    const r=await fetch('https://api.spotify.com/v1/search?'+new URLSearchParams({q,type:'track',limit:'10',offset:String(selection.offset)}),{headers:{Authorization:'Bearer '+access.value},cache:'no-store',signal:AbortSignal.timeout(10000)});
    if(r.status===401)return clear(json({error:'Please reconnect Spotify.'},401));
    if(!r.ok)return finish(json({error:r.status===403?'Spotify search is unavailable for this app or account.':r.status===429?'Spotify is busy. Please wait before trying another picture.':'Could not find songs. Your current music is unchanged.'},r.status===429?429:502));
    const data=await r.json() as {tracks?:{items?:unknown[]}};items.push(data.tracks?.items||[]);
   }
   const interleaved=Array.from({length:10},(_,i)=>items.flatMap(list=>list[i]?[list[i]]:[])).flat();
   return finish(json({tracks:normalizeSpotify(interleaved),mood:body.mood,hasMore:page<29}));
  }
  if(!body||typeof body.device!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(body.device)||typeof body.uri!=='string'||!/^spotify:track:[a-zA-Z0-9]{22}$/.test(body.uri))return finish(json({error:'Enter a valid Spotify track link.'},400));
  const r=await fetch('https://api.spotify.com/v1/me/player/play?device_id='+encodeURIComponent(body.device),{method:'PUT',headers:{Authorization:'Bearer '+access.value,'Content-Type':'application/json'},body:JSON.stringify({uris:[body.uri]}),cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(r.status===401)return clear(json({error:'Please reconnect Spotify.'},401));
  if(!r.ok)return finish(json({error:r.status===403?'Spotify denied playback. Check Premium and the app user allowlist.':r.status===429?'Spotify rate limit reached. Try again later.':'Spotify could not start playback. Check the track and reconnect the player.'},r.status===429?429:502));
  return finish(json({ok:true}));
 }catch{return finish(json({error:'Spotify is temporarily unavailable. Try again.'},503));}
}

