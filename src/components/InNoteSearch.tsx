import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Note } from '../types';
import { htmlToText } from '../lib/richText';

type Hit={id:string;source:'body'|'item';text:string;preview:string;occurrence:number;itemId?:string;start:number};

type Props={note:Note};

function findOccurrences(text:string,query:string){
 const result:number[]=[];
 if(!query)return result;
 const haystack=text.toLocaleLowerCase('es-ES');
 const needle=query.toLocaleLowerCase('es-ES');
 let cursor=0;
 while(cursor<haystack.length){
  const index=haystack.indexOf(needle,cursor);
  if(index<0)break;
  result.push(index);
  cursor=index+Math.max(needle.length,1);
 }
 return result;
}

function snippet(text:string,index:number,length:number){
 const start=Math.max(0,index-28),end=Math.min(text.length,index+length+38);
 return `${start?'…':''}${text.slice(start,end)}${end<text.length?'…':''}`;
}

function textRanges(root:HTMLElement,query:string):Range[]{
 const ranges:Range[]=[];
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const needle=query.toLocaleLowerCase('es-ES');
 let node:Node|null;
 while((node=walker.nextNode())){
  const value=node.textContent||'';
  const lower=value.toLocaleLowerCase('es-ES');
  let cursor=0;
  while(cursor<lower.length){
   const index=lower.indexOf(needle,cursor);
   if(index<0)break;
   const range=document.createRange();
   range.setStart(node,index);range.setEnd(node,index+query.length);ranges.push(range);
   cursor=index+Math.max(query.length,1);
  }
 }
 return ranges;
}

export function InNoteSearch({note}:Props){
 const [query,setQuery]=useState('');
 const [active,setActive]=useState(0);
 const bodyText=htmlToText(note.body);
 const hits=useMemo<Hit[]>(()=>{
  const term=query.trim();
  if(!term)return [];
  const body=findOccurrences(bodyText,term).map((start,occurrence)=>({id:`body-${start}`,source:'body' as const,text:bodyText,preview:snippet(bodyText,start,term.length),occurrence,start}));
  const items=note.items.flatMap(item=>findOccurrences(item.text,term).map((start,occurrence)=>({id:`${item.id}-${start}`,source:'item' as const,text:item.text,preview:snippet(item.text,start,term.length),occurrence,itemId:item.id,start})));
  return [...body,...items];
 },[bodyText,note.items,query]);

 const focusHit=(index:number)=>{
  if(!hits.length)return;
  const safe=(index+hits.length)%hits.length;
  setActive(safe);
  const hit=hits[safe];
  requestAnimationFrame(()=>{
   const noteRoot=document.querySelector<HTMLElement>(`.note-widget[data-note-id="${note.id}"]`);
   if(!noteRoot)return;
   if(hit.source==='body'){
    const body=noteRoot.querySelector<HTMLElement>('.rich-note-body');
    if(!body)return;
    const ranges=textRanges(body,query.trim());
    const range=ranges[hit.occurrence];
    if(range){const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);(range.startContainer.parentElement as HTMLElement|null)?.scrollIntoView({behavior:'smooth',block:'center'});body.focus()}
   }else{
    const input=noteRoot.querySelector<HTMLInputElement>(`[data-item-id="${hit.itemId}"] input`);
    if(input){input.focus();input.setSelectionRange(hit.start,hit.start+query.trim().length);input.scrollIntoView({behavior:'smooth',block:'center'})}
   }
  });
 };

 useEffect(()=>{
  setActive(0);
  const registry=(CSS as unknown as {highlights?:Map<string,unknown>}).highlights as any;
  if(registry?.delete)registry.delete('chibi-search');
  const noteRoot=document.querySelector<HTMLElement>(`.note-widget[data-note-id="${note.id}"]`);
  noteRoot?.querySelectorAll('.checklist label').forEach(label=>label.classList.remove('search-hit'));
  const term=query.trim();
  if(!term||!noteRoot)return;
  const body=noteRoot.querySelector<HTMLElement>('.rich-note-body');
  const ranges=body?textRanges(body,term):[];
  const HighlightCtor=(window as unknown as {Highlight?:new(...ranges:Range[])=>unknown}).Highlight;
  if(registry?.set&&HighlightCtor&&ranges.length)registry.set('chibi-search',new HighlightCtor(...ranges));
  note.items.forEach(item=>{if(item.text.toLocaleLowerCase('es-ES').includes(term.toLocaleLowerCase('es-ES')))noteRoot.querySelector(`[data-item-id="${item.id}"]`)?.classList.add('search-hit')});
  return()=>{if(registry?.delete)registry.delete('chibi-search');noteRoot.querySelectorAll('.checklist label').forEach(label=>label.classList.remove('search-hit'))};
 },[note.id,note.body,note.items,query]);

 return <div className="in-note-search">
  <label><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar palabras dentro de esta nota…"/>{query&&<motion.button onClick={()=>setQuery('')} whileHover={{rotate:90}}><X size={14}/></motion.button>}</label>
  <AnimatePresence>{query&&<motion.div className="in-note-search-meta" initial={{opacity:0,y:-5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}}><span>{hits.length?`${active+1} de ${hits.length}`:'Sin coincidencias'}</span><button disabled={!hits.length} onClick={()=>focusHit(active-1)}><ChevronUp/></button><button disabled={!hits.length} onClick={()=>focusHit(active+1)}><ChevronDown/></button></motion.div>}</AnimatePresence>
  <AnimatePresence>{query&&hits.length>0&&<motion.div className="in-note-results" initial={{opacity:0,y:-8,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-7,scale:.98}}>
   {hits.slice(0,8).map((hit,index)=><motion.button key={hit.id} className={active===index?'active':''} onMouseDown={event=>event.preventDefault()} onClick={()=>focusHit(index)} whileHover={{x:4}}><b>{hit.source==='body'?'Texto':'Checklist'}</b><span>{hit.preview}</span></motion.button>)}
   {hits.length>8&&<small>+ {hits.length-8} coincidencias adicionales</small>}
  </motion.div>}</AnimatePresence>
 </div>;
}
