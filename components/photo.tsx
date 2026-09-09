'use client';
import { useState } from 'react';
import Image from 'next/image';
export function Photo({src,alt,className='',priority=false}:{src:string;alt:string;className?:string;priority?:boolean}) {
 const [failed,setFailed]=useState(false);
 return failed?<div className={`photo-fallback ${className}`}><span>{alt}</span></div>:<Image src={src} alt={alt} fill sizes="(max-width: 640px) 50vw, (max-width: 1000px) 33vw, 25vw" unoptimized priority={priority} onError={()=>setFailed(true)} className={className}/>;
}

