'use client';
import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useAtmos } from '@/providers/atmos-provider';
import './spotify.css';
type Playback={paused:boolean;position:number;duration:number;track_window:{current_track:{name:string;uri:string;artists:{name:string}[];album:{images:{url:string}[]}}}};
type Player={connect:()=>Promise<boolean>;disconnect:()=>void;pause:()=>Promise<void>;activateElement:()=>Promise<void>;togglePlay:()=>Promise<void>;previousTrack:()=>Promise<void>;nextTrack:()=>Promise<void>;seek:(n:number)=>Promise<void>;setVolume:(n:number)=>Promise<void>;getCurrentState:()=>Promise<Playback|null>;addListener:((name:'ready',callback:(event:{device_id:string})=>void)=>void)&((name:'player_state_changed',callback:(event:Playback|null)=>void)=>void)&((name:string,callback:(event:{message?:string})=>void)=>void)};
declare global {interface Window {Spotify?:{Player:new(options:{name:string;getOAuthToken:(cb:(token:string)=>void)=>void;volume:number})=>Player};onSpotifyWebPlaybackSDKReady?:()=>void}}
async function api(action:string,body?:unknown){const r=await fetch('/api/spotify/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body??{}),cache:'no-store'});const data=await r.json() as {error?:string;access_token:string};if(!r.ok)throw Error(data.error||'Spotify request failed.');return data;}
const time=(ms:number)=>`${Math.floor(ms/60000)}:${Math.floor(ms/1000)%60<10?'0':''}${Math.floor(ms/1000)%60}`;
export default function SpotifyTest(){
 const {pause}=useAtmos();const pauseRef=useRef(pause);useEffect(()=>{pauseRef.current=pause;},[pause]);
 const player=useRef<Player|null>(null);
 const [connected,setConnected]=useState(false),[loaded,setLoaded]=useState(false),[device,setDevice]=useState(''),[state,setState]=useState<Playback|null>(null),[error,setError]=useState(''),[input,setInput]=useState(''),[busy,setBusy]=useState(false),[volume,setVolume]=useState(.65);
 useEffect(()=>{pauseRef.current();let active=true;fetch('/api/spotify/connection',{cache:'no-store'}).then(r=>r.json() as Promise<{connected?:boolean;error?:string}>).then(d=>{if(active){setConnected(!!d.connected);setLoaded(true);if(d.error)setError(d.error);const result=new URLSearchParams(location.search).get('result');if(result&&result!=='connected')setError('Spotify sign-in did not finish. Please reconnect.');}}).catch(()=>{if(active){setError('Could not check your Spotify connection.');setLoaded(true);}});return()=>{active=false;};},[]);
 useEffect(()=>{
  if(!connected)return;
  let active=true,started=false;
  const start=()=>{
   if(!active||started||!window.Spotify)return;started=true;
   const p=new window.Spotify.Player({name:'Far.Fly playback test',volume:.65,getOAuthToken:cb=>{api('token').then(d=>{if(active)cb(d.access_token);}).catch(e=>{if(active)setError(e.message);});}});player.current=p;
   p.addListener('ready',({device_id}:{device_id:string})=>{if(active)setDevice(device_id);});
   p.addListener('not_ready',()=>{if(active)setDevice('');});
   p.addListener('player_state_changed',(s:Playback|null)=>{if(active)setState(s);});
   for(const event of ['initialization_error','authentication_error','account_error','playback_error'])p.addListener(event,({message})=>{if(active)setError(event==='account_error'?'Spotify Premium is required.':`${event}: ${(message||'Reconnect and try again.').slice(0,240)}`);});
   p.addListener('autoplay_failed',()=>{if(active)setError('Your browser paused automatic playback. Press Play to continue.');});
   p.connect().then(ok=>{if(active&&!ok)setError('Spotify player could not connect.');}).catch(()=>{if(active)setError('Spotify player could not connect.');});
  };
  window.onSpotifyWebPlaybackSDKReady=start;start();
  const poll=setInterval(()=>{player.current?.getCurrentState().then(s=>{if(active)setState(s);}).catch(()=>{});},1000);
  return()=>{active=false;clearInterval(poll);delete window.onSpotifyWebPlaybackSDKReady;player.current?.disconnect();player.current=null;};
 },[connected]);
 async function command(fn:()=>Promise<unknown>){setError('');try{await fn();}catch{setError('Playback control failed. Please try again.');}}
 async function play(){
  const match=input.trim().match(/^(?:spotify:track:|https:\/\/open\.spotify\.com\/(?:intl-[a-z]+\/)?track\/)([a-zA-Z0-9]{22})(?:\?[^\s]*)?$/);
  if(!match){setError('Paste a Spotify song link or track URI.');return;}
  setBusy(true);setError('');try{await player.current?.activateElement();await api('play',{device,uri:'spotify:track:'+match[1]});}catch(e){setError(e instanceof Error?e.message:'Playback failed.');}finally{setBusy(false);}
 }
 async function disconnect(){setBusy(true);try{await player.current?.pause?.();}catch{}try{await api('connection');player.current?.disconnect();setConnected(false);setDevice('');setState(null);}catch(e){setError(e instanceof Error?e.message:'Could not disconnect.');}finally{setBusy(false);}}
 const track=state?.track_window.current_track;
 return <section className="spotify-test"><p className="eyebrow">FAR.FLY · SPOTIFY</p><h1>Your music, right here.</h1><p>Private playback test for Spotify Premium. Choose a song to try our player.</p>
 {!loaded?<output>Checking connection…</output>:!connected?<form action="/api/spotify/connect" method="post"><button className="primary-button">Connect Spotify</button></form>:<><Script src="https://sdk.scdn.co/spotify-player.js" strategy="afterInteractive" onReady={()=>window.onSpotifyWebPlaybackSDKReady?.()} onError={()=>setError('Spotify player could not load. Check your browser settings.')}/><div className="spotify-connection"><output>{device?'Player ready':'Connecting player…'}</output><button disabled={busy} onClick={disconnect}>Disconnect Spotify</button></div><form onSubmit={e=>{e.preventDefault();void play();}} className="spotify-song-form"><label htmlFor="spotify-song">Spotify song link</label><div><input id="spotify-song" value={input} onChange={e=>setInput(e.target.value)} placeholder="https://open.spotify.com/track/…"/><button className="primary-button" disabled={!device||busy}>Play song</button></div></form>
 <div className="spotify-player">{track?<><Image unoptimized src={track.album.images[0]?.url||'/farfly-orca.png'} width={260} height={260} alt={`${track.name} album artwork`}/><h2>{track.name}</h2><p>{track.artists.map(a=>a.name).join(', ')}</p><a href={'https://open.spotify.com/track/'+track.uri.split(':').pop()} target="_blank" rel="noreferrer">Listen on Spotify ↗</a></>:<p>Select a song to begin.</p>}<div className="track-progress"><span>{time(state?.position||0)}</span><input aria-label="Playback position" type="range" min={0} max={state?.duration||1} value={state?.position||0} disabled={!state} onChange={e=>void command(()=>player.current!.seek(Number(e.target.value)))}/><span>{time(state?.duration||0)}</span></div><div className="playback-buttons"><button className="icon-button" aria-label="Previous track" disabled={!state} onClick={()=>void command(()=>player.current!.previousTrack())}><SkipBack/></button><button className="play-button" aria-label={state&&!state.paused?'Pause':'Play'} disabled={!state} onClick={()=>void command(async()=>{await player.current!.activateElement();await player.current!.togglePlay();})}>{state&&!state.paused?<Pause/>:<Play/>}</button><button className="icon-button" aria-label="Next track" disabled={!state} onClick={()=>void command(()=>player.current!.nextTrack())}><SkipForward/></button></div><label className="spotify-volume">Volume<input aria-label="Volume" type="range" min={0} max={1} step={.01} value={volume} disabled={!device} onChange={e=>{const v=Number(e.target.value);setVolume(v);void command(()=>player.current!.setVolume(v));}}/></label></div></>}
 {error&&<p role="alert">{error}</p>}<p className="spotify-note">Music is provided by Spotify. This test does not use Pinterest images or automatically select music.</p><Link href="/privacy.html">Privacy</Link></section>;
}

