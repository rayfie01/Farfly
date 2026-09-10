'use client';
import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { useAtmos } from '@/providers/atmos-provider';
const results:Record<string,string>={connected:'Pinterest connected. Choose the boards you want to explore.',denied:'You cancelled the connection. Your Pinterest account was not imported.',invalid_state:'That connection request expired or could not be verified. Please start again.',failed:'Pinterest could not connect. Check app approval and try again.'};
const subscribe=()=>()=>{};
const resultSnapshot=()=>new URLSearchParams(window.location.search).get('result')||'';
export default function PinterestPage(){
 const {pinterest:p}=useAtmos();
 const result=useSyncExternalStore(subscribe,resultSnapshot,()=> '');
 const message=results[result]||'';
 return <div className="profile-layout">
  <div className="section-heading"><div className="eyebrow">YOUR VISUAL WORLDS</div><h1>Pinterest, at your pace.</h1><p>Explore your selected boards with Far.Fly’s original soundtrack.</p></div>
  {message&&<output className="demo-notice">{message}</output>}
  {p.error&&<p role="alert" className="demo-notice">{p.error}</p>}
  <section className="settings-section"><h2>Your connection</h2>
   {p.checking?<output>Checking connection…</output>:p.connected?<><p>Connected for this browser session, for up to one hour. Your Pinterest password is never shared with Far.Fly.</p><button className="secondary" disabled={p.loading} onClick={()=>void p.disconnect()}>Disconnect Pinterest</button></>:p.configured?<><p>Read your own boards and Pins. Far.Fly will not publish or edit anything on Pinterest. Pinterest may limit which boards are available to the approved app.</p><form action="/api/pinterest/connect" method="post"><button className="primary" type="submit">Connect Pinterest</button></form></>:<p>Pinterest access is awaiting approval and secure setup. The demo collection is available while we wait.</p>}
   <p><Link href="/privacy.html" prefetch={false}>How your data is handled</Link></p>
  </section>
  {p.connected&&<section className="settings-section"><h2>Choose your boards</h2><p>Selected boards load in order. Pins and board choices stay only in this tab’s memory. Select up to 10 boards.</p>
   <div className="board-grid">{p.boards.map(b=><label key={b.id}><input type="checkbox" checked={p.selectedBoards.includes(b.id)} disabled={!p.selectedBoards.includes(b.id)&&p.selectedBoards.length>=10} onChange={e=>p.selectBoards(e.target.checked?[...p.selectedBoards,b.id]:p.selectedBoards.filter(id=>id!==b.id))}/>{b.name}</label>)}</div>
   {!p.boards.length&&!p.loading&&<p>No boards loaded. Check your Pinterest access or retry.</p>}
   <button className="secondary" disabled={p.loading} onClick={()=>void p.loadMoreBoards()}>{p.boardCursor?'Load more boards':'Refresh boards'}</button>
   {p.loading&&<output>Loading Pinterest…</output>}
   {p.selectedBoards.length>0&&<p><Link href="/" className="primary">Explore selected boards</Link></p>}
  </section>}
  <p><Link href="/profile">Back to profile</Link> · <Link href="/">Explore Far.Fly</Link></p>
 </div>;
}
