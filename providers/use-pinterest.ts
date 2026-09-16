'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Pin } from '@/lib/types';
type Board={id:string;name:string;count?:number;cover?:string};
type Page={board:string;cursor?:string};
type Status={configured:boolean;connected:boolean;expiresAt?:number};
type Result<T>={items:T[];cursor?:string};
export function usePinterest(){
 const [configured,setConfigured]=useState(false),[connected,setConnected]=useState(false),[checking,setChecking]=useState(true);
 const [boards,setBoards]=useState<Board[]>([]),[boardCursor,setBoardCursor]=useState<string|undefined>();
 const [selectedBoards,setSelectedBoards]=useState<string[]>([]),[pins,setPins]=useState<Pin[]>([]);
 const [error,setError]=useState(''),[loading,setLoading]=useState(false),[hasMore,setHasMore]=useState(false);
 const [visualSource,setVisualSource]=useState<'demo'|'pinterest'>('demo');
 const [,setExpiresAt]=useState(0);
 const pending=useRef<Page[]>([]),generation=useRef(0),busy=useRef(false);
 const purge=useCallback(()=>{
  generation.current++;busy.current=false;pending.current=[];
  try{sessionStorage.removeItem('farfly:pinterest-boards');}catch{}
  setConnected(false);setBoards([]);setBoardCursor(undefined);setPins([]);setSelectedBoards([]);setHasMore(false);setLoading(false);setVisualSource('demo');setExpiresAt(0);
 },[]);
 const request=useCallback(async<T,>(path:string,method='GET'):Promise<T>=>{
  const response=await fetch('/api/pinterest/'+path,{method,credentials:'same-origin',cache:'no-store'});
  const data=await response.json() as {error?:string};
  if(!response.ok){if(response.status===401)purge();throw new Error(data.error||'Pinterest could not be reached.');}
  return data as T;
 },[purge]);
 useEffect(()=>{
  let active=true;
  async function init(){
   try {
    const status=await request<Status>('connection');
    if(!active)return;
    setConfigured(status.configured);setConnected(status.connected);setExpiresAt(status.expiresAt||0);
    if(status.connected){
     const page=await request<Result<Board>>('boards');
     if(active){
      setBoards(page.items);setBoardCursor(page.cursor);
      let chosen:string[]=[];
      try{const stored=JSON.parse(sessionStorage.getItem('farfly:pinterest-boards')||'[]');if(Array.isArray(stored))chosen=stored.filter((id:unknown)=>typeof id==='string'&&page.items.some(b=>b.id===id)).slice(0,10);}catch{}
      if(chosen.length){
       setSelectedBoards(chosen);setVisualSource('pinterest');setLoading(true);
       pending.current=chosen.map(board=>({board}));
       const first=await request<Result<Pin>>('pins?board='+chosen[0]);
       if(active){setPins(first.items);pending.current=first.cursor?[...pending.current.slice(1),{board:chosen[0],cursor:first.cursor}]:pending.current.slice(1);setHasMore(pending.current.length>0);setLoading(false);}
      }
     }
    }
   }catch(e){if(active)setError(e instanceof Error?e.message:'Connection could not be checked.');}
   finally{if(active){setChecking(false);setLoading(false);}}
  }
  void init();return()=>{active=false;};
 },[request]);
 useEffect(()=>{
  if(!connected)return;
  const renew=()=>{void request<Status>('connection').then(status=>{if(!status.connected)purge();else setExpiresAt(status.expiresAt||0);}).catch(()=>{});};
  const timer=setInterval(renew,10*60000);
  window.addEventListener('focus',renew);
  return()=>{clearInterval(timer);window.removeEventListener('focus',renew);};
 },[connected,request,purge]);
 async function loadMoreBoards(){
  if(busy.current)return;
  busy.current=true;setLoading(true);setError('');
  const version=generation.current;
  try{const page=await request<Result<Board>>('boards'+(boardCursor?'?cursor='+encodeURIComponent(boardCursor):''));if(version!==generation.current)return;setBoards(old=>[...new Map([...old,...page.items].map((b:Board)=>[b.id,b])).values()]);setBoardCursor(page.cursor);}
  catch(e){setError(e instanceof Error?e.message:'Boards could not load.');}
  finally{if(version===generation.current){busy.current=false;setLoading(false);}}
 }
 async function loadPage(){
  if(busy.current||!pending.current.length)return;
  const version=generation.current, next=pending.current[0];
  busy.current=true;setLoading(true);setError('');
  try{
   const page=await request<Result<Pin>>('pins?'+new URLSearchParams({board:next.board,...(next.cursor?{cursor:next.cursor}:{})}));
   if(version!==generation.current)return;
   pending.current=page.cursor?[...pending.current.slice(1),{board:next.board,cursor:page.cursor}]:pending.current.slice(1);
   setPins(old=>[...new Map([...old,...page.items].map((p:Pin)=>[p.id,p])).values()]);
   setHasMore(pending.current.length>0);
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Pins could not load.');}
  finally{if(version===generation.current){busy.current=false;setLoading(false);}}
 }
 function selectBoards(ids:string[]){
  try{sessionStorage.setItem('farfly:pinterest-boards',JSON.stringify(ids));}catch{}
  generation.current++;busy.current=false;pending.current=ids.map(board=>({board}));
  setSelectedBoards(ids);setPins([]);setError('');setHasMore(ids.length>0);setVisualSource('pinterest');
  if(ids.length)void loadPage();else setLoading(false);
 }
 async function disconnect(){
  setLoading(true);setError('');
  try{await request('connection','POST');purge();}
  catch(e){setError(e instanceof Error?e.message:'Could not disconnect. Try again.');setLoading(false);}
 }
 return {configured,connected,checking,boards,boardCursor,selectedBoards,pins,error,loading,hasMore,visualSource,setVisualSource,selectBoards,loadPage,loadMoreBoards,disconnect};
}

