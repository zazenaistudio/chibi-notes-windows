import { AnimatePresence, motion } from 'framer-motion';
import { Check, Pencil, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type Props={open:boolean;title:string;label:string;initialValue:string;placeholder?:string;onClose:()=>void;onSave:(value:string)=>void};
export function QuickTextDialog({open,title,label,initialValue,placeholder,onClose,onSave}:Props){
 const [value,setValue]=useState(initialValue);
 useEffect(()=>{if(open)setValue(initialValue)},[open,initialValue]);
 return <AnimatePresence>{open&&<motion.div className="quick-dialog-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><motion.form className="quick-dialog text-dialog" initial={{opacity:0,scale:.93,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.95,y:10}} onSubmit={event=>{event.preventDefault();onSave(value.trim());onClose()}}><header><span><Pencil/><div><b>{title}</b><small>{label}</small></div></span><button type="button" onClick={onClose}><X/></button></header><label className="quick-field"><span>{label}</span><input autoFocus value={value} onChange={event=>setValue(event.target.value)} placeholder={placeholder}/></label><footer><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary"><Check/>Guardar</button></footer></motion.form></motion.div>}</AnimatePresence>;
}
