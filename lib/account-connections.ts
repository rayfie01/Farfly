import { getAccount, attachAccount, accountJson, accountDatabase, accountOrigin, readCookie, accountCookie, type Account } from './account-server';
import { seal, unseal } from './connection-crypto';
type Provider='pinterest'|'spotify';
const names={pinterest:['farfly_pin_session','farfly_pin_refresh'],spotify:['sp_access','sp_refresh']};
const stateNames={pinterest:'farfly_pin_state',spotify:'sp_state'};
export async function withAccountConnection(req:Request,provider:Provider,handler:(req:Request)=>Promise<Response>){
 if(new URL(req.url).origin!==accountOrigin||(req.method==='POST'&&req.headers.get('origin')!==accountOrigin))return accountJson({error:'Invalid origin.'},403);
 let account:Account|null=null;
 try{
 account=await getAccount(req);if(!account)return accountJson({error:'Log in to Far.Fly first.',connected:false},401);
 const key=process.env.CONNECTION_ENCRYPTION_KEY||process.env.PINTEREST_SESSION_KEY||'';
 if(!/^[a-f0-9]{64}$/i.test(key))return accountJson({error:'Connections are not configured.'},503);
 const action=new URL(req.url).pathname.split('/').pop();const binding='ff_link_'+provider;
 const verifiedAccount=account; const finish=(res:Response)=>attachAccount(res,verifiedAccount);
 if(action==='callback'){const bound=await unseal(readCookie(req,binding),'oauth:'+provider,key);if(bound?.value!==account.user.id)return finish(accountJson({error:'This connection belongs to another login. Start connecting again.'},403));}
 const filter='provider_connections?user_id=eq.'+encodeURIComponent(account.user.id)+'&provider=eq.'+provider;
 const read=await accountDatabase(account,filter+'&select=encrypted_tokens');
 const rows=await read.json() as {encrypted_tokens:string}[];
 const previous=rows[0]?.encrypted_tokens;
 const decoded=previous?await unseal(previous,account.user.id+':'+provider,key):null;
 const tokens:Record<string,string>=decoded?JSON.parse(decoded.value):{};
 // Never adopt legacy browser tokens: they have no verified Far.Fly account owner.
 const incoming=Object.entries(tokens).filter(([name])=>names[provider].includes(name)).map(([name,value])=>name+'='+value);
 const state=readCookie(req,stateNames[provider]);if(state)incoming.push(stateNames[provider]+'='+state);
 const requestHeaders=new Headers(req.headers);requestHeaders.set('cookie',incoming.join('; '));
 const response=await handler(new Request(req,{headers:requestHeaders}));
 const changed:Record<string,string>={};
 for(const c of response.headers.getSetCookie()){const pair=c.split(';')[0];const at=pair.indexOf('=');const name=pair.slice(0,at);if(names[provider].includes(name))changed[name]=pair.slice(at+1);}
 // Token material stays in the encrypted database, not provider cookies in the browser.
 const cookies=response.headers.getSetCookie().filter(c=>!names[provider].some(n=>c.startsWith(n+'=')));response.headers.delete('Set-Cookie');for(const c of cookies)response.headers.append('Set-Cookie',c);
 if(action==='connect'&&req.method==='POST'&&response.status===303)accountCookie(response,binding,await seal('oauth:'+provider,account.user.id,Date.now()+600000,key),600);
 if(action==='callback')accountCookie(response,binding,'',0);
 if(action!=='connect'&&Object.keys(changed).length){
  const next={...tokens,...changed};for(const n of Object.keys(next))if(!next[n])delete next[n];
  if(!Object.keys(next).length){const guard=action==='connection'&&req.method==='POST'?'':previous?'&encrypted_tokens=eq.'+encodeURIComponent(previous):'';await accountDatabase(account,filter+guard,{method:'DELETE'});}
  else{
   const encrypted=await seal(account.user.id+':'+provider,JSON.stringify(next),Date.now()+365*86400000,key);
   if(action==='callback')await accountDatabase(account,'provider_connections?on_conflict=user_id,provider',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({user_id:account.user.id,provider,encrypted_tokens:encrypted})});
   else if(previous)await accountDatabase(account,filter+'&encrypted_tokens=eq.'+encodeURIComponent(previous),{method:'PATCH',body:JSON.stringify({encrypted_tokens:encrypted})});
  }
 }
 return finish(response);
 }catch{const res=accountJson({error:'Could not access your saved connection. Please retry.',connected:false},503);return account?attachAccount(res,account):res;}
}


