import { pins, tracks, boards } from '@/mock/catalog';
import type { Pin, Track } from '../types';
import type { MusicProvider, VisualProvider, VisionProvider } from './contracts';
export class MockMusicProvider implements MusicProvider {
 async searchTracks(){return [...tracks];}
 async getTrack(id:string){return tracks.find(t=>t.id===id)||null;}
 async getTrackMetadata(id:string){return this.getTrack(id);}
 async getPlayableSource(track:Track){return track.source || null;}
}
export class MockPinterestProvider implements VisualProvider {
 async getBoards(){return boards.map(name=>({id:name,name}));}
 async getPins({boards:enabled,cursor='0',limit=12,query=''}:{boards?:string[];cursor?:string;limit?:number;query?:string}={}){
  const filtered=pins.filter(p=>(!enabled || enabled.includes(p.board)) && `${p.title} ${p.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const start=Math.max(0,Number(cursor)||0);const end=start+Math.max(1,Math.min(30,limit));
  return {items:filtered.slice(start,end),cursor:end<filtered.length?String(end):undefined};
 }
}
export class MockVisionProvider implements VisionProvider {
 private cache=new Map<string,{descriptors:string[];mood:Pin['mood']}>();
 async analyze(pin:Pin){let result=this.cache.get(pin.id);if(!result){result={descriptors:pin.tags,mood:pin.mood};this.cache.set(pin.id,result);}return result;}
}
export const mockMusic=new MockMusicProvider();
export const mockVisuals=new MockPinterestProvider();
export const mockVision=new MockVisionProvider();
