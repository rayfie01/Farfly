'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Grid2X2, Heart, Waves, UserRound, ArrowUpRight } from 'lucide-react';
import { Toaster } from 'sonner';
import { MiniPlayer, ImmersivePlayer } from './player';
const nav=[['/','For you',Grid2X2],['/explore','Explore',Compass],['/moods','Moods',Waves],['/saved','Saved',Heart]] as const;
export function Shell({children}:{children:React.ReactNode}) {
 const path=usePathname();
 return <><header className="site-header"><Link href="/" className="wordmark" aria-label="Far.Fly home"><span className="brand-symbol">f</span>Far.Fly<span className="brand-dot">®</span></Link><nav className="desktop-nav" aria-label="Main navigation">{nav.map(([url,label,Icon])=><Link key={url} href={url} className={path===url?'active':''}><Icon size={16}/>{label}</Link>)}</nav><div className="header-right"><Link className="about-link" href="/welcome">Your world, in sound <ArrowUpRight size={14}/></Link><Link href="/profile" className="avatar" aria-label="Profile"><UserRound size={19}/></Link></div></header><main className="page-content">{children}</main><MiniPlayer/><ImmersivePlayer/><nav className="mobile-nav" aria-label="Mobile navigation">{nav.map(([url,label,Icon])=><Link key={url} href={url} className={path===url?'active':''}><Icon size={20}/><span>{label}</span></Link>)}</nav><Toaster position="top-center" richColors closeButton/></>;
}
