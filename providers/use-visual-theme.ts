import { useCallback, useEffect, useRef, useState } from 'react';
import { moodPalette, paletteFromPixels, type Palette, type ThemeMode } from '@/lib/visual-theme';
import type { Pin, MoodVector } from '@/lib/types';
const cache=new Map<string,Palette>();
export function useVisualTheme(mood:MoodVector){
 const [mode,setMode]=useState<ThemeMode>('visuals');const [palette,setPalette]=useState<Palette|null>(null);const [hydrated,setHydrated]=useState(false);const version=useRef(0);
 // Restore the user preference from external browser storage after hydration.
 // oxlint-disable-next-line react/react-compiler
 useEffect(()=>{try{const v=localStorage.getItem('farfly:theme');if(v==='visuals'||v==='mood'||v==='fixed')setMode(v);}catch{}setHydrated(true);},[]);
 useEffect(()=>{if(hydrated)try{localStorage.setItem('farfly:theme',mode);}catch{}},[mode,hydrated]);
 const followPicture=useCallback((pin:Pin)=>{
  const request=++version.current;const fallback=moodPalette(pin.mood);setPalette(cache.get(pin.image)||fallback);
  if(cache.has(pin.image))return;
  const img=new Image();img.crossOrigin='anonymous';img.referrerPolicy='no-referrer';
  const timer=setTimeout(()=>{img.onload=null;img.onerror=null;},6000);
  img.onload=()=>{clearTimeout(timer);try{const canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return;ctx.drawImage(img,0,0,48,48);const result=paletteFromPixels(ctx.getImageData(0,0,48,48).data);if(cache.size>=80)cache.delete(cache.keys().next().value!);cache.set(pin.image,result);if(request===version.current)setPalette(result);}catch{/* Cross-origin images retain the mood fallback. */}};
  img.onerror=()=>clearTimeout(timer);img.src=pin.image;
 },[]);
 const active=mode==='mood'?moodPalette(mood):palette||moodPalette(mood);
 useEffect(()=>{
  const root=document.documentElement;if(mode==='fixed'){root.removeAttribute('data-visual-theme');return;}
  root.dataset.visualTheme=active.dark?'dark':'light';root.style.setProperty('--theme-h',String(Math.round(active.hue)));root.style.setProperty('--theme-s',active.saturation+'%');
  return()=>{root.removeAttribute('data-visual-theme');};
 },[mode,active.hue,active.saturation,active.dark]);
 return {themeMode:mode,setThemeMode:setMode,followPicture};
}

