'use client';
import { Feed } from '@/components/feed';
import { useAtmos } from '@/providers/atmos-provider';
import { tracks } from '@/mock/catalog';
import { Photo } from '@/components/photo';
import { Play, Heart } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Moods from '../moods/page';
export default function Saved(){const a=useAtmos();const liked=tracks.filter(t=>a.likedTracks.includes(t.id));return <Tabs defaultValue="visuals"><TabsList className="saved-tabs" style={{marginTop:30}}><TabsTrigger value="visuals">Visuals</TabsTrigger><TabsTrigger value="music">Music</TabsTrigger><TabsTrigger value="moods">Moods</TabsTrigger></TabsList><TabsContent value="visuals"><Feed saved/></TabsContent><TabsContent value="music"><section className="section-heading"><div className="eyebrow">ON REPEAT, IN YOUR WORLD</div><h1>Sounds that stayed.</h1><p>Music you’ve liked along the way.</p></section><div className="track-list">{liked.map(t=><article className="saved-track" key={t.id}><button className="saved-track-art" onClick={()=>a.playTrack(t)} aria-label={`Play ${t.title}`}><Photo src={t.artwork} alt={t.title}/></button><div><strong>{t.title}</strong><p>{t.artist} · {t.tags.join(' · ')}</p></div><button className="icon-button" aria-label={`Play ${t.title}`} onClick={()=>a.playTrack(t)}><Play size={18}/></button><button className="icon-button liked" aria-label={`Unlike ${t.title}`} onClick={()=>a.likeTrack(t)}><Heart size={18} fill="currentColor"/></button></article>)}</div>{liked.length===0&&<div className="empty-state"><Heart/><h2>Your next favorite is out there.</h2><p>Tap the heart on a track to keep it here.</p></div>}</TabsContent><TabsContent value="moods"><Moods/></TabsContent></Tabs>;}
