import { JamendoMusicProvider, jamendoTags } from './providers/jamendo';
import { ProviderError } from './providers/contracts';
import type { Mood, Track } from './types';
// Six bounded discovery keys, short-lived metadata, and in-flight deduplication.
const cache=new Map<string,{until:number;tracks:Track[]}>();
const pending=new Map<string,Promise<Track[]>>();
export async function handleMusic(request:Request){
 const mood=new URL(request.url).searchParams.get('mood')||'calm';
 if(!Object.hasOwn(jamendoTags,mood))return Response.json({error:'Unknown mood.'},{status:400});
 const clientId=process.env.JAMENDO_CLIENT_ID?.trim();
 if(!clientId)return Response.json({configured:false,tracks:[],message:'Demo music · Jamendo is not configured.'},{headers:{'Cache-Control':'no-store'}});
 try {
  const key=clientId+':'+mood;let entry=cache.get(key);
  if(!entry||entry.until<Date.now()){
   let work=pending.get(key);if(!work){work=new JamendoMusicProvider(clientId).searchTracks([jamendoTags[mood as Mood]]);pending.set(key,work);}
   let tracks:Track[];try{tracks=await work;}finally{pending.delete(key);}
   entry={tracks,until:Date.now()+300000};cache.set(key,entry);
  }
  return Response.json({configured:true,tracks:entry.tracks},{headers:{'Cache-Control':'public, max-age=60, s-maxage=300'}});
 }catch(e){return Response.json({configured:true,error:e instanceof ProviderError?e.message:'Jamendo is temporarily unavailable.'},{status:e instanceof ProviderError?e.status:502,headers:{'Cache-Control':'no-store'}});}
}
