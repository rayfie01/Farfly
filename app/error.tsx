'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="empty-state"><h1>A momentary pause.</h1><p>Something didn’t load. Let’s try again.</p><button className="primary" onClick={reset}>Try again</button></div>;}
