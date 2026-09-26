// Server-only account sessions. Never log passwords, access tokens, or refresh tokens.
export const accountOrigin='https://farfly.vercel.app';
const database='https://exqhzubidjkvmsklamcg.supabase.co';
const publishable='sb_publishable_Hzn1VmGNvCTh1Zj9wlHC-A_7IuwZDE0';
export const privateHeaders={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
export const accountJson=(body:unknown,status=200)=>Response.json(body,{status,headers:privateHeaders});
export function readCookie(req:Request,name:string){return req.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1);}
export function accountCookie(res:Response,name:string,value:string,age:number){res.headers.append('Set-Cookie',`${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${age}`);}
type Tokens={access_token:string;refresh_token:string;expires_in:number};
type User={id:string;email?:string;user_metadata?:{first_name?:string;last_name?:string}};
export type Account={user:User;access:string;cookies:string[]};
async function auth(path:string,init:RequestInit={}){return fetch(database+'/auth/v1/'+path,{...init,headers:{apikey:publishable,'Content-Type':'application/json',...Object.fromEntries(new Headers(init.headers).entries())},cache:'no-store',signal:AbortSignal.timeout(10000)});}
function save(res:Response,t:Tokens){accountCookie(res,'ff_access',t.access_token,Math.max(60,t.expires_in));accountCookie(res,'ff_refresh',t.refresh_token,30*86400);}
export async function getAccount(req:Request):Promise<Account|null>{
 let access=readCookie(req,'ff_access');const refresh=readCookie(req,'ff_refresh');const response=accountJson({});
 if(access){const r=await auth('user',{headers:{Authorization:'Bearer '+access}});if(r.ok)return {user:await r.json(),access,cookies:[]};if(r.status!==401&&r.status!==403)throw Error('Account service unavailable');}
 if(!refresh)return null;
 const r=await auth('token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:refresh})});
 if(!r.ok){if(r.status===400||r.status===401||r.status===403)return null;throw Error('Account service unavailable');}
 const t=await r.json() as Tokens;access=t.access_token;
 const user=await auth('user',{headers:{Authorization:'Bearer '+access}});if(!user.ok)throw Error('Could not verify account');save(response,t);
 return {user:await user.json(),access,cookies:response.headers.getSetCookie()};
}
export function attachAccount(res:Response,account:Account){for(const c of account.cookies)res.headers.append('Set-Cookie',c);return res;}
export async function accountDatabase(account:Account,path:string,init:RequestInit={}){const r=await fetch(database+'/rest/v1/'+path,{...init,headers:{apikey:publishable,Authorization:'Bearer '+account.access,'Content-Type':'application/json',...Object.fromEntries(new Headers(init.headers).entries())},cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Database unavailable');return r;}
export function validateRegistration(b:Record<string,unknown>){return typeof b.firstName==='string'&&b.firstName.trim().length>0&&b.firstName.trim().length<=80&&typeof b.lastName==='string'&&b.lastName.trim().length>0&&b.lastName.trim().length<=80&&typeof b.password==='string'&&b.password.length>=12&&b.password.length<=128&&b.password===b.confirmPassword;}
export async function handleAccount(req:Request){
 const action=new URL(req.url).pathname.split('/').pop();
 if(new URL(req.url).origin!==accountOrigin||(req.method==='POST'&&req.headers.get('origin')!==accountOrigin))return accountJson({error:'Invalid origin.'},403);
 try{
 if(action==='session'&&req.method==='GET'){const a=await getAccount(req);return a?attachAccount(accountJson({user:{id:a.user.id,email:a.user.email,firstName:a.user.user_metadata?.first_name,lastName:a.user.user_metadata?.last_name}}),a):accountJson({user:null},401);}
 if(req.method!=='POST')return accountJson({error:'Method not allowed.'},405);
 if(action==='logout'){const a=await getAccount(req);if(a){const r=await auth('logout?scope=local',{method:'POST',headers:{Authorization:'Bearer '+a.access}});if(!r.ok&&r.status!==401)return accountJson({error:'Could not sign out. Please retry.'},503);}const res=accountJson({ok:true});for(const name of ['ff_access','ff_refresh','ff_link_pinterest','ff_link_spotify'])accountCookie(res,name,'',0);return res;}
 if(!['register','login'].includes(action||''))return accountJson({error:'Not found.'},404);
 const raw=await req.text();if(raw.length>4096)return accountJson({error:'Form is too long.'},400);
 let parsed:unknown;try{parsed=JSON.parse(raw);}catch{return accountJson({error:'Invalid form.'},400);}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return accountJson({error:'Invalid form.'},400);
 const b=parsed as Record<string,unknown>;
 if(typeof b.email!=='string'||b.email.length>254||!/^\S+@\S+\.\S+$/.test(b.email)||typeof b.password!=='string'||b.password.length>128)return accountJson({error:'Enter a valid email and password.'},400);
 if(action==='register'&&!validateRegistration(b))return accountJson({error:'Enter both names and matching passwords of at least 12 characters.'},400);
 const r=await auth(action==='register'?'signup':'token?grant_type=password',{method:'POST',body:JSON.stringify({email:b.email.trim().toLowerCase(),password:b.password,...(action==='register'?{data:{first_name:(b.firstName as string).trim(),last_name:(b.lastName as string).trim()}}:{})})});
 const data=await r.json() as Tokens;
 if(!r.ok)return accountJson({error:r.status===429?'Too many attempts. Please wait and try again.':action==='login'?'Unable to sign in. Check your email, password, and email verification.':'Unable to register. Try signing in if you already have an account.'},r.status===429?429:400);
 const res=accountJson({ok:true,verificationRequired:!data.access_token});if(data.access_token)save(res,data);return res;
 }catch{return accountJson({error:'Account service is temporarily unavailable. Please retry.'},503);}
}

