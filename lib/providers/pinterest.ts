import { ProviderError, type VisualProvider } from './contracts';
import { neutral, type Pin, type MoodVector } from '../types';
type Board={id:string;name:string};
type PinterestPin={id:string;title?:string;description?:string;dominant_color?:string;media?:{images?:Record<string,{url:string;width:number;height:number}>}};
const themes:Record<keyof MoodVector,string[]>={dreamy:['dream','cloud','moon','pastel'],nostalgic:['vintage','memory','retro','old'],calm:['quiet','forest','ocean','book','minimal'],warm:['sunset','coffee','warm','summer'],energetic:['bright','dance','city','color'],cinematic:['night','rain','mountain','sea']};
function describe(text:string) {
 const words:string[]=Array.from(text.toLowerCase().match(/[a-z]+/g)||[]);
 const mood={...neutral};
 for(const dimension of Object.keys(themes) as (keyof MoodVector)[])if(themes[dimension].some(word=>words.includes(word)))mood[dimension]=.85;
 return {tags:[...new Set(words)].slice(0,12),mood};
}
function imageUrl(value:string) {
 try {const url=new URL(value);return url.protocol==='https:' && (url.hostname==='i.pinimg.com'||url.hostname.endsWith('.pinimg.com'))?url.href:null;}catch{return null;}
}
export class PinterestProvider implements VisualProvider {
 constructor(private token:string){if(!token)throw new ProviderError('Pinterest is not connected.',401);}
 private async request<T>(path:string):Promise<T>{
  const r=await fetch('https://api.pinterest.com/v5'+path,{headers:{Authorization:'Bearer '+this.token},cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new ProviderError(r.status===401?'Reconnect Pinterest to continue.':r.status===429?'Pinterest request limit reached. Please try again later.':r.status===403?'Pinterest has not granted access to this content.':'Pinterest is temporarily unavailable.',r.status);
  return r.json() as Promise<T>;
 }
 async getBoardsPage(cursor?:string) {
  const r=await this.request<{items?:Board[];bookmark?:string}>('/boards?page_size=100'+(cursor?'&bookmark='+encodeURIComponent(cursor):''));
  return {items:(r.items||[]).filter(b=>/^\d+$/.test(b.id)&&typeof b.name==='string').map(b=>({id:b.id,name:b.name})),cursor:r.bookmark||undefined};
 }
 async getBoards(){return (await this.getBoardsPage()).items;}
 async getPins({boards=[],cursor,limit=20}:{boards?:string[];cursor?:string;limit?:number}) {
  if(!boards.length)return {items:[]};
  const r=await this.request<{items?:PinterestPin[];bookmark?:string}>('/boards/'+encodeURIComponent(boards[0])+'/pins?page_size='+Math.min(100,Math.max(1,limit))+(cursor?'&bookmark='+encodeURIComponent(cursor):''));
  const items:Pin[]=(r.items||[]).flatMap(p=>{
   const images=Object.values(p.media?.images||{}).filter(i=>i.width>0&&i.height>0&&imageUrl(i.url)).sort((a,b)=>b.width-a.width);
   const image=images[0];
   if(!image||!/^\d+$/.test(p.id))return [];
   return [{id:'pinterest-'+p.id,title:p.title||'A visual from your world',image:imageUrl(image.url)!,...(typeof p.dominant_color==='string'&&/^#?[0-9a-f]{6}$/i.test(p.dominant_color)?{dominantColor:p.dominant_color}:{}),width:image.width,height:image.height,board:'pinterest-'+boards[0],...describe((p.title||'')+' '+(p.description||'')),photographer:'View on Pinterest',source:'https://www.pinterest.com/pin/'+p.id+'/'}];
  });
  return {items,cursor:r.bookmark||undefined};
 }
}


