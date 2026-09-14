'use client';
import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { tracks, boards } from '@/mock/catalog';
import { aggregate, moodName, moodTags, rankTracks } from '@/lib/mood';
import { neutral, type Track, type Signal, type Session, type Pin } from '@/lib/types';
import { toast } from 'sonner';
import { usePinterest } from './use-pinterest';

function useAtmosState() {
  const pinterest=usePinterest();
  const activeBoards=[...enabledPinterestBoards(pinterest.connected,pinterest.selectedBoards)];
  const audio = useRef<HTMLAudioElement>(null);
  const [catalog,setCatalog] = useState<Track[]>(tracks);
  const [musicStatus,setMusicStatus] = useState('Demo music · Connecting to Jamendo…');
  const [savedTracks,setSavedTracks] = useState<Track[]>([]);
  const [queue,setQueue] = useState<Track[]>(tracks);
  const [current,setCurrent] = useState<Track>(tracks[0]);
  const [history,setHistory] = useState<Track[]>([]);
  const [playing,setPlaying] = useState(false);
  const [time,setTime] = useState(0);
  const [duration,setDuration] = useState(96);
  const [volume,setVolumeState] = useState(.65);
  const [buffering,setBuffering] = useState(false);
  const [error,setError] = useState('');
  const [immersive,setImmersive] = useState(false);
  const [signals,setSignals] = useState<Signal[]>([]);
  const [mood,setMood] = useState(neutral);
  const [adaptive,setAdaptive] = useState(true);
  const [enabledBoards,setEnabledBoards] = useState<string[]>(boards);
  const [savedPins,setSavedPins] = useState<string[]>([]);
  const [likedPins,setLikedPins] = useState<string[]>([]);
  const [likedTracks,setLikedTracks] = useState<string[]>([]);
  const [skipped,setSkipped] = useState<string[]>([]);
  const [sessions,setSessions] = useState<Session[]>([]);
  const [ready,setReady] = useState(false);
  useEffect(()=>{
    if(!pinterest.connected){
      // Connection expiry is an external event: discard imported visual activity.
      // oxlint-disable-next-line react/react-compiler
      setSignals(s=>s.filter(x=>!x.pin.id.startsWith('pinterest-')));
      setSavedPins(s=>s.filter(id=>!id.startsWith('pinterest-')));
      setLikedPins(s=>s.filter(id=>!id.startsWith('pinterest-')));
    }
  },[pinterest.connected]);
  const intent = useRef(false);
  const selectionVersion = useRef(0);
  const failures = useRef(new Set<string>());
  const trackRef = useRef(current);
  const name = signals.filter(s=>s.kind !== 'dislike').length >= 3 ? moodName(mood) : 'Finding your vibe';
  useEffect(()=>{
    // Client storage hydration is an intentional external-system synchronization.
    // oxlint-disable-next-line react/react-compiler
    try { const data=JSON.parse(localStorage.getItem('atmos:v1') || 'null'); if(data) {
      // oxlint-disable-next-line react/react-compiler
      setSavedPins(data.savedPins || []);setLikedPins(data.likedPins || []);setLikedTracks(data.likedTracks || []);setSessions(data.sessions || []);setSavedTracks(data.savedTracks || []);setAdaptive(data.adaptive ?? true);setEnabledBoards(data.enabledBoards || boards);
    }} catch { toast.error('Your saved collection could not be loaded.'); }
    setReady(true);
  },[]);
  useEffect(()=>{if(ready) {try {localStorage.setItem('atmos:v1',JSON.stringify({savedPins:savedPins.filter(id=>!id.startsWith('pinterest-')),likedPins:likedPins.filter(id=>!id.startsWith('pinterest-')),likedTracks,savedTracks,sessions,adaptive,enabledBoards}));}catch{toast.error('Storage is full. New saves may not persist.');}}},[ready,savedPins,likedPins,likedTracks,savedTracks,sessions,adaptive,enabledBoards]);
  useEffect(()=>{
    if(!adaptive || signals.length<3) return;
    const timer=setTimeout(()=>{
      const nextMood=aggregate(signals.filter(s=>(s.pin.id.startsWith('pinterest-')?pinterest.connected&&pinterest.selectedBoards.some(id=>s.pin.board==='pinterest-'+id):enabledBoards.includes(s.pin.board))));
      const change=Object.keys(mood).reduce((s,k)=>s+Math.abs(mood[k as keyof typeof mood]-nextMood[k as keyof typeof mood]),0);
      if(change>.15) {
        setMood(nextMood);
        setQueue([trackRef.current,...rankTracks([...catalog],nextMood,likedTracks,skipped).filter(t=>t.id!==trackRef.current.id)]);
      }
    },800);
    return ()=>clearTimeout(timer);
  },[signals,catalog,adaptive,enabledBoards,likedTracks,skipped,mood,pinterest.connected,pinterest.selectedBoards]);
  const discoveryMood=moodTags(mood)[0];
  useEffect(()=>{
    const controller=new AbortController();
    const startedAtVersion=selectionVersion.current;
    const timer=setTimeout(async()=>{
      try{
        const response=await fetch('/api/music?mood='+discoveryMood,{signal:controller.signal});
        const data=await response.json() as {configured?:boolean;tracks?:Track[];error?:string};
        if(!response.ok)throw new Error(data.error||'Jamendo is unavailable.');
        if(controller.signal.aborted)return;
        if(!data.configured){setMusicStatus('Demo music · Jamendo is not configured.');return;}
        if(!data.tracks?.length){setMusicStatus('No Jamendo matches. Keeping your current music.');return;}
        const incoming=data.tracks as Track[];
        setCatalog(incoming);setMusicStatus('Music from Jamendo');
        if(startedAtVersion!==selectionVersion.current)return;
        // Discovery only replaces upcoming music while the listener has playback intent.
        if(trackRef.current.provider==='mock'&&!intent.current&&(!audio.current||audio.current.currentTime===0)){
          trackRef.current=incoming[0];setCurrent(incoming[0]);setDuration(incoming[0].duration);setTime(0);setQueue(incoming);
        }else setQueue([trackRef.current,...incoming.filter(t=>t.id!==trackRef.current.id)]);
      }catch(e){if(!controller.signal.aborted)setMusicStatus((e instanceof Error?e.message:'Jamendo is unavailable.')+' Keeping your current music.');}
    },400);
    return()=>{clearTimeout(timer);controller.abort();};
  },[discoveryMood]);
  const play=useCallback(async()=>{
    if(!audio.current)return; intent.current=true; setError('');
    try {await audio.current.play();}catch(e){ if((e as DOMException).name !== 'AbortError'){intent.current=false;setPlaying(false);setError('Playback could not start. Press play to try again.');}}
  },[]);
  const pause=useCallback(()=>{intent.current=false;audio.current?.pause();},[]);
  const playTrack=useCallback((track:Track, autoplay=true)=>{
    selectionVersion.current++;
    if(track.id===trackRef.current.id){if(autoplay)void play();return;}
    setQueue(q=>q.some(t=>t.id===track.id)?q:[track,...q]);
    const priorTrack=trackRef.current;intent.current=autoplay;setHistory(h=>[...h.slice(-49),priorTrack]);trackRef.current=track;setCurrent(track);setDuration(track.duration);setTime(0);setError('');setBuffering(autoplay);
  },[play]);
  const next=useCallback(()=>{
    const i=queue.findIndex(t=>t.id===trackRef.current.id);
    if(audio.current && audio.current.currentTime<15)setSkipped(s=>[...s.slice(-19),trackRef.current.id]);
    const available=[...queue.slice(i+1),...queue.slice(0,i)].filter(t=>!failures.current.has(t.id));
    if(available[0])playTrack(available[0],intent.current); else {pause();setError('No playable tracks remain. Try again later.');}
  },[queue,playTrack,pause]);
  const previous=useCallback(()=>{
    if(audio.current && audio.current.currentTime>3){audio.current.currentTime=0;setTime(0);return;}
    const prior=history[history.length-1];
    if(prior){playTrack(prior,intent.current);setHistory(h=>h.slice(0,-2));}
    else {const i=queue.findIndex(t=>t.id===trackRef.current.id);playTrack(queue[(i-1+queue.length)%queue.length],intent.current);}
  },[history,queue,playTrack]);
  useEffect(()=>{
    const el=audio.current;if(!el)return;
    el.load();
    if(intent.current)void play();
  },[current.id,play]);
  const seek=(value:number)=>{if(audio.current && Number.isFinite(value)){audio.current.currentTime=Math.min(duration,Math.max(0,value));setTime(value);}};
  const setVolume=(v:number)=>{setVolumeState(v);if(audio.current)audio.current.volume=v;};
  useEffect(()=>{if(audio.current)audio.current.volume=volume;},[volume]);
  const signal=(pin:Pin,kind:Signal['kind'])=>{if(enabledBoards.includes(pin.board)||activeBoards.includes(pin.board))setSignals(s=>[...s.slice(-29),{pin,kind,at:Date.now()}]);};
  const savePin=(pin:Pin)=>{setSavedPins(s=>s.includes(pin.id)?s.filter(id=>id!==pin.id):[...s,pin.id]);signal(pin,'save');};
  const likePin=(pin:Pin)=>{setLikedPins(s=>s.includes(pin.id)?s.filter(id=>id!==pin.id):[...s,pin.id]);signal(pin,'like');};
  const likeTrack=(track:Track)=>{setLikedTracks(s=>s.includes(track.id)?s.filter(id=>id!==track.id):[...s,track.id]);setSavedTracks(s=>[...s.filter(t=>t.id!==track.id),track]);};
  const saveSession=()=>{
    const session:Session={id:crypto.randomUUID(),name:name==='Finding your vibe'?'An open afternoon':name,mood,tracks:[current,...queue.filter(t=>t.id!==current.id)],artwork:current.artwork,createdAt:new Date().toISOString()};
    setSessions(s=>[session,...s]);toast.success('Mood saved. Come back to this atmosphere anytime.');
  };
  const openSession=(session:Session)=>{if(!session.tracks.length)return;setQueue(session.tracks);setMood(session.mood);playTrack(session.tracks[0],true);setImmersive(true);};
  const clearHistory=()=>{setSignals([]);setSkipped([]);setHistory([]);setMood(neutral);toast.success('Recommendation history cleared.');};
  // Music-only player; attribution and track metadata are provided in the player.
  // oxlint-disable-next-line jsx-a11y/media-has-caption
  const engine=<audio ref={audio} src={current.source} preload="metadata" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onPlaying={()=>setBuffering(false)} onWaiting={()=>setBuffering(true)} onCanPlay={()=>setBuffering(false)} onTimeUpdate={()=>setTime(audio.current?.currentTime || 0)} onDurationChange={()=>{const d=audio.current?.duration;if(d && Number.isFinite(d))setDuration(d);}} onEnded={()=>{intent.current=true;next();}} onError={()=>{failures.current.add(current.id);setBuffering(false);toast.error('This track is unavailable. Trying the next one.');next();}} />;
  return {catalog,savedTracks,musicStatus,pinterest,engine,current,queue,history,playing,time,duration,volume,buffering,error,immersive,setImmersive,play,pause,toggle:()=>playing?pause():void play(),next,previous,seek,setVolume,playTrack,mood,name,signal,signals,adaptive,setAdaptive,enabledBoards,setEnabledBoards,savedPins,likedPins,likedTracks,sessions,savePin,likePin,likeTrack,saveSession,openSession,clearHistory,removeSession:(id:string)=>setSessions(s=>s.filter(x=>x.id!==id))};
}
function enabledPinterestBoards(connected:boolean,ids:string[]){return connected?ids.map(id=>'pinterest-'+id):[];}
const AtmosContext=createContext<ReturnType<typeof useAtmosState>|null>(null);
export function AtmosProvider({children}:{children:ReactNode}) {const value=useAtmosState();return <AtmosContext.Provider value={value}>{value.engine}{children}</AtmosContext.Provider>;}
export function useAtmos(){const value=useContext(AtmosContext);if(!value)throw new Error('AtmosProvider is required');return value;}



