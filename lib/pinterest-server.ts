import { seal, unseal, encode } from './pinterest-session';
import { PinterestProvider } from './providers/pinterest';
import { ProviderError } from './providers/contracts';

const sessionName='farfly_pin_session';
const refreshName='farfly_pin_refresh';
const stateName='farfly_pin_state';
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
function settings() {
  const {PINTEREST_ENABLED,PINTEREST_APP_ID,PINTEREST_APP_SECRET,PINTEREST_REDIRECT_URI,PINTEREST_SESSION_KEY}=process.env;
  if(PINTEREST_ENABLED!=='true'||!PINTEREST_APP_ID||!PINTEREST_APP_SECRET||!PINTEREST_REDIRECT_URI||!/^[a-f0-9]{64}$/i.test(PINTEREST_SESSION_KEY||''))return null;
  try {
    const url=new URL(PINTEREST_REDIRECT_URI);
    if(url.pathname!=='/api/pinterest/callback'||url.search||url.hash||url.username||url.password)return null;
    if(url.protocol!=='https:' && !(url.protocol==='http:' && url.hostname==='localhost'))return null;
    return {id:PINTEREST_APP_ID,secret:PINTEREST_APP_SECRET,redirect:url.href,origin:url.origin,secure:url.protocol==='https:',key:PINTEREST_SESSION_KEY!};
  } catch {return null;}
}
function json(body:unknown,status=200){return Response.json(body,{status,headers});}
function cookie(request:Request,name:string) {
  return request.headers.get('cookie')?.split(';').map(p=>p.trim()).find(p=>p.startsWith(name+'='))?.slice(name.length+1);
}
function setCookie(response:Response,name:string,value:string,secure:boolean,maxAge?:number) {
  response.headers.append('Set-Cookie',name+'='+value+'; Path=/api/pinterest; HttpOnly; SameSite=Lax'+(secure?'; Secure':'')+(maxAge===undefined?'':'; Max-Age='+maxAge));
}
function clear(response:Response,secure:boolean) {
  setCookie(response,sessionName,'',secure,0);
  setCookie(response,stateName,'',secure,0);
  setCookie(response,refreshName,'',secure,0);
  return response;
}
export async function handlePinterest(request:Request):Promise<Response> {
  const url=new URL(request.url),action=url.pathname.split('/').pop(),config=settings();
  if(!['connection','connect','callback','boards','pins'].includes(action||''))return json({error:'Not found.'},404);
  if(request.method!=='GET' && request.method!=='POST')return json({error:'Method not allowed.'},405);
  if(!config) {
    if(action==='connection' && request.method==='GET')return json({configured:false,connected:false});
    return json({error:'Pinterest connection is awaiting app approval and configuration.'},503);
  }
  if(url.origin!==config.origin)return json({error:'Open the production site to connect Pinterest.'},403);
  if(request.method==='POST' && request.headers.get('origin')!==config.origin)return json({error:'Request origin was not accepted.'},403);
  if(request.method==='POST') {
    if(action==='connection')return clear(json({connected:false}),config.secure);
    if(action!=='connect')return json({error:'Method not allowed.'},405);
    const state=encode(crypto.getRandomValues(new Uint8Array(32)));
    const location=new URL('https://www.pinterest.com/oauth/');
    location.search=new URLSearchParams({client_id:config.id,redirect_uri:config.redirect,response_type:'code',scope:'boards:read,pins:read',state}).toString();
    const response=new Response(null,{status:303,headers:{...headers,Location:location.href}});
    clear(response,config.secure);
    setCookie(response,stateName,await seal('state',state,Date.now()+600000,config.key),config.secure,600);
    return response;
  }
  if(action==='connect')return json({error:'Use the Connect Pinterest button.'},405);
  if(action==='callback') {
    const finish=(result:string)=> {
      const response=new Response(null,{status:303,headers:{...headers,Location:config.origin+'/pinterest?result='+result}});
      setCookie(response,stateName,'',config.secure,0);
      return response;
    };
    const state=await unseal(cookie(request,stateName),'state',config.key);
    if(!state || state.value!==url.searchParams.get('state'))return clear(finish('invalid_state'),config.secure);
    if(url.searchParams.has('error'))return clear(finish('denied'),config.secure);
    const code=url.searchParams.get('code');
    if(!code || code.length>2048)return clear(finish('failed'),config.secure);
    try {
      const tokenResponse=await fetch('https://api.pinterest.com/v5/oauth/token',{
        method:'POST',headers:{Authorization:'Basic '+btoa(config.id+':'+config.secret),'Content-Type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:config.redirect}),
        cache:'no-store',signal:AbortSignal.timeout(10000),
      });
      if(!tokenResponse.ok)return clear(finish('failed'),config.secure);
      const token=await tokenResponse.json() as {access_token?:unknown;expires_in?:unknown;scope?:unknown;refresh_token?:unknown;refresh_token_expires_in?:unknown};
      const scopes=typeof token.scope==='string'?token.scope.split(/[ ,]+/):[];
      if(typeof token.access_token!=='string'||typeof token.expires_in!=='number'||!Number.isFinite(token.expires_in)||token.expires_in<=60||!['boards:read','pins:read'].every(s=>scopes.includes(s)))return clear(finish('failed'),config.secure);
      const expires=Date.now()+(token.expires_in-30)*1000;
      const value=await seal('session',token.access_token,expires,config.key);
      if(value.length>3800)return clear(finish('failed'),config.secure);
      const response=finish('connected');
      setCookie(response,sessionName,value,config.secure,Math.floor((expires-Date.now())/1000));
      if(typeof token.refresh_token==='string'&&typeof token.refresh_token_expires_in==='number'&&Number.isFinite(token.refresh_token_expires_in)&&token.refresh_token_expires_in>60){
        const age=Math.min(token.refresh_token_expires_in-30,60*86400);
        const refresh=await seal('refresh',token.refresh_token,Date.now()+age*1000,config.key);
        if(refresh.length>3800)return clear(finish('failed'),config.secure);
        setCookie(response,refreshName,refresh,config.secure,Math.floor(age));
      }
      return response;
    } catch {return clear(finish('failed'),config.secure);}
  }
  let session=await unseal(cookie(request,sessionName),'session',config.key);
  const refresh=await unseal(cookie(request,refreshName),'refresh',config.key);
  const renewed=new Headers();
  if(refresh&&(!session||session.expires-Date.now()<5*60000)){
    try {
      const r=await fetch('https://api.pinterest.com/v5/oauth/token',{method:'POST',headers:{Authorization:'Basic '+btoa(config.id+':'+config.secret),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:refresh.value}),cache:'no-store',signal:AbortSignal.timeout(10000)});
      if(!r.ok){
        if(r.status===400||r.status===401)return clear(json({error:'Pinterest access ended. Please reconnect.'},401),config.secure);
        return json({error:'Pinterest is temporarily unavailable. Your connection has been kept.'},503);
      }
      const token=await r.json() as {access_token?:unknown;expires_in?:unknown;refresh_token?:unknown;refresh_token_expires_in?:unknown};
      if(typeof token.access_token!=='string'||typeof token.expires_in!=='number'||!Number.isFinite(token.expires_in)||token.expires_in<=60)throw new Error('Invalid refresh response');
      session={value:token.access_token,expires:Date.now()+(token.expires_in-30)*1000};
      const response=json({});
      const sealed=await seal('session',session.value,session.expires,config.key);
      if(sealed.length>3800)throw new Error('Token too large');
      setCookie(response,sessionName,sealed,config.secure,Math.floor((session.expires-Date.now())/1000));
      if(typeof token.refresh_token==='string'&&typeof token.refresh_token_expires_in==='number'&&Number.isFinite(token.refresh_token_expires_in)&&token.refresh_token_expires_in>60){
        const age=Math.min(token.refresh_token_expires_in-30,60*86400);
        const sealedRefresh=await seal('refresh',token.refresh_token,Date.now()+age*1000,config.key);
        if(sealedRefresh.length>3800)throw new Error('Token too large');
        setCookie(response,refreshName,sealedRefresh,config.secure,Math.floor(age));
      }
      for(const value of response.headers.getSetCookie())renewed.append('Set-Cookie',value);
    }catch{return json({error:'Pinterest could not renew right now. Please retry.'},503);}
  }
  const finishSession=(response:Response)=>{for(const value of renewed.getSetCookie())response.headers.append('Set-Cookie',value);return response;};
  if(action==='connection')return finishSession(json({configured:true,connected:!!session,expiresAt:session?.expires}));
  if(!session)return clear(json({error:'Your Pinterest session ended. Please reconnect.'},401),config.secure);
  const provider=new PinterestProvider(session.value);
  try {
    const cursor=url.searchParams.get('cursor')||undefined;
    if(cursor && cursor.length>2000)return json({error:'Invalid page cursor.'},400);
    if(action==='boards')return finishSession(json(await provider.getBoardsPage(cursor)));
    const board=url.searchParams.get('board')||'';
    if(!/^\d{1,30}$/.test(board))return json({error:'Choose a valid Pinterest board.'},400);
    return finishSession(json(await provider.getPins({boards:[board],cursor,limit:30})));
  } catch(error) {
    const status=error instanceof ProviderError ? error.status : 503;
    const response=json({error:error instanceof ProviderError?error.message:'Pinterest is temporarily unavailable. Try again.'},status>=400&&status<=599?status:503);
    return status===401?clear(response,config.secure):finishSession(response);
  }
}

