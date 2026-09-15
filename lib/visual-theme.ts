import type { MoodVector } from './types';
export type Palette={hue:number;saturation:number;dark:boolean};
export type ThemeMode='visuals'|'mood'|'fixed';
export function moodPalette(m:MoodVector):Palette{
 const key=(Object.keys(m) as (keyof MoodVector)[]).sort((a,b)=>m[b]-m[a])[0];
 return {hue:{dreamy:270,nostalgic:32,calm:195,warm:24,energetic:335,cinematic:220}[key],saturation:35,dark:false};
}
export function paletteFromPixels(data:ArrayLike<number>):Palette{
 const bins=new Map<number,{r:number;g:number;b:number;n:number}>();let light=0,count=0;
 for(let i=0;i<data.length;i+=4){if(data[i+3]<128)continue;const r=data[i],g=data[i+1],b=data[i+2];light+=(r*.2126+g*.7152+b*.0722)/255;count++;const key=(r>>5)*64+(g>>5)*8+(b>>5);const v=bins.get(key)||{r:0,g:0,b:0,n:0};v.r+=r;v.g+=g;v.b+=b;v.n++;bins.set(key,v);}
 const best=[...bins.values()].sort((a,b)=>b.n-a.n)[0];if(!best)return {hue:100,saturation:15,dark:false};
 const r=best.r/best.n/255,g=best.g/best.n/255,b=best.b/best.n/255,max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2;
 let h=0;if(d)h=(max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4)*60;
 return {hue:(h+360)%360,saturation:d?Math.min(55,d/(1-Math.abs(2*l-1))*100):0,dark:count>0&&light/count<.34};
}

