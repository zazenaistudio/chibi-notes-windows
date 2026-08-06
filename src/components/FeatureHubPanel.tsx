import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, ChevronRight, CircleHelp, Eraser, Info, Keyboard, Lock, Play, Save, ShieldCheck, Tag, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { FEATURE_CATEGORIES, FEATURE_ICONS, type FeatureIconId } from '../data/featureIcons';
import { htmlToText } from '../lib/richText';
import { ensureNotificationPermission } from '../lib/notifications';
import { fileToDataUrl, uid } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';
import type { Note } from '../types';
import { NoteIcon } from './NoteIcon';
import { requestConfirmation } from '../lib/confirm';

type DialogType='reminder'|'tags'|'drawing'|null;
type SelectedTool=FeatureIconId|'help'|'about';

type Props={
 open:boolean;
 note?:Note;
 onClose:()=>void;
 onCreate:()=>void;
 onFocusSearch:()=>void;
 onDictate:()=>void;
 onOpenCustomization:(tab?:string)=>void;
 onOpenGroups:()=>void;
 onOpenTags:()=>void;
 onOpenInfo:(tab:'help'|'about'|'license')=>void;
 onToggleFocus:()=>void;
 onToast:(message:string)=>void;
};

const NOTE_REQUIRED=new Set<FeatureIconId>(['write-note','task-list','drawing-pad','checklist','reminder','pin-note','archive','delete','voice-note','sketch','attach-image','share','lock']);

function DrawingDialog({note,onClose,onToast}:{note:Note;onClose:()=>void;onToast:(message:string)=>void}){
 const updateNote=useAppStore(state=>state.updateNote);
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const drawing=useRef(false);
 const [color,setColor]=useState('#f28eae');
 const [size,setSize]=useState(8);
 useEffect(()=>{
  const canvas=canvasRef.current;if(!canvas)return;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.lineCap='round';ctx.lineJoin='round';ctx.fillStyle='#fffdf7';ctx.fillRect(0,0,900,520);
  if(note.drawing){const image=new Image();image.onload=()=>ctx.drawImage(image,0,0,900,520);image.src=note.drawing}
 },[note.drawing]);
 const point=(event:ReactPointerEvent<HTMLCanvasElement>)=>{const rect=event.currentTarget.getBoundingClientRect();return {x:(event.clientX-rect.left)*(900/rect.width),y:(event.clientY-rect.top)*(520/rect.height)}};
 const start=(event:ReactPointerEvent<HTMLCanvasElement>)=>{drawing.current=true;event.currentTarget.setPointerCapture(event.pointerId);const ctx=event.currentTarget.getContext('2d');if(!ctx)return;const p=point(event);ctx.beginPath();ctx.moveTo(p.x,p.y)};
 const move=(event:ReactPointerEvent<HTMLCanvasElement>)=>{if(!drawing.current)return;const ctx=event.currentTarget.getContext('2d');if(!ctx)return;const p=point(event);ctx.strokeStyle=color;ctx.lineWidth=size;ctx.lineTo(p.x,p.y);ctx.stroke()};
 const stop=()=>{drawing.current=false};
 const clear=()=>{const canvas=canvasRef.current;const ctx=canvas?.getContext('2d');if(canvas&&ctx){ctx.fillStyle='#fffdf7';ctx.fillRect(0,0,900,520)}};
 const save=()=>{const canvas=canvasRef.current;if(!canvas)return;const src=canvas.toDataURL('image/png');updateNote(note.id,{drawing:src,attachments:[...(note.attachments||[]),{id:uid('attachment'),name:`boceto-${Date.now()}.png`,type:'image/png',src,createdAt:new Date().toISOString()}]});onToast('Boceto guardado y adjuntado a la nota.');onClose()};
 return <motion.div className="tool-dialog drawing-dialog" onClick={event=>event.stopPropagation()} onPointerDown={event=>event.stopPropagation()} initial={{opacity:0,scale:.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.94}}>
  <header><div><b>Bloc de dibujo</b><span>Dibuja con el ratón o una pantalla táctil.</span></div><button onClick={onClose}><X/></button></header>
  <div className="drawing-tools"><label>Color<input type="color" value={color} onChange={event=>setColor(event.target.value)}/></label><label>Grosor<input type="range" min="2" max="30" value={size} onChange={event=>setSize(Number(event.target.value))}/><em>{size}px</em></label><button onClick={clear}><Eraser/>Limpiar</button></div>
  <canvas ref={canvasRef} width={900} height={520} style={{touchAction:'none'}} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onPointerLeave={stop}/>
  <footer><button className="secondary" onClick={onClose}>Cancelar</button><button className="primary" onClick={save}><Save/>Guardar boceto</button></footer>
 </motion.div>;
}

