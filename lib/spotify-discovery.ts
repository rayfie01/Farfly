import { neutral, type Mood, type Track } from './types';
export const searches:Record<Mood,string[]>={calm:['genre:ambient','genre:acoustic'],dreamy:['genre:dream-pop','genre:chillwave'],warm:['genre:soul','genre:bossa-nova'],nostalgic:['genre:soft-rock year:1970-1999','genre:indie-folk'],energetic:['genre:dance','genre:funk'],cinematic:['genre:classical','genre:ambient']};
export function isMood(value:unknown):value is Mood{return typeof value==='string'&&Object.hasOwn(searches,value);}
export function normalizeSpotify(items:unknown[]):Track[]{
 const seen=new Set<string>();const artists=new Map<string,number>();
 return items.flatMap(value=>{
  const t=value as {id?:string;name?:string;is_local?:boolean;is_playable?:boolean;restrictions?:unknown;duration_ms?:number;artists?:{name:string}[];album?:{images?:{url:string}[]}};
  if(!t||!t.id||!/^[a-zA-Z0-9]{22}$/.test(t.id)||!t.name||!t.artists?.length||t.is_local||t.is_playable===false||t.restrictions)return [];
  const signature=t.name.toLowerCase()+'|'+t.artists[0].name.toLowerCase();
  const artist=t.artists[0].name;if(seen.has(signature)||(artists.get(artist)||0)>=3)return [];
  seen.add(signature);artists.set(artist,(artists.get(artist)||0)+1);
  const artwork=t.album?.images?.find(i=>i.url.startsWith('https://i.scdn.co/'))?.url||'/farfly-orca.png';
  return [{id:'spotify:track:'+t.id,title:t.name,artist:t.artists.map(a=>a.name).join(', '),artwork,colors:['#50685e','#15251f'] as [string,string],duration:(t.duration_ms||0)/1000,source:'',tags:[],mood:neutral,provider:'spotify' as const,permalink:'https://open.spotify.com/track/'+t.id}];
 }).slice(0,15);
}
export function recommendationQueue(current:Track|null,tracks:Track[]):Track[]{return current?[current,...tracks.filter(t=>t.id!==current.id)]:tracks;}
export function nextRecommendation(currentId:string|undefined,tracks:Track[]):Track|undefined {const i=tracks.findIndex(t=>t.id===currentId);return tracks.length?tracks[(i+1)%tracks.length]:undefined;}
export function trackFinished(before:{paused:boolean;position:number;duration:number;id:string}|null,after:{paused:boolean;position:number;duration:number;id:string}):boolean {
 return !!before&&!before.paused&&after.paused&&before.id===after.id&&before.duration>0&&before.position>=before.duration-2500&&after.position===0;
}

