import type { Pin, MoodVector } from '../types';
import { ProviderError, type VisionProvider } from './contracts';
// Vendor-neutral boundary. Supply a server-side vision call returning this validated shape.
export class VisionModelProvider implements VisionProvider {
 private cache=new Map<string,{descriptors:string[];mood:MoodVector}>();
 constructor(private infer:(imageUrl:string)=>Promise<unknown>){}
 async analyze(pin:Pin){const hit=this.cache.get(pin.id);if(hit)return hit;const raw=await this.infer(pin.image) as {descriptors?:unknown;mood?:Record<string,unknown>};if(!Array.isArray(raw.descriptors)||!raw.descriptors.every(x=>typeof x==='string')||!raw.mood)throw new ProviderError('Image analysis returned an invalid response.');const mood={} as MoodVector;for(const key of ['dreamy','nostalgic','calm','warm','energetic','cinematic'] as const){const value=raw.mood[key];if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1)throw new ProviderError('Image analysis returned an invalid mood.');mood[key]=value;}const result={descriptors:raw.descriptors as string[],mood};if(this.cache.size>500)this.cache.clear();this.cache.set(pin.id,result);return result;}
}
