 'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
type User={id:string;email:string;firstName:string;lastName:string};
const AccountContext=createContext<User|null>(null);
export const useAccount=()=>useContext(AccountContext);
export function AccountProvider({children}:{children:React.ReactNode}){
 const path=usePathname();const [user,setUser]=useState<User|null>(null),[error,setError]=useState('');
 useEffect(()=>{
  if(path==='/auth')return;
  let active=true;
  const check=()=>{void fetch('/api/account/session',{cache:'no-store'}).then(async r=>{
   if(!active)return;
   if(r.status===401){window.location.assign('/auth');return;}
   if(!r.ok)throw Error();
   const d=await r.json() as {user:User};if(active)setUser(d.user);
  }).catch(()=>{if(active)setError('Unable to check your account. Please reload.');});};
  check();window.addEventListener('focus',check);
  const channel=typeof BroadcastChannel==='undefined'?null:new BroadcastChannel('farfly-account');
  if(channel)channel.onmessage=()=>window.location.reload();
  return()=>{active=false;window.removeEventListener('focus',check);channel?.close();};
 },[path]);
 if(path==='/auth')return <>{children}</>;
 if(!user)return <main className="auth-form"><output>{error||'Opening your world…'}</output></main>;
 return <AccountContext.Provider key={user.id} value={user}>{children}</AccountContext.Provider>;
}

