import { seal, unseal, encode } from './pinterest-session';
import { PinterestProvider } from './providers/pinterest';
import { ProviderError } from './providers/contracts';

const sessionName='farfly_pin_session';
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
      const token=await tokenResponse.json() as {access_token?:unknown;expires_in?:unknown;scope?:unknown};
      const scopes=typeof token.scope==='string'?token.scope.split(/[ ,]+/):[];
      if(typeof token.access_token!=='string'||typeof token.expires_in!=='number'||!Number.isFinite(token.expires_in)||token.expires_in<=60||!['boards:read','pins:read'].every(s=>scopes.includes(s)))return clear(finish('failed'),config.secure);
      // Discard refresh tokens; the initial release deliberately reconnects after one hour.
      const expires=Date.now()+Math.min(3600,token.expires_in-30)*1000;
      const value=await seal('session',token.access_token,expires,config.key);
      if(value.length>3800)return clear(finish('failed'),config.secure);
      const response=finish('connected');
      setCookie(response,sessionName,value,config.secure);
      return response;
    } catch {return clear(finish('failed'),config.secure);}
  }
  const session=await unseal(cookie(request,sessionName),'session',config.key);
  if(action==='connection')return json({configured:true,connected:!!session,expiresAt:session?.expires});
  if(!session)return clear(json({error:'Your Pinterest session ended. Please reconnect.'},401),config.secure);
  const provider=new PinterestProvider(session.value);
  try {
    const cursor=url.searchParams.get('cursor')||undefined;
    if(cursor && cursor.length>2000)return json({error:'Invalid page cursor.'},400);
    if(action==='boards')return json(await provider.getBoardsPage(cursor));
    const board=url.searchParams.get('board')||'';
    if(!/^\d{1,30}$/.test(board))return json({error:'Choose a valid Pinterest board.'},400);
    return json(await provider.getPins({boards:[board],cursor,limit:30}));
  } catch(error) {
    const status=error instanceof ProviderError ? error.status : 503;
    const response=json({error:error instanceof ProviderError?error.message:'Pinterest is temporarily unavailable. Try again.'},status>=400&&status<=599?status:503);
    return status===401?clear(response,config.secure):response;
  }
}
