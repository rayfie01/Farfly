'use client';
import Link from 'next/link';
import './library.css';
import { useState } from 'react';
import { ArrowUpRight, Check, Layers, Search, LogOut } from 'lucide-react';
import { Photo } from '@/components/photo';
import { useAtmos } from '@/providers/atmos-provider';
export default function PinterestPage(){
 const {pinterest:p}=useAtmos();
 const [query,setQuery]=useState('');
 const visible=p.boards.filter(b=>b.name.toLowerCase().includes(query.toLowerCase()));
 return <div className="pinterest-library">
  <header className="library-heading"><div><div className="eyebrow">YOUR PINTEREST LIBRARY</div><h1>A world you already love.</h1><p>Bring your boards together. Find a feeling. Let the colours follow.</p></div><span className="connection-badge">{p.checking?'Connecting...':p.connected?'● Pinterest connected':'Pinterest'}</span></header>
  {p.error&&<p role="alert" className="demo-notice">{p.error}</p>}
  {p.checking?<output className="library-empty">Opening your library...</output>:!p.connected?<section className="library-empty"><Layers size={40}/><h2>Your boards belong here.</h2><p>Connect Pinterest to browse your public boards and Pins in Far.Fly.</p>{p.configured?<form action="/api/pinterest/connect" method="post"><button className="primary" type="submit">Connect Pinterest <ArrowUpRight size={16}/></button></form>:<p>Pinterest setup is not available yet.</p>}</section>:<>
   <div className="library-toolbar"><div><h2>Your boards</h2><p>{p.boards.length} boards · {p.selectedBoards.length} selected</p></div><label className="library-search"><Search size={18}/><input aria-label="Search your boards" placeholder="Find a board..." value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
   <div className="pinterest-board-grid">{visible.map((b,i)=>{const selected=p.selectedBoards.includes(b.id);return <button key={b.id} className={'pinterest-board '+(selected?'is-selected':'')} aria-pressed={selected} aria-label={'Select '+b.name} disabled={!selected&&p.selectedBoards.length>=10} onClick={()=>p.selectBoards(selected?p.selectedBoards.filter(id=>id!==b.id):[...p.selectedBoards,b.id])}><div className="board-cover" style={{background:`hsl(${(i*47+160)%360} 20% 75%)`}}>{b.cover?<Photo src={b.cover} alt={b.name}/>:<Layers size={44}/>}<span className="board-check">{selected&&<Check size={17}/>}</span></div><div className="board-caption"><strong>{b.name}</strong><span>{b.count===undefined?'Pinterest board':b.count+' Pins'}</span></div></button>;})}</div>
   {!visible.length&&<div className="library-empty"><h2>{query?'No boards match your search.':'No public boards found.'}</h2><p>{query?'Try another name.':'Only boards Pinterest makes available to this account appear here.'}</p></div>}
   <div className="library-actions"><button className="secondary" disabled={p.loading} onClick={()=>void p.loadMoreBoards()}>{p.boardCursor?'More boards':'Refresh boards'}</button><output>{p.loading?'Loading your Pins...':'Choose up to 10 boards to mix into your feed.'}</output></div>
   <div className="library-dock"><div><strong>{p.selectedBoards.length?`${p.selectedBoards.length} boards, one atmosphere`:'Choose your next atmosphere'}</strong><span>Explore your own Pinterest collection</span></div>{p.selectedBoards.length>0&&<Link href="/" className="primary">Open my feed <ArrowUpRight size={17}/></Link>}</div>
   <footer className="library-footer"><p>Your connection renews automatically. Log out here when you are finished.</p><button className="text-button" disabled={p.loading} onClick={()=>void p.disconnect()}><LogOut size={15}/> Log out of Pinterest in Far.Fly</button></footer>
  </>}
  <div className="library-links"><Link href="/">Back to feed</Link><Link href="/privacy.html" prefetch={false}>Privacy</Link></div>
 </div>;
}

