// Server-only adapter: inject an account-scoped OAuth access token after authentication.
import type { MusicProvider } from './contracts';
import { ProviderError } from './contracts';
import { neutral, type Track } from '../types';
type SCTrack={id:number;title?:string;duration?:number;artwork_url?:string;permalink_url?:string;streamable?:boolean;access?:string;tag_list?:string;user?:{username?:string;avatar_url?:string}};
export class SoundCloudMusicProvider implements MusicProvider {
 constructor(private accessToken:string){if(!accessToken)throw new ProviderError('SoundCloud is not connected.',401);}
 private async request<T>(path:string){const r=await fetch(`https://api.soundcloud.com${path}`,{headers:{Authorization:`OAuth ${this.accessToken}`},signal:AbortSignal.timeout(10000)});if(!r.ok)throw new ProviderError(r.status===429?'SoundCloud is busy. Please try again shortly.':'SoundCloud could not load this music.',r.status);return r.json() as Promise<T>;}
 private normalize(t:SCTrack):Track|null {if(!t.streamable || t.access==='blocked')return null;return {id:`sc-${t.id}`,title:t.title||'Untitled track',artist:t.user?.username||'SoundCloud creator',artwork:t.artwork_url||t.user?.avatar_url||'',duration:(t.duration||0)/1000,source:'',colors:['#64727d','#172329'],tags:(t.tag_list||'').split(' ').filter(Boolean),mood:neutral,provider:'soundcloud',permalink:t.permalink_url};}
 async searchTracks(queries:string[]){const results=await Promise.allSettled(queries.slice(0,3).map(q=>this.request<SCTrack[]|{collection:SCTrack[]}>(`/tracks?q=${encodeURIComponent(q)}&limit=15&linked_partitioning=true`)));const seen=new Map<string,Track>();for(const r of results){if(r.status!=='fulfilled')continue;const rows=(Array.isArray(r.value)?r.value:r.value.collection||[]) as SCTrack[];for(const row of rows){const t=this.normalize(row);if(t)seen.set(t.id,t);}}return [...seen.values()];}
 async getTrack(id:string){if(!/^sc-\d+$/.test(id))return null;return this.normalize(await this.request<SCTrack>(`/tracks/${id.slice(3)}`));}
 async getTrackMetadata(id:string){return this.getTrack(id);}
 async getPlayableSource(track:Track){if(!/^sc-\d+$/.test(track.id))return null;const streams=await this.request<{http_mp3_128_url?:string}>(`/tracks/${track.id.slice(3)}/streams`);return typeof streams.http_mp3_128_url==='string'?streams.http_mp3_128_url:null;}
}

