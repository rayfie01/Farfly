'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useAtmos } from './atmos-provider';
import { dominantMood } from '@/lib/picture-mood';
import { recommendationQueue, nextRecommendation, trackFinished } from '@/lib/spotify-discovery';
import { neutral, type Track } from '@/lib/types';
type SpotifyTrack={name:string;uri:string;artists:{name:string}[];album:{images:{url:string}[]}};
type Playback={paused:boolean;position:number;duration:number;track_window:{current_track:SpotifyTrack;previous_tracks?:SpotifyTrack[];next_tracks?:SpotifyTrack[]}};
type Player={connect:()=>Promise<boolean>;disconnect:()=>void;pause:()=>Promise<void>;activateElement:()=>Promise<void>;togglePlay:()=>Promise<void>;previousTrack:()=>Promise<void>;nextTrack:()=>Promise<void>;seek:(n:number)=>Promise<void>;setVolume:(n:number)=>Promise<void>;getCurrentState:()=>Promise<Playback|null>;addListener:((name:'ready',callback:(event:{device_id:string})=>void)=>void)&((name:'player_state_changed',callback:(event:Playback|null)=>void)=>void)&((name:string,callback:(event:{message?:string})=>void)=>void)};
declare global {interface Window {Spotify?:{Player:new(options:{name:string;getOAuthToken:(cb:(token:string)=>void)=>void;volume:number})=>Player};onSpotifyWebPlaybackSDKReady?:()=>void}}
async function api(action:string,body?:unknown){const r=await fetch('/api/spotify/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body??{}),cache:'no-store'});const data=await r.json() as {error?:string;access_token:string;url?:string};if(!r.ok)throw Error(data.error||'Spotify request failed.');return data;}

function useSpotifyState(){
 const {pause,playing:demoPlaying,focusedPicture,pictureBusy,mood}=useAtmos();
 const [selected,setSelected]=useState(true);const pauseRef=useRef(pause);useEffect(()=>{pauseRef.current=pause;},[pause]);
 const player=useRef<Player|null>(null);
 const [recommendations,setRecommendations]=useState<Track[]>([]),[recommendationBusy,setRecommendationBusy]=useState(false),[recommendationError,setRecommendationError]=useState('');
 const [discovery,setDiscovery]=useState({key:'',page:0});
 const [recommendationHasMore,setRecommendationHasMore]=useState(true);
 const recommendationOwner=useRef('');
 const advance=useRef<()=>void>(()=>{});
 const prior=useRef<{paused:boolean;position:number;duration:number;id:string}|null>(null);
 const requested=useRef<string>('');
 const [connected,setConnected]=useState(false),[loaded,setLoaded]=useState(false),[device,setDevice]=useState(''),[state,setState]=useState<Playback|null>(null),[error,setError]=useState(''),[input,setInput]=useState(''),[busy,setBusy]=useState(false),[volume,setVolume]=useState(.65);
 useEffect(()=>{let active=true;fetch('/api/spotify/connection',{cache:'no-store'}).then(r=>r.json() as Promise<{connected?:boolean;error?:string}>).then(d=>{if(active){setConnected(!!d.connected);setLoaded(true);if(d.error)setError(d.error);const result=new URLSearchParams(location.search).get('result');if(result&&result!=='connected')setError('Spotify sign-in did not finish. Please reconnect.');}}).catch(()=>{if(active){setError('Could not check your Spotify connection.');setLoaded(true);}});return()=>{active=false;};},[]);
 useEffect(()=>{
  if(!connected)return;
  let active=true,started=false;
  const start=()=>{
   if(!active||started||!window.Spotify)return;started=true;
   const p=new window.Spotify.Player({name:'Far.Fly',volume:.65,getOAuthToken:cb=>{api('token').then(d=>{if(active)cb(d.access_token);}).catch(e=>{if(active)setError(e.message);});}});player.current=p;
   p.addListener('ready',({device_id}:{device_id:string})=>{if(active)setDevice(device_id);});
   p.addListener('not_ready',()=>{if(active)setDevice('');});
   p.addListener('player_state_changed',(s:Playback|null)=>{if(!active)return;setState(s);if(s){const snapshot={paused:s.paused,position:s.position,duration:s.duration,id:s.track_window.current_track.uri};const ended=trackFinished(prior.current,snapshot);prior.current=snapshot;if(ended)advance.current();}});
   for(const event of ['initialization_error','authentication_error','account_error','playback_error'])p.addListener(event,({message})=>{if(active)setError(event==='account_error'?'Spotify Premium is required.':`${event}: ${(message||'Reconnect and try again.').slice(0,240)}`);});
   p.addListener('autoplay_failed',()=>{if(active)setError('Your browser paused automatic playback. Press Play to continue.');});
   p.connect().then(ok=>{if(active&&!ok)setError('Spotify player could not connect.');}).catch(()=>{if(active)setError('Spotify player could not connect.');});
  };
  window.onSpotifyWebPlaybackSDKReady=start;start();
  const poll=setInterval(()=>{player.current?.getCurrentState().then(s=>{if(active){setState(s);if(s&&!s.paused)prior.current={paused:s.paused,position:s.position,duration:s.duration,id:s.track_window.current_track.uri};}}).catch(()=>{});},500);
  return()=>{active=false;clearInterval(poll);delete window.onSpotifyWebPlaybackSDKReady;player.current?.disconnect();player.current=null;};
 },[connected]);
 async function command(fn:()=>Promise<unknown>){setError('');try{await fn();}catch{setError('Playback control failed. Please try again.');}}
 useEffect(()=>{if(demoPlaying)void player.current?.pause().then(()=>setSelected(false)).catch(()=>{});},[demoPlaying]);
 async function play(value=input){
  const match=value.trim().match(/^(?:spotify:track:|https:\/\/open\.spotify\.com\/(?:intl-[a-z]+\/)?track\/)([a-zA-Z0-9]{22})(?:\?[^\s]*)?$/);
  if(!match){setError('Choose a Spotify song or paste its link.');return;}
  if(!device||!player.current){setError('Wait for the Spotify player to connect, then try again.');return;}
  setBusy(true);setError('');try{await player.current.activateElement();await api('play',{device,uri:'spotify:track:'+match[1]});pauseRef.current();setSelected(true);requested.current='spotify:track:'+match[1];}catch(e){setError(e instanceof Error?e.message:'Playback failed.');}finally{setBusy(false);}
 }
 const pictureId=focusedPicture?.id;
 const selectedMood=dominantMood(mood);
 const discoveryKey=(pictureId||'')+':'+selectedMood;
 const discoveryIndex=discovery.key===discoveryKey?discovery.page:0;
 const moreSongs=()=>{if(!recommendationBusy&&!pictureBusy)setDiscovery({key:discoveryKey,page:Math.min(29,discoveryIndex+1)});};
 useEffect(()=>{
  if(!connected||!pictureId||pictureBusy)return;
  const controller=new AbortController();let active=true;
  const timer=setTimeout(()=>{
   setRecommendationBusy(true);setRecommendationError('');
   void fetch('/api/spotify/recommendations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mood:selectedMood,page:discoveryIndex}),signal:controller.signal,cache:'no-store'}).then(async r=>{const d=await r.json() as {tracks?:Track[];error?:string;hasMore?:boolean};if(!r.ok)throw Error(d.error||'Could not load recommendations.');if(!active)return;setRecommendationHasMore(!!d.hasMore);if(!d.tracks?.length){setRecommendationError('No new songs in this batch. Try discovering more.');return;}const append=discoveryIndex>0&&recommendationOwner.current===discoveryKey;recommendationOwner.current=discoveryKey;setRecommendations(old=>Array.from(new Map([...(append?old:[]),...d.tracks!].map(t=>[t.id,t])).values()));}).catch(e=>{if(active)setRecommendationError(e instanceof Error?e.message:'Could not load songs.');}).finally(()=>{if(active)setRecommendationBusy(false);});
  },300);
  return()=>{active=false;clearTimeout(timer);controller.abort();};
 },[connected,pictureId,pictureBusy,selectedMood,discoveryKey,discoveryIndex]);
 async function connect(){setBusy(true);setError('');try{const result=await api('connect');if(!result.url||new URL(result.url).origin!=='https://accounts.spotify.com')throw Error('Spotify sign-in could not start. Please retry.');window.location.assign(result.url);}catch(e){setError(e instanceof Error?e.message:'Could not connect Spotify.');setBusy(false);}}
 async function disconnect(){setBusy(true);try{await player.current?.pause?.();}catch{}try{await api('connection');player.current?.disconnect();setConnected(false);setDevice('');setState(null);setRecommendations([]);setRecommendationError('');prior.current=null;}catch(e){setError(e instanceof Error?e.message:'Could not disconnect.');}finally{setBusy(false);}}

 const track=state?.track_window.current_track;
 const toTrack=(track:SpotifyTrack):Track=>({id:track.uri,title:track.name,artist:track.artists.map(a=>a.name).join(', '),artwork:track.album.images[0]?.url||'/farfly-orca.png',colors:['#50685e','#15251f'],duration:(state?.duration||0)/1000,source:'',tags:[],mood:neutral,provider:'spotify',permalink:'https://open.spotify.com/track/'+track.uri.split(':').pop()});
 const current=track?toTrack(track):null;
 const tracks=state?[...(state.track_window.previous_tracks||[]),state.track_window.current_track,...(state.track_window.next_tracks||[])]:[];
 const queue=recommendations.length?recommendationQueue(current,recommendations):Array.from(new Map(tracks.map(t=>[t.uri,toTrack(t)])).values());
 const next=()=>{const candidate=nextRecommendation(current?.id,recommendations);if(candidate)void play(candidate.id);else void command(()=>player.current!.nextTrack());};
 useEffect(()=>{advance.current=()=>{const candidate=nextRecommendation(requested.current||current?.id,recommendations);if(candidate)void play(candidate.id);};});
 const toggle=()=>void command(async()=>{pauseRef.current();await player.current!.activateElement();await player.current!.togglePlay();});
 return {selected,queue,recommendations,recommendationBusy,recommendationError,recommendationHasMore,moreSongs,connected,loaded,device,state,error,input,setInput,busy,volume,current,play,connect,disconnect,toggle,
 next,previous:()=>void command(()=>player.current!.previousTrack()),
 seek:(seconds:number)=>void command(()=>player.current!.seek(seconds*1000)),
 setVolume:(v:number)=>{setVolume(v);void command(()=>player.current!.setVolume(v));},
 script:connected?<Script src="https://sdk.scdn.co/spotify-player.js" strategy="afterInteractive" onReady={()=>window.onSpotifyWebPlaybackSDKReady?.()} onError={()=>setError('Spotify player could not load. Check your browser settings.')}/>:null};
}
const SpotifyContext=createContext<ReturnType<typeof useSpotifyState>|null>(null);
export function SpotifyProvider({children}:{children:React.ReactNode}){const value=useSpotifyState();return <SpotifyContext.Provider value={value}>{value.script}{children}</SpotifyContext.Provider>;}
export function useSpotify(){const value=useContext(SpotifyContext);if(!value)throw Error('SpotifyProvider missing');return value;}
export function useMusicPlayer(){const a=useAtmos(),s=useSpotify();if(!s.current||!s.selected)return {...a,queue:s.connected&&s.recommendations.length?recommendationQueue(a.current,s.recommendations):a.queue,playTrack:(track:Track,autoplay=true)=>track.provider==='spotify'?void s.play(track.id):a.playTrack(track,autoplay)};return {...a,current:s.current,queue:s.queue,playing:!!s.state&&!s.state.paused,time:(s.state?.position||0)/1000,duration:(s.state?.duration||0)/1000,volume:s.volume,buffering:s.busy,error:s.error,musicStatus:'Spotify',toggle:s.toggle,next:s.next,previous:s.previous,seek:s.seek,setVolume:s.setVolume,playTrack:(track:Track)=>void s.play(track.id)};}

