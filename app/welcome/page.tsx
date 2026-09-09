import Link from 'next/link';
import { Photo } from '@/components/photo';
import { pins } from '@/mock/catalog';
export default function Welcome(){return <section className="welcome"><div><div className="eyebrow">A DIFFERENT WAY TO DISCOVER MUSIC</div><h1>Scroll what you feel.<br/><em>Hear what it sounds like.</em></h1><p>Your visual world becomes your soundtrack. Wander through imagery, follow what resonates, and let a new atmosphere unfold.</p><Link className="primary" href="/">Start exploring ↗</Link><Link className="text-button" style={{display:'block',marginTop:20}} href="/auth">Already at home here? Sign in</Link></div><div className="welcome-photo"><Photo src={pins[4].image} alt="A quiet forest, filled with afternoon light" priority/></div></section>;}
