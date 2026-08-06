import { AnimatePresence, motion } from 'framer-motion';
import { Check, Search, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import noteIconsJson from '../data/noteIcons.generated.json';
import type { NoteIconAsset } from '../types';
import { useI18n } from '../i18n';
import { NoteIcon } from './NoteIcon';

const ICONS=noteIconsJson as NoteIconAsset[];
type Theme={id:string;nameEs:string;nameEn:string;preview:NoteIconAsset;count:number};

type Props={open:boolean;value?:string;title?:string;onClose:()=>void;onSelect:(src:string)=>void};
export function NoteIconPicker({open,value,title='Icono de la nota',onClose,onSelect}:Props){
 const {language,t}=useI18n();
 const themes=useMemo(()=>{const map=new Map<string,Theme>();for(const icon of ICONS){const current=map.get(icon.themeId);if(current)current.count++;else map.set(icon.themeId,{id:icon.themeId,nameEs:icon.themeEs,nameEn:icon.themeEn,preview:icon,count:1});}return [...map.values()]},[]);
 const selectedAsset=ICONS.find(icon=>icon.src===value);
 const [themeId,setThemeId]=useState(selectedAsset?.themeId||themes[0]?.id||'');
 const [query,setQuery]=useState('');
 useEffect(()=>{if(open){const selected=ICONS.find(icon=>icon.src===value);if(selected)setThemeId(selected.themeId);setQuery('')}},[open,value]);
 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return ICONS.filter(icon=>(!themeId||icon.themeId===themeId)&&(!q||icon.nameEs.toLowerCase().includes(q)||icon.nameEn.toLowerCase().includes(q)))},[themeId,query]);
 const picker=<AnimatePresence>{open&&<motion.div className="note-icon-picker-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <motion.section className="note-icon-picker" initial={{opacity:0,scale:.94,y:18}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.96,y:12}} transition={{type:'spring',stiffness:330,damping:28}}>
   <header><div className="note-icon-picker-title"><span><Sparkles/></span><div><b>{t(title)}</b><small>{t('Elige una temática y después un icono para identificar la nota.')}</small></div></div><button onClick={onClose} aria-label={t('Cerrar')}><X/></button></header>
   <div className="note-icon-search"><Search/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder={t('Buscar iconos…')}/><em>{filtered.length}</em></div>
   <div className="note-icon-picker-body">
    <aside className="note-icon-themes">{themes.map(theme=><motion.button key={theme.id} className={themeId===theme.id?'active':''} onClick={()=>setThemeId(theme.id)} whileHover={{x:3}}><NoteIcon value={theme.preview.src}/><span><b>{language==='en'?theme.nameEn:theme.nameEs}</b><small>{theme.count} {t('iconos')}</small></span></motion.button>)}</aside>
    <main className="note-icon-gallery">{filtered.map(icon=><motion.button key={icon.id} className={value===icon.src?'selected':''} onClick={()=>{onSelect(icon.src);onClose()}} title={language==='en'?icon.nameEn:icon.nameEs} whileHover={{y:-4,scale:1.04}} whileTap={{scale:.9}}><NoteIcon value={icon.src}/><span>{language==='en'?icon.nameEn:icon.nameEs}</span>{value===icon.src&&<i><Check/></i>}</motion.button>)}{!filtered.length&&<div className="note-icon-empty"><Search/><b>{t('Sin resultados')}</b></div>}</main>
   </div>
  </motion.section>
 </motion.div>}</AnimatePresence>;
 return createPortal(picker,document.body);
}
