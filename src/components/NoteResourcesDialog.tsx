import { AnimatePresence, motion } from 'framer-motion';
import { Check, Clipboard, ExternalLink, File, Files, FolderOpen, Globe2, Link2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Note, NoteResource, NoteResourceKind } from '../types';
import { useAppStore } from '../store/useAppStore';
import { openNoteResource } from '../lib/backend';
import { isTauri, uid } from '../lib/utils';
import { useI18n } from '../i18n';
import { requestConfirmation } from '../lib/confirm';

type Props={open:boolean;note:Note;initialTab:NoteResourceKind;onClose:()=>void;onResourcesChange?:(resources:NoteResource[])=>void};

const now=()=>new Date().toISOString();
const normalizeWeb=(value:string)=>{const trimmed=value.trim();if(!trimmed)return '';return /^https?:\/\//i.test(trimmed)?trimmed:`https://${trimmed}`};

export function NoteResourcesDialog({open,note,initialTab,onClose,onResourcesChange}:Props){
 const {t}=useI18n();
 const updateNote=useAppStore(state=>state.updateNote);
 const liveResources=useAppStore(state=>state.notes.find(item=>item.id===note.id)?.resources);
 const [tab,setTab]=useState<NoteResourceKind>(initialTab);
 const [title,setTitle]=useState('');
 const [value,setValue]=useState('');
 const [editingId,setEditingId]=useState('');
 const [message,setMessage]=useState('');
 const [resources,setResources]=useState<NoteResource[]>(()=>liveResources??note.resources??[]);
 const files=useMemo(()=>resources.filter(item=>item.kind==='file'),[resources]);
 const webs=useMemo(()=>resources.filter(item=>item.kind==='web'),[resources]);
 const visible=tab==='file'?files:webs;

 useEffect(()=>{setResources(liveResources??note.resources??[])},[liveResources,note.id,note.resources]);
 useEffect(()=>{if(open){setTab(initialTab);setEditingId('');setTitle('');setValue('');setMessage('')}},[open,initialTab,note.id]);
 const commitResources=(next:NoteResource[])=>{setResources(next);onResourcesChange?.(next);updateNote(note.id,{resources:next})};
 const reset=()=>{setEditingId('');setTitle('');setValue('');setMessage('')};
 const chooseTab=(next:NoteResourceKind)=>{setTab(next);reset()};
 const edit=(resource:NoteResource)=>{setTab(resource.kind);setEditingId(resource.id);setTitle(resource.title);setValue(resource.value);setMessage('')};
 const save=()=>{
  const cleanTitle=title.trim();
  const cleanValue=tab==='web'?normalizeWeb(value):value.trim();
  if(!cleanTitle||!cleanValue){setMessage(tab==='file'?t('Escribe un título y una ubicación de archivo.'):t('Escribe un título y un enlace web.'));return;}
  const latest=useAppStore.getState().notes.find(item=>item.id===note.id)?.resources||resources;
  const current=latest.find(item=>item.id===editingId);
  const resource:NoteResource=current?{...current,kind:tab,title:cleanTitle,value:cleanValue,updatedAt:now()}:{id:uid('resource'),kind:tab,title:cleanTitle,value:cleanValue,createdAt:now(),updatedAt:now()};
  const next=current?latest.map(item=>item.id===current.id?resource:item):[resource,...latest];
  commitResources(next);reset();
 };
 const remove=async(resource:NoteResource)=>{const accepted=await requestConfirmation({title:t('Eliminar conexión'),message:`${t('Vas a eliminar')} “${resource.title}”.`,detail:t('El archivo o la página original no se eliminará.'),confirmLabel:t('Eliminar'),cancelLabel:t('Cancelar'),tone:'warning'});if(!accepted)return;const latest=useAppStore.getState().notes.find(item=>item.id===note.id)?.resources||resources;commitResources(latest.filter(item=>item.id!==resource.id));if(editingId===resource.id)reset()};
 const browse=async()=>{
  if(!isTauri()){setMessage(t('Escribe o pega manualmente la ubicación del archivo.'));return;}
  try{const {open}=await import('@tauri-apps/plugin-dialog');const selected=await open({multiple:false,directory:false,title:t('Seleccionar archivo relacionado')});if(typeof selected==='string'){setValue(selected);if(!title){const parts=selected.replace(/\\/g,'/').split('/');setTitle(parts.at(-1)||t('Archivo relacionado'))}}}catch(error){setMessage(error instanceof Error?error.message:t('No se pudo abrir el selector de archivos.'))}
 };
 const launch=async(resource:NoteResource)=>{try{await openNoteResource(resource.kind,resource.value)}catch(error){setMessage(error instanceof Error?error.message:t('No se pudo abrir el recurso.'))}};
 const copy=async(resource:NoteResource)=>{try{await navigator.clipboard.writeText(resource.value);setMessage(t('Ubicación copiada.'))}catch{setMessage(t('No se pudo copiar la ubicación.'))}};

 const dialog=<AnimatePresence>{open&&<motion.div className="resources-dialog-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <motion.section className="resources-dialog chibi-modal-card" initial={{opacity:0,scale:.94,y:18}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.96,y:12}} transition={{type:'spring',stiffness:260,damping:25}}>
   <header className="resources-dialog-header">
    <motion.div className="resources-dialog-mascot" animate={{y:[0,-6,0],rotate:[-2,2,-2]}} transition={{duration:3.6,repeat:Infinity,ease:'easeInOut'}}><img src={tab==='file'?'/assets/feature-icons/15_pollito_adjuntar_imagen.png':'/assets/feature-icons/16_pollito_compartir_nota.png'} alt=""/></motion.div>
    <span className="resources-dialog-icon">{tab==='file'?<Files/>:<Globe2/>}</span>
    <div><small>{t('CONEXIONES DE LA NOTA')}</small><h2>{tab==='file'?t('Archivos relacionados'):t('Páginas web relacionadas')}</h2><p>{t('Conecta esta nota con recursos externos sin llenar su contenido principal.')}</p></div>
    <button className="resources-close" onClick={onClose} aria-label={t('Cerrar')}><X/></button>
   </header>

   <nav className="resources-tabs">
    <button className={tab==='file'?'active':''} onClick={()=>chooseTab('file')}><Files/><span><b>{t('Archivos')}</b><small>{files.length} {t(files.length===1?'archivo':'archivos')}</small></span></button>
    <button className={tab==='web'?'active':''} onClick={()=>chooseTab('web')}><Globe2/><span><b>{t('Webs')}</b><small>{webs.length} {t(webs.length===1?'enlace':'enlaces')}</small></span></button>
   </nav>

   <div className="resources-dialog-body">
    <form className="resource-editor" onSubmit={event=>{event.preventDefault();save()}}>
     <div className="resource-editor-heading"><span>{editingId?<Pencil/>:<Plus/>}</span><div><b>{editingId?t('Editar conexión'):tab==='file'?t('Agregar archivo'):t('Agregar página web')}</b><small>{tab==='file'?t('Guarda un nombre reconocible y la ubicación del archivo.'):t('Guarda un nombre reconocible y la dirección de la página.')}</small></div></div>
     <label><span>{t('Título identificativo')}</span><input data-i18n-skip value={title} onChange={event=>setTitle(event.target.value)} placeholder={tab==='file'?t('Ej. Guion del proyecto'):t('Ej. Documentación oficial')} autoFocus/></label>
     <label><span>{tab==='file'?t('Ubicación del archivo'):t('Enlace de la página web')}</span><div className="resource-location-field"><input data-i18n-skip value={value} onChange={event=>setValue(event.target.value)} placeholder={tab==='file'?'C:\\Documentos\\archivo.pdf':'https://ejemplo.com'}/>{tab==='file'&&<button type="button" onClick={()=>void browse()} data-tooltip={t('Buscar archivo')}><FolderOpen/></button>}</div></label>
     {message&&<motion.p className="resource-message" initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}}>{message}</motion.p>}
     <div className="resource-editor-actions">{editingId&&<button type="button" className="secondary" onClick={reset}>{t('Cancelar edición')}</button>}<button className="primary"><Check/>{editingId?t('Guardar cambios'):tab==='file'?t('Agregar archivo'):t('Agregar web')}</button></div>
    </form>

    <section className="resource-list-panel">
     <header><div><b>{tab==='file'?t('Archivos de esta nota'):t('Webs de esta nota')}</b><small>{t('Cada nota mantiene su propia colección de conexiones.')}</small></div><em>{visible.length}</em></header>
     <div className="resource-list">
      {visible.map(resource=><motion.article key={resource.id} layout initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}>
       <span className={`resource-item-icon ${resource.kind}`}>{resource.kind==='file'?<File/>:<Link2/>}</span>
       <div className="resource-item-copy" data-i18n-skip><b>{resource.title}</b><small title={resource.value}>{resource.value}</small></div>
       <div className="resource-item-actions"><button data-tooltip={t('Abrir')} onClick={()=>void launch(resource)}><ExternalLink/></button><button data-tooltip={t('Copiar ubicación')} onClick={()=>void copy(resource)}><Clipboard/></button><button data-tooltip={t('Editar')} onClick={()=>edit(resource)}><Pencil/></button><button className="danger" data-tooltip={t('Eliminar')} onClick={()=>void remove(resource)}><Trash2/></button></div>
      </motion.article>)}
      {visible.length===0&&<div className="resource-empty"><motion.span animate={{y:[0,-5,0],rotate:[-2,2,-2]}} transition={{duration:3,repeat:Infinity}}>{tab==='file'?<Files/>:<Globe2/>}</motion.span><b>{tab==='file'?t('Todavía no hay archivos relacionados'):t('Todavía no hay webs relacionadas')}</b><p>{tab==='file'?t('Añade documentos, imágenes, carpetas de trabajo o cualquier archivo conectado con esta nota.'):t('Añade artículos, documentación, vídeos o páginas que amplíen la información de esta nota.')}</p></div>}
     </div>
    </section>
   </div>
  </motion.section>
 </motion.div>}</AnimatePresence>;
 return createPortal(dialog,document.body);
}
