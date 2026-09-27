import { paletteFromPixels, paletteFromHex, type Palette } from './visual-theme';
import { type Mood, type MoodVector, type Pin } from './types';

const words:Record<Mood,RegExp>={
 dreamy:/\b(dream|cloud|moon|pastel|stars|mist|flowers|pink)\b/i,
 nostalgic:/\b(vintage|memory|retro|old|film|autumn)\b/i,
 calm:/\b(quiet|forest|ocean|book|peace|minimal|lake|rain)\b/i,
 warm:/\b(sunset|coffee|warm|summer|beach|sunlight|golden)\b/i,
 energetic:/\b(bright|dance|neon|party|sport|festival)\b/i,
 cinematic:/\b(night|mountain|storm|city|dramatic|dark)\b/i,
};
export function pictureMood(pin:Pin,palette:Palette|null):MoodVector {
 const scores={...pin.mood};
 const text=pin.title+' '+pin.tags.join(' ');
 for(const mood of Object.keys(words) as Mood[])if(words[mood].test(text))scores[mood]+=0.65;
 if(palette){
  if(palette.dark){scores.cinematic+=.35;scores.nostalgic+=.15;}
  else if(palette.saturation<25){scores.calm+=.3;scores.dreamy+=.15;}
  if(palette.hue<65||palette.hue>340)scores.warm+=.3;
  else if(palette.hue<220)scores.calm+=.3;
  else scores.dreamy+=.3;
  if(palette.saturation>45&&!palette.dark)scores.energetic+=.2;
 }
 const max=Math.max(...Object.values(scores));
 return Object.fromEntries(Object.entries(scores).map(([k,v])=>[k,v/max])) as MoodVector;
}
export function dominantMood(mood:MoodVector):Mood{return (Object.keys(mood) as Mood[]).sort((a,b)=>mood[b]-mood[a])[0];}
export async function analyzePicture(pin:Pin):Promise<MoodVector>{
 const known=paletteFromHex(pin.dominantColor);
 if(known)return pictureMood(pin,known);
 const palette=await new Promise<Palette|null>(resolve=>{
  const img=new Image();img.crossOrigin='anonymous';img.referrerPolicy='no-referrer';
  const finish=(p:Palette|null)=>{clearTimeout(timer);img.onload=null;img.onerror=null;resolve(p);};
  const timer=setTimeout(()=>finish(null),4500);
  img.onerror=()=>finish(null);
  img.onload=()=>{try{const canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return finish(null);ctx.drawImage(img,0,0,48,48);finish(paletteFromPixels(ctx.getImageData(0,0,48,48).data));}catch{finish(null);}};
  try{const url=new URL(pin.image,window.location.origin);img.src=url.hostname==='i.pinimg.com'?('/_next/image?'+new URLSearchParams({url:url.href,w:'64',q:'75'})):url.href;}catch{finish(null);}
 });
 return pictureMood(pin,palette);
}