export function FeatureHubPanel({open,note,onClose,onCreate,onFocusSearch,onDictate,onOpenCustomization,onOpenGroups,onOpenTags,onOpenInfo,onToggleFocus,onToast}:Props){
 const updateNote=useAppStore(state=>state.updateNote);
 const deleteNote=useAppStore(state=>state.deleteNote);
 const [selected,setSelected]=useState<SelectedTool>('write-note');
 const [dialog,setDialog]=useState<DialogType>(null);
 const [reminder,setReminder]=useState('');
 const [tags,setTags]=useState('');
 const fileRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(note){setReminder(note.reminderAt||'');setTags((note.tags||[]).join(', '))}},[note]);
 const selectedFeature=useMemo(()=>FEATURE_ICONS.find(item=>item.id===selected),[selected]);
 const requireNote=()=>{if(note)return true;onToast('Crea o selecciona una nota primero.');return false};
 const focusEditor=()=>window.setTimeout(()=>document.querySelector<HTMLElement>('.rich-note-body')?.focus(),80);
 const attach=async(file:File)=>{if(!note)return;const src=await fileToDataUrl(file);updateNote(note.id,{attachments:[...(note.attachments||[]),{id:uid('attachment'),name:file.name,type:file.type||'image/png',src,createdAt:new Date().toISOString()}]});onToast(`Imagen adjuntada: ${file.name}`)};
 const copyText=async(text:string)=>{try{await navigator.clipboard.writeText(text);return true}catch{const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.focus();area.select();const copied=document.execCommand('copy');area.remove();return copied}};
 const share=async()=>{if(!note)return false;const text=[note.title,htmlToText(note.body),...(note.items||[]).map(item=>`${item.done?'✓':'○'} ${item.text}`)].filter(Boolean).join('\n\n');if(navigator.share){try{await navigator.share({title:note.title,text});onToast('Nota compartida correctamente.');return true}catch(error){if(error instanceof DOMException&&error.name==='AbortError')return false}}const copied=await copyText(text);onToast(copied?'Nota copiada al portapapeles para compartirla.':'No se pudo copiar la nota.');return copied};
 const run=async(id:FeatureIconId)=>{
  switch(id){
   case 'new-note': onCreate();onClose();break;
   case 'search-notes': onFocusSearch();onClose();break;
   case 'write-note': if(requireNote()){updateNote(note!.id,{kind:'text'});focusEditor();onClose()}break;
   case 'study': onToggleFocus();onClose();break;
   case 'task-list': if(requireNote()){updateNote(note!.id,{kind:'task',items:note!.items.length?note!.items:[{id:uid('item'),text:'Nueva tarea',done:false}]});onClose()}break;
   case 'checklist': if(requireNote()){updateNote(note!.id,{kind:'checklist',items:note!.items.length?note!.items:[{id:uid('item'),text:'Nuevo elemento',done:false}]});onClose()}break;
   case 'drawing-pad':case 'sketch': if(requireNote())setDialog('drawing');break;
   case 'reminder': if(requireNote())setDialog('reminder');break;
   case 'pin-note': if(requireNote()){updateNote(note!.id,{pinned:!note!.pinned,alwaysOnTop:!note!.alwaysOnTop});onToast(note!.pinned?'Nota desfijada.':'Nota fijada.');onClose()}break;
   case 'tags': onOpenTags();onClose();break;
   case 'archive': if(requireNote()){updateNote(note!.id,{archived:!note!.archived});onClose()}break;
   case 'delete': if(requireNote()){if(note!.protected){onToast('Esta nota está protegida y no se puede eliminar.');break}const target=note!;void requestConfirmation({title:'Eliminar nota',message:`Vas a eliminar “${target.title||'Sin título'}”.`,detail:'Esta acción no se puede deshacer.',confirmLabel:'Eliminar nota',cancelLabel:'Cancelar',tone:'danger'}).then(accepted=>{if(accepted){deleteNote(target.id);onClose()}})}break;
   case 'voice-note': if(requireNote()){onDictate();onClose()}break;
   case 'attach-image': if(requireNote())fileRef.current?.click();break;
   case 'share': if(requireNote()&&await share())onClose();break;
   case 'themes': onOpenCustomization('themes');onClose();break;
   case 'lock': if(requireNote()){updateNote(note!.id,{locked:!note!.locked});onToast(note!.locked?'Nota desbloqueada.':'Nota bloqueada frente a cambios.');onClose()}break;
   case 'categories': onOpenGroups();onClose();break;
   case 'settings': onOpenCustomization('interface');onClose();break;
  }
 };
 const activeStatus=selectedFeature?.id==='pin-note'&&note?.pinned?'Fijada':selectedFeature?.id==='lock'&&note?.locked?'Bloqueada':selectedFeature?.id==='reminder'&&note?.reminderAt?'Programado':selectedFeature?.id==='archive'&&note?.archived?'Archivada':'';
 const unavailable=Boolean(selectedFeature&&NOTE_REQUIRED.has(selectedFeature.id)&&(!note||(selectedFeature.id==='delete'&&note.protected)));
 useEffect(()=>{
  if(!open)return;
  const handle=(event:KeyboardEvent)=>{
   if(event.key==='F1'){event.preventDefault();setSelected('help');return}
   if(!event.altKey||dialog||event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement)return;
   const key=event.key.toLowerCase();const feature=FEATURE_ICONS.find(item=>item.shortcutKey===key);
   if(feature){event.preventDefault();setSelected(feature.id);void run(feature.id)}
  };
  window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle)
 },[open,dialog,note]);
 const renderInformation=()=>{
  if(selected==='help')return <motion.div key="help" className="feature-tool-page" initial={{opacity:0,x:24}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-18}}>
   <div className="feature-detail-copy"><span className="feature-detail-kicker">INFORMACIÓN</span><h2>Ayuda de Chibi Notes</h2><p>Consulta explicaciones paso a paso, atajos, widgets, voz y consejos para organizar tus notas sin perderte entre opciones.</p><div className="feature-shortcut"><Keyboard/><span>Atajo</span><kbd>F1</kbd></div><ul className="feature-highlights"><li><Check/>Guía de inicio y edición</li><li><Check/>Atajos disponibles</li><li><Check/>Privacidad y funcionamiento local</li></ul><div className="feature-detail-actions"><motion.button className="primary feature-apply" onClick={()=>onOpenInfo('help')} whileHover={{y:-3}} whileTap={{scale:.96}}><CircleHelp/>Abrir ayuda<ChevronRight/></motion.button><button className="secondary" onClick={onClose}>Cerrar</button></div></div>
   <div className="feature-mascot-stage"><span className="feature-spark one">✦</span><span className="feature-spark two">♡</span><motion.img src="/assets/branding/chibi-notes.png" alt="Pollito de Chibi Notes" animate={{y:[0,-10,0],rotate:[-1,1,-1]}} transition={{duration:3.8,repeat:Infinity,ease:'easeInOut'}} whileHover={{scale:1.07,rotate:3}}/><div className="feature-mascot-caption"><b>¿Necesitas una pista?</b><span>El pollito te acompaña paso a paso.</span></div></div>
  </motion.div>;
  if(selected==='about')return <motion.div key="about" className="feature-tool-page" initial={{opacity:0,x:24}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-18}}>
   <div className="feature-detail-copy"><span className="feature-detail-kicker">INFORMACIÓN</span><h2>Acerca de Chibi Notes</h2><p>Consulta la versión instalada, tecnologías, autoría de Zazen AI Studio y los términos de la licencia propietaria.</p><div className="feature-shortcut"><Info/><span>Aplicación</span><kbd>v0.4.26</kbd></div><ul className="feature-highlights"><li><Check/>Datos y versión del producto</li><li><Check/>Créditos y tecnologías</li><li><Check/>Licencia de software propietario</li></ul><div className="feature-detail-actions"><motion.button className="primary feature-apply" onClick={()=>onOpenInfo('about')} whileHover={{y:-3}} whileTap={{scale:.96}}><Info/>Ver información<ChevronRight/></motion.button><button className="secondary" onClick={()=>onOpenInfo('license')}><ShieldCheck/>Licencia</button></div></div>
   <div className="feature-mascot-stage"><span className="feature-spark one">✦</span><span className="feature-spark two">★</span><motion.img src="/assets/branding/chibi-notes.png" alt="Icono de Chibi Notes" animate={{y:[0,-8,0],scale:[1,1.025,1]}} transition={{duration:4.2,repeat:Infinity,ease:'easeInOut'}} whileHover={{scale:1.08,rotate:-3}}/><div className="feature-mascot-caption"><b>Creado con cariño</b><span>Una aplicación de Zazen AI Studio.</span></div></div>
  </motion.div>;
  if(!selectedFeature)return null;
  return <motion.div key={selectedFeature.id} className="feature-tool-page" initial={{opacity:0,x:24}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-18}} transition={{duration:.22}}>
   <div className="feature-detail-copy">
    <div className="feature-detail-heading"><span className="feature-detail-kicker">{FEATURE_CATEGORIES.find(category=>category.id===selectedFeature.category)?.title.toUpperCase()}</span>{activeStatus&&<em>{activeStatus}</em>}</div>
    <h2>{selectedFeature.title}</h2><p>{selectedFeature.longDescription}</p>
    <div className="feature-shortcut"><Keyboard/><span>Atajo de teclado</span><kbd>{selectedFeature.shortcut}</kbd></div>
    <div className="feature-what-does"><b>Qué puedes hacer</b><ul className="feature-highlights">{selectedFeature.highlights.map(item=><li key={item}><Check/>{item}</li>)}</ul></div>
    {note&&<div className="feature-current-note"><span><NoteIcon value={note.icon||'📝'}/></span><div><small>Se aplicará a</small><b>{note.title||'Sin título'}</b></div></div>}
    {!note&&selectedFeature&&NOTE_REQUIRED.has(selectedFeature.id)&&<div className="feature-note-warning">Selecciona o crea una nota para utilizar esta herramienta.</div>}
    <div className="feature-detail-actions"><motion.button className={`primary feature-apply ${selectedFeature.id==='delete'?'danger':''}`} disabled={unavailable} onClick={()=>void run(selectedFeature.id)} whileHover={unavailable?{}:{y:-3,scale:1.01}} whileTap={unavailable?{}:{scale:.96}}><Play/>{selectedFeature.actionLabel}<ChevronRight/></motion.button><button className="secondary" onClick={onClose}>Cerrar</button></div>
   </div>
   <div className="feature-mascot-stage"><span className="feature-spark one">✦</span><span className="feature-spark two">♡</span><span className="feature-spark three">•</span><motion.img key={selectedFeature.src} src={selectedFeature.src} alt={selectedFeature.title} initial={{opacity:0,scale:.72,rotate:-8,y:18}} animate={{opacity:1,scale:1,rotate:0,y:[0,-8,0]}} transition={{opacity:{duration:.2},scale:{type:'spring',stiffness:250,damping:19},rotate:{duration:.3},y:{duration:3.4,repeat:Infinity,ease:'easeInOut'}}} whileHover={{scale:1.075,rotate:3,y:-10}}/><div className="feature-mascot-caption"><b>{selectedFeature.shortTitle}</b><span>{selectedFeature.description}</span></div></div>
  </motion.div>
 };
 return <AnimatePresence>{open&&<motion.div className="feature-hub-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}>
  <motion.section className="feature-hub feature-hub-redesign" initial={{opacity:0,scale:.94,y:24}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.96,y:18}} transition={{type:'spring',stiffness:300,damping:29}} onClick={event=>event.stopPropagation()}>
   <aside className="feature-tool-sidebar">
    <div className="feature-tool-brand"><img src="/assets/branding/chibi-notes.png" alt=""/><div><span>CHIBI NOTES</span><b>Herramientas</b></div></div>
    <div className="feature-tool-nav">{FEATURE_CATEGORIES.map(category=><section key={category.id}><header><b>{category.title}</b><span>{category.description}</span></header>{FEATURE_ICONS.filter(item=>item.category===category.id).map(feature=><motion.button key={feature.id} className={selected===feature.id?'active':''} onClick={()=>setSelected(feature.id)} whileHover={{x:4}} whileTap={{scale:.97}}><img src={feature.src} alt=""/><span>{feature.shortTitle}</span>{selected===feature.id&&<motion.i layoutId="feature-nav-marker"/>}</motion.button>)}</section>)}</div>
    <div className="feature-tool-info-links"><button className={selected==='help'?'active':''} onClick={()=>setSelected('help')}><CircleHelp/><span>Ayuda</span><kbd>F1</kbd></button><button className={selected==='about'?'active':''} onClick={()=>setSelected('about')}><Info/><span>Acerca de</span></button></div>
   </aside>
   <main className="feature-tool-content"><button className="feature-hub-close" aria-label="Cerrar herramientas" onClick={onClose}><X/></button><AnimatePresence mode="wait">{renderInformation()}</AnimatePresence></main>
   <input ref={fileRef} hidden type="file" accept="image/*" onChange={event=>{const file=event.target.files?.[0];if(file)void attach(file);event.currentTarget.value=''}}/>
  </motion.section>
  <AnimatePresence>{dialog&&<motion.div className="tool-dialog-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setDialog(null)} onPointerDown={event=>event.stopPropagation()}>
   {dialog==='drawing'&&note&&<DrawingDialog note={note} onClose={()=>setDialog(null)} onToast={onToast}/>} 
   {dialog==='reminder'&&note&&<motion.form className="tool-dialog compact-tool-dialog" onClick={event=>event.stopPropagation()} initial={{scale:.9}} animate={{scale:1}} onSubmit={event=>{event.preventDefault();void (async()=>{if(reminder&&!await ensureNotificationPermission()){onToast('Debes permitir las notificaciones para recibir el recordatorio en Windows.');return}updateNote(note.id,{reminderAt:reminder});onToast(reminder?'Recordatorio guardado.':'Recordatorio eliminado.');setDialog(null)})()}}><header><div><b>Recordatorio</b><span>Selecciona fecha y hora.</span></div><button type="button" onClick={()=>setDialog(null)}><X/></button></header><label><Bell/>Fecha y hora<input type="datetime-local" value={reminder} onChange={event=>setReminder(event.target.value)}/></label><footer><button type="button" className="secondary" onClick={()=>setReminder('')}>Quitar</button><button className="primary"><Check/>Guardar</button></footer></motion.form>}
   {dialog==='tags'&&note&&<motion.form className="tool-dialog compact-tool-dialog" onClick={event=>event.stopPropagation()} initial={{scale:.9}} animate={{scale:1}} onSubmit={event=>{event.preventDefault();updateNote(note.id,{tags:tags.split(',').map(item=>item.trim()).filter(Boolean)});onToast('Etiquetas actualizadas.');setDialog(null)}}><header><div><b>Etiquetas</b><span>Sepáralas mediante comas.</span></div><button type="button" onClick={()=>setDialog(null)}><X/></button></header><label><Tag/>Etiquetas<input value={tags} onChange={event=>setTags(event.target.value)} placeholder="trabajo, urgente, ideas"/></label><footer><button type="button" className="secondary" onClick={()=>setDialog(null)}>Cancelar</button><button className="primary"><Save/>Guardar</button></footer></motion.form>}
  </motion.div>}</AnimatePresence>
 </motion.div>}</AnimatePresence>;
}
