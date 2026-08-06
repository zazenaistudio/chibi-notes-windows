import { Children, isValidElement, type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';

export function Range({label,value,min,max,step=1,onChange,suffix=''}:{label:string;value:number;min:number;max:number;step?:number;onChange:(n:number)=>void;suffix?:string}){
 return <label className="control"><span><b>{label}</b><em>{value}{suffix}</em></span><input type="range" min={min} max={max} step={step} value={value} onChange={event=>onChange(Number(event.target.value))}/></label>;
}

export function Toggle({label,value,onChange,description}:{label:string;value:boolean;onChange:(v:boolean)=>void;description?:string}){
 return <button type="button" className="toggle-row" data-sound={value?'toggleOff':'toggleOn'} onClick={()=>onChange(!value)}><span><b>{label}</b>{description&&<small>{description}</small>}</span><motion.i animate={{x:value?20:0}} className={value?'on':''}/></button>;
}

type ParsedOption={value:string;label:ReactNode;disabled:boolean};
type MenuPosition={left:number;top:number;width:number;maxHeight:number;openUp:boolean};

export function Select({label,value,onChange,children}:{label:string;value:string;onChange:(v:string)=>void;children:ReactNode}){
 const [open,setOpen]=useState(false);
 const [position,setPosition]=useState<MenuPosition>({left:0,top:0,width:220,maxHeight:260,openUp:false});
 const root=useRef<HTMLDivElement>(null);
 const trigger=useRef<HTMLButtonElement>(null);
 const menu=useRef<HTMLDivElement>(null);
 const options=useMemo<ParsedOption[]>(()=>Children.toArray(children).flatMap(child=>{
  if(!isValidElement<{value?:string;disabled?:boolean;children?:ReactNode}>(child))return [];
  const optionValue=String(child.props.value??child.props.children??'');
  return [{value:optionValue,label:child.props.children,disabled:Boolean(child.props.disabled)}];
 }),[children]);
 const selected=options.find(option=>option.value===value)??options[0];

 const measure=()=>{
  const button=trigger.current;
  if(!button)return;
  const rect=button.getBoundingClientRect();
  const margin=10;
  const desiredHeight=Math.min(340,Math.max(120,options.length*38+14));
  const spaceBelow=window.innerHeight-rect.bottom-margin;
  const spaceAbove=rect.top-margin;
  const openUp=spaceBelow<Math.min(210,desiredHeight)&&spaceAbove>spaceBelow;
  const maxHeight=Math.max(110,Math.min(desiredHeight,openUp?spaceAbove:spaceBelow));
  const width=Math.max(rect.width,220);
  const left=Math.min(Math.max(margin,rect.left),Math.max(margin,window.innerWidth-width-margin));
  const top=openUp?Math.max(margin,rect.top-maxHeight-6):Math.min(window.innerHeight-maxHeight-margin,rect.bottom+6);
  setPosition({left,top,width,maxHeight,openUp});
 };

 useLayoutEffect(()=>{if(open)measure()},[open,options.length,value]);
 useEffect(()=>{
  if(!open)return;
  const reposition=()=>measure();
  const close=(event:PointerEvent)=>{
   const target=event.target as Node;
   if(root.current?.contains(target)||menu.current?.contains(target))return;
   setOpen(false);
  };
  document.addEventListener('pointerdown',close);
  window.addEventListener('resize',reposition);
  window.addEventListener('scroll',reposition,true);
  return()=>{
   document.removeEventListener('pointerdown',close);
   window.removeEventListener('resize',reposition);
   window.removeEventListener('scroll',reposition,true);
  };
 },[open,options.length]);

 const portal=typeof document!=='undefined'?createPortal(<AnimatePresence>{open&&<motion.div
  ref={menu}
  className={`pretty-select-menu pretty-select-portal-menu ${position.openUp?'open-up':''}`}
  style={{left:position.left,top:position.top,width:position.width,maxHeight:position.maxHeight}}
  initial={{opacity:0,y:position.openUp?6:-7,scale:.98}}
  animate={{opacity:1,y:0,scale:1}}
  exit={{opacity:0,y:position.openUp?5:-5,scale:.98}}
  transition={{duration:.16}}
 >
  {options.map(option=><motion.button type="button" key={option.value} disabled={option.disabled} className={option.value===value?'selected':''} onClick={()=>{onChange(option.value);setOpen(false)}} whileHover={{x:4}}><span>{option.label}</span>{option.value===value&&<Check/>}</motion.button>)}
 </motion.div>}</AnimatePresence>,document.body):null;

 return <div className={`select-control pretty-select ${open?'open':''}`} ref={root}>
  <span>{label}</span>
  <button ref={trigger} type="button" className="pretty-select-trigger" data-sound="silent" onClick={()=>setOpen(current=>!current)} aria-expanded={open}><strong>{selected?.label??'Seleccionar'}</strong><ChevronDown/></button>
  {portal}
 </div>;
}

export function ColorControl({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){
 return <label className="color-control"><span>{label}</span><div><input type="color" value={value.slice(0,7)} onChange={event=>onChange(event.target.value)}/><input value={value} onChange={event=>onChange(event.target.value)}/></div></label>;
}

export function SectionTitle({title,subtitle,action}:{title:string;subtitle:string;action?:ReactNode}){
 return <header className="section-title"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</header>;
}
