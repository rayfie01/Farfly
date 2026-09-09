import type { Pin, Track, MoodVector } from '../types';
export interface MusicProvider {
 searchTracks(queries:string[]):Promise<Track[]>;
 getTrack(id:string):Promise<Track|null>;
 getPlayableSource(track:Track):Promise<string|null>;
 getTrackMetadata(id:string):Promise<Track|null>;
}
export interface VisualProvider {
 getBoards():Promise<{id:string;name:string}[]>;
 getPins(options:{boards?:string[];cursor?:string;limit?:number;query?:string}):Promise<{items:Pin[];cursor?:string}>;
}
export interface VisionProvider { analyze(pin:Pin):Promise<{descriptors:string[];mood:MoodVector}>; }
export class ProviderError extends Error {constructor(message:string,public status:number=503){super(message);this.name='ProviderError';}}
