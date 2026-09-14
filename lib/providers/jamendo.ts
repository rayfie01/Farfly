import { neutral, type Track, type Mood } from '../types';
import { ProviderError, type MusicProvider } from './contracts';

export const jamendoTags: Record<Mood,string> = {dreamy:'dream+ambient',nostalgic:'indie+acoustic',calm:'relaxation+ambient',warm:'soul+jazz',energetic:'dance+electronic',cinematic:'soundtrack+classical'};
function safeUrl(value:unknown,domain:string){
 try {const u=new URL(String(value)); if(!['http:','https:'].includes(u.protocol)||u.username||u.password||!(u.hostname===domain||u.hostname.endsWith('.'+domain)))return '';u.protocol='https:';return u.href;}catch{return '';}
}
export function normalizeJamendo(value:unknown):Track|null {
 if(!value||typeof value!=='object')return null;
 const t=value as Record<string,unknown>;
 const id=String(t.id);const source=safeUrl(t.audio,'jamendo.com');const licenseUrl=safeUrl(t.license_ccurl,'creativecommons.org');
 if(!/^\d+$/.test(id)||!source||!licenseUrl||typeof t.name!=='string'||typeof t.artist_name!=='string'||!Number.isFinite(Number(t.duration))||Number(t.duration)<=0)return null;
 const info=t.musicinfo as {tags?:Record<string,string[]>}|undefined;
 const tags=Object.values(info?.tags||{}).flat().filter((v):v is string=>typeof v==='string').slice(0,30);
 const mood={...neutral};for(const k of Object.keys(jamendoTags) as Mood[])if(tags.some(tag=>jamendoTags[k].split('+').includes(tag.toLowerCase())))mood[k]=.85;
 return {id:'jamendo-'+id,title:t.name,artist:t.artist_name,source,duration:Number(t.duration),artwork:safeUrl(t.image,'jamendo.com')||'/favicon.svg',colors:['#64727d','#172329'],tags,mood,provider:'jamendo',permalink:'https://www.jamendo.com/track/'+id,licenseUrl};
}
export class JamendoMusicProvider implements MusicProvider {
 constructor(private clientId:string){if(!clientId)throw new ProviderError('Jamendo is not configured.',503);}
 private async request(params:Record<string,string>){
  const url=new URL('https://api.jamendo.com/v3.0/tracks/');url.search=new URLSearchParams({client_id:this.clientId,format:'json',audioformat:'mp32',imagesize:'400',include:'musicinfo',type:'single albumtrack',limit:'20',...params}).toString();
  const r=await fetch(url,{signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new ProviderError('Jamendo could not load music. Please try again later.',r.status===429?429:502);
  const body=await r.json() as {headers?:{status?:string};results?:Record<string,unknown>[]};if(body.headers?.status!=='success'||!Array.isArray(body.results))throw new ProviderError('Jamendo rejected the request. Check the app configuration.',502);
  return body.results.map(normalizeJamendo).filter((t:Track|null):t is Track=>t!==null) as Track[];
 }
 async searchTracks(queries:string[]){const results=await Promise.all(queries.slice(0,2).map(fuzzytags=>this.request({fuzzytags})));return [...new Map(results.flat().map(t=>[t.id,t])).values()];}
 async getTrack(id:string){const raw=id.replace(/^jamendo-/,'');if(!/^\d+$/.test(raw))return null;return (await this.request({id:raw,limit:'1'}))[0]||null;}
 async getPlayableSource(track:Track){return (await this.getTrack(track.id))?.source||null;}
 getTrackMetadata(id:string){return this.getTrack(id);}
}
