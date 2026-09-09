import { ProviderError, type VisualProvider } from './contracts';
import { neutral, type Pin } from '../types';
type PinterestPin={id:string;title?:string;description?:string;board_id?:string;link?:string;media?:{images?:Record<string,{url:string;width:number;height:number}>}};
export class PinterestProvider implements VisualProvider {
 constructor(private token:string){if(!token)throw new ProviderError('Pinterest is not connected.',401);}
 private async request(path:string){const r=await fetch(`https://api.pinterest.com/v5${path}`,{headers:{Authorization:`Bearer ${this.token}`},signal:AbortSignal.timeout(10000)});if(!r.ok)throw new ProviderError(r.status===401?'Reconnect Pinterest to continue.':'Pinterest is temporarily unavailable.',r.status);return r.json() as Promise<{items: PinterestPin[] & {id:string;name:string}[];bookmark?:string}>;}
 async getBoards(){const r=await this.request('/boards?page_size=100');return (r.items||[]).map((b:{id:string;name:string})=>({id:b.id,name:b.name}));}
 async getPins({boards=[],cursor,limit=20}:{boards?:string[];cursor?:string;limit?:number}){
  if(!boards.length)return {items:[]};
  // Cursor belongs to the first selected board; the service orchestrates additional boards.
  const r=await this.request(`/boards/${encodeURIComponent(boards[0])}/pins?page_size=${Math.min(100,limit)}${cursor?`&bookmark=${encodeURIComponent(cursor)}`:''}`);
  const items:Pin[]=(r.items as PinterestPin[]||[]).flatMap(p=>{const image=Object.values(p.media?.images||{})[0];return image?[{id:`pinterest-${p.id}`,title:p.title||'A visual from your world',image:image.url,width:image.width,height:image.height,board:p.board_id||boards[0],tags:[],mood:neutral,photographer:'Pinterest',source:`https://www.pinterest.com/pin/${p.id}/`}]:[];});return {items,cursor:r.bookmark||undefined};
 }
}

