import { AnimatePresence, motion } from 'framer-motion';
import { AlignCenter, AlignLeft, AlignRight, Bold, Copy, Highlighter, Italic, List, RemoveFormatting, Strikethrough, Underline, Volume2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import type { VoiceSettings } from '../types';
import { ensureRichHtml } from '../lib/richText';
import { speakText } from '../lib/voice';
import { useI18n } from '../i18n';

type Props={value:string;placeholder:string;onChange:(html:string)=>void;style?:CSSProperties;reduceMotion?:boolean;readOnly?:boolean;voiceSettings?:VoiceSettings};
type FormatAction={id:string;title:string;icon:typeof Bold;value?:string};
const actions:FormatAction[]=[
 {id:'bold',title:'Negrita',icon:Bold},{id:'italic',title:'Cursiva',icon:Italic},{id:'underline',title:'Subrayado',icon:Underline},{id:'strikeThrough',title:'Tachado',icon:Strikethrough},{id:'hiliteColor',title:'Resaltador',icon:Highlighter,value:'#fff2a8'},{id:'insertUnorderedList',title:'Lista',icon:List},{id:'removeFormat',title:'Quitar formato',icon:RemoveFormatting}
];
const contextActions:FormatAction[]=[
 ...actions.slice(0,5),{id:'justifyLeft',title:'Alinear a la izquierda',icon:AlignLeft},{id:'justifyCenter',title:'Centrar',icon:AlignCenter},{id:'justifyRight',title:'Alinear a la derecha',icon:AlignRight},{id:'insertUnorderedList',title:'Lista',icon:List},{id:'removeFormat',title:'Quitar formato',icon:RemoveFormatting}
];

type MenuState={x:number;y:number;text:string;range:Range}|null;
const MENU_WIDTH=270;
const MENU_HEIGHT=420;
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

export function RichTextEditor({value,placeholder,onChange,style,reduceMotion=false,readOnly=false,voiceSettings}:Props){
 const {t}=useI18n();
 const editor=useRef<HTMLDivElement>(null),timer=useRef<number|undefined>(undefined),pendingHtml=useRef(''),lastEmitted=useRef(ensureRichHtml(value));
 const [focused,setFocused]=useState(false),[menu,setMenu]=useState<MenuState>(null);
 const flush=(immediate=false)=>{if(readOnly)return;const html=editor.current?.innerHTML??pendingHtml.current;pendingHtml.current=html;window.clearTimeout(timer.current);if(html===lastEmitted.current)return;const commit=()=>{lastEmitted.current=html;onChange(html)};if(immediate)commit();else timer.current=window.setTimeout(commit,120)};
 useEffect(()=>{const el=editor.current;if(!el||focused)return;const html=ensureRichHtml(value);lastEmitted.current=html;pendingHtml.current=html;if(el.innerHTML!==html)el.innerHTML=html},[value,focused]);
 useEffect(()=>()=>window.clearTimeout(timer.current),[]);
 useEffect(()=>{const close=()=>setMenu(null);window.addEventListener('scroll',close,true);window.addEventListener('resize',close);return()=>{window.removeEventListener('scroll',close,true);window.removeEventListener('resize',close)}},[]);
 const restoreSelection=()=>{if(!menu||!editor.current)return;editor.current.focus();const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(menu.range)};
 const run=(command:string,commandValue?:string,fromMenu=false)=>{if(readOnly)return;if(fromMenu)restoreSelection();else editor.current?.focus();document.execCommand(command,false,commandValue);flush(true);if(fromMenu)setMenu(null)};
 const copySelection=async()=>{if(!menu)return;try{await navigator.clipboard.writeText(menu.text)}catch{document.execCommand('copy')}setMenu(null)};
 const readSelection=()=>{if(!menu||!voiceSettings)return;try{speakText(menu.text,voiceSettings)}finally{setMenu(null)}};
 const openMenu=(event:ReactMouseEvent<HTMLDivElement>)=>{
  if(readOnly)return;
  const selection=window.getSelection();
  if(!selection||selection.isCollapsed||!selection.rangeCount)return;
  const range=selection.getRangeAt(0);
  if(!editor.current?.contains(range.commonAncestorContainer))return;
  const text=selection.toString().trim();
  if(!text)return;
  event.preventDefault();
  event.stopPropagation();
  const rect=range.getBoundingClientRect();
  // El evento de clic derecho es el ancla más fiable dentro de ventanas escaladas
  // o elementos con transform. El rectángulo de la selección queda como respaldo.
  const anchorX=Number.isFinite(event.clientX)&&event.clientX>0?event.clientX:(rect.left||12);
  const anchorY=Number.isFinite(event.clientY)&&event.clientY>0?event.clientY:(rect.bottom||12);
  const x=anchorX+MENU_WIDTH+12<=window.innerWidth?anchorX+8:anchorX-MENU_WIDTH-8;
  const y=anchorY+MENU_HEIGHT+12<=window.innerHeight?anchorY+8:anchorY-MENU_HEIGHT-8;
  setMenu({x:clamp(x,12,window.innerWidth-MENU_WIDTH-12),y:clamp(y,12,window.innerHeight-MENU_HEIGHT-12),text,range:range.cloneRange()});
 };
 const menuPortal=typeof document!=='undefined'?createPortal(<AnimatePresence>{menu&&<><button className="text-context-catcher" aria-label={t('Cerrar menú contextual')} onMouseDown={()=>setMenu(null)}/><motion.div className="text-context-menu" style={{left:menu.x,top:menu.y}} initial={{opacity:0,scale:.92,y:-5}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.95,y:-3}} onMouseDown={event=>event.preventDefault()}>
  <header><div><b>{t('Texto seleccionado')}</b><small>{menu.text.length>46?`${menu.text.slice(0,46)}…`:menu.text}</small></div><button onClick={()=>setMenu(null)}><X/></button></header>
  <div className="text-context-format-grid">{contextActions.map(({id,title,icon:Icon,value:commandValue})=><button key={`${id}-${title}`} onClick={()=>run(id,commandValue,true)} title={t(title)}><Icon/><span>{t(title)}</span></button>)}</div>
  <div className="text-context-extra"><button onClick={()=>void copySelection()}><Copy/>{t('Copiar texto')}</button>{voiceSettings&&<button onClick={readSelection}><Volume2/>{t('Texto a voz')}</button>}</div>
 </motion.div></>}</AnimatePresence>,document.body):null;
 return <div className={`rich-editor-shell ${focused?'focused':''} ${readOnly?'read-only':''}`}>
  <motion.div className="rich-toolbar" initial={false} animate={{opacity:focused?1:.62,y:focused?0:2}} transition={{duration:.2}}>{actions.map(({id,title,icon:Icon,value:commandValue})=><motion.button disabled={readOnly} type="button" key={id} title={t(title)} onMouseDown={event=>event.preventDefault()} onClick={()=>run(id,commandValue)} whileHover={reduceMotion?{}:{y:-3,scale:1.08}} whileTap={reduceMotion?{}:{scale:.86}}><Icon size={15}/></motion.button>)}</motion.div>
  {!value&&!focused&&<span className="rich-placeholder">{placeholder}</span>}
  <div ref={editor} className="note-body rich-note-body" data-i18n-skip contentEditable={!readOnly} suppressContentEditableWarning style={style} onContextMenu={openMenu} onFocus={()=>setFocused(true)} onBlur={()=>{flush(true);setFocused(false)}} onInput={event=>{if(!readOnly){pendingHtml.current=event.currentTarget.innerHTML;flush(false)}}} onPaste={event=>{event.preventDefault();document.execCommand('insertText',false,event.clipboardData.getData('text/plain'));window.requestAnimationFrame(()=>flush(true))}}/>
  {menuPortal}
 </div>;
}
