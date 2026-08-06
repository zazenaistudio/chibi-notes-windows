import { AnimatePresence, motion } from 'framer-motion';
import { Check, Plus, Tag, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Note } from '../types';
import { useAppStore } from '../store/useAppStore';
import { useI18n } from '../i18n';

type Props={open:boolean;note?:Note;onClose:()=>void};

export function TagPickerDialog({open,note,onClose}:Props){
 const {t}=useI18n();
 const availableTags=useAppStore(state=>state.availableTags);
 const addAvailableTag=useAppStore(state=>state.addAvailableTag);
 const updateNote=useAppStore(state=>state.updateNote);
 const liveNote=useAppStore(state=>state.notes.find(item=>item.id===note?.id));
 const current=liveNote||note;
 const [selected,setSelected]=useState<string[]>([]);
 const [draft,setDraft]=useState('');
 useEffect(()=>{if(open)setSelected(current?.tags||[])},[open,current?.id,current?.tags]);
 const catalog=useMemo(()=>[...new Set([...availableTags,...(current?.tags||[])])].sort((a,b)=>a.localeCompare(b,'es')),[availableTags,current?.tags]);
 if(!current||typeof document==='undefined')return null;
 const toggle=(tag:string)=>setSelected(items=>items.includes(tag)?items.filter(item=>item!==tag):[...items,tag]);
 const create=()=>{const clean=draft.trim();if(!clean)return;addAvailableTag(clean);setSelected(items=>items.includes(clean)?items:[...items,clean]);setDraft('')};
 const save=()=>{updateNote(current.id,{tags:selected});onClose()};
 return createPortal(<AnimatePresence>{open&&<motion.div className="tag-picker-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <motion.section className="tag-picker-dialog chibi-modal-card" initial={{opacity:0,scale:.94,y:18}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.96,y:12}}>
   <header><span><Tag/><div><b>{t('Etiquetas de la nota')}</b><small data-i18n-skip>{current.title}</small></div></span><button onClick={onClose}><X/></button></header>
   <div className="tag-picker-create"><input value={draft} onChange={event=>setDraft(event.target.value)} placeholder={t('Nueva etiqueta')} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();create()}}}/><button onClick={create}><Plus/>{t('Crear')}</button></div>
   <div className="tag-picker-grid">{catalog.map(tag=><button key={tag} className={selected.includes(tag)?'selected':''} onClick={()=>toggle(tag)}><span>#{tag}</span>{selected.includes(tag)&&<Check/>}</button>)}{!catalog.length&&<div className="tag-picker-empty"><Tag/><b>{t('Aún no hay etiquetas')}</b><p>{t('Crea una etiqueta y quedará disponible para todas tus notas.')}</p></div>}</div>
   <footer><button className="secondary" onClick={onClose}>{t('Cancelar')}</button><button className="primary" onClick={save}><Check/>{t('Aplicar')}</button></footer>
  </motion.section>
 </motion.div>}</AnimatePresence>,document.body);
}
