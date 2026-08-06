import { AnimatePresence, motion } from 'framer-motion';
import { Archive, ArchiveRestore, Copy, FileText, Image, Pencil, Plus, Search, Tag, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Note } from '../types';
import { htmlToText } from '../lib/richText';
import { playSound } from '../lib/sounds';
import { useAppStore } from '../store/useAppStore';
import { Select } from './Controls';
import { NoteIcon } from './NoteIcon';
import { NoteIconPicker } from './NoteIconPicker';
import { useI18n } from '../i18n';
import { requestConfirmation } from '../lib/confirm';
import { QuickTextDialog } from './QuickTextDialog';
import { TagPickerDialog } from './TagPickerDialog';

type Tab='notes'|'tags';
type Props={open:boolean;initialTab?:Tab;onClose:()=>void;onEdit:(id:string)=>void;onCreate:(groupId?:string)=>void};

export function NotesManagerPanel({open,initialTab='notes',onClose,onEdit,onCreate}:Props){
 const {t}=useI18n();
 const notes=useAppStore(state=>state.notes);
 const groups=useAppStore(state=>state.groups);
 const availableTags=useAppStore(state=>state.availableTags);
 const updateNote=useAppStore(state=>state.updateNote);
 const deleteNote=useAppStore(state=>state.deleteNote);
 const duplicateNote=useAppStore(state=>state.duplicateNote);
 const addAvailableTag=useAppStore(state=>state.addAvailableTag);
 const renameAvailableTag=useAppStore(state=>state.renameAvailableTag);
 const deleteAvailableTag=useAppStore(state=>state.deleteAvailableTag);
 const [tab,setTab]=useState<Tab>(initialTab);
 const [query,setQuery]=useState('');
 const [groupFilter,setGroupFilter]=useState('all');
 const [renaming,setRenaming]=useState<string|null>(null);
 const [draft,setDraft]=useState('');
 const [newTag,setNewTag]=useState('');
 const [iconNote,setIconNote]=useState<Note|undefined>();
 const [tagPickerNote,setTagPickerNote]=useState<Note|undefined>();
 const [renamingTag,setRenamingTag]=useState('');

 useEffect(()=>{if(open)setTab(initialTab)},[open,initialTab]);
 const filtered=useMemo(()=>{
  const term=query.trim().toLowerCase();
  return notes.filter(note=>{
   const groupOk=groupFilter==='all'||(groupFilter==='ungrouped'?!note.groupId:note.groupId===groupFilter);
   const textOk=!term||`${note.title} ${htmlToText(note.body)} ${note.items.map(item=>item.text).join(' ')} ${(note.tags||[]).join(' ')}`.toLowerCase().includes(term);
   return groupOk&&textOk;
  }).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updatedAt.localeCompare(a.updatedAt));
 },[notes,query,groupFilter]);
 const tags=useMemo(()=>[...new Set([...availableTags,...notes.flatMap(note=>note.tags||[])])].sort((a,b)=>a.localeCompare(b,'es')),[availableTags,notes]);
 const beginRename=(id:string,title:string)=>{setRenaming(id);setDraft(title)};
 const commitRename=()=>{if(!renaming)return;updateNote(renaming,{title:draft.trim()||t('Sin título')});setRenaming(null);playSound('achievement')};
 const remove=async(id:string,title:string)=>{
  const note=notes.find(item=>item.id===id);
  if(note?.protected){window.alert(t('Esta nota es parte del inicio de Chibi Notes y no se puede eliminar.'));return;}
  const accepted=await requestConfirmation({title:t('Eliminar nota'),message:`${t('Vas a eliminar')} “${title||t('Sin título')}”.`,detail:t('Esta acción no se puede deshacer.'),confirmLabel:t('Eliminar nota'),cancelLabel:t('Cancelar'),tone:'danger'});
  if(accepted){deleteNote(id);playSound('delete');}
 };
 const removeTag=async(tag:string)=>{
  const accepted=await requestConfirmation({title:t('Eliminar etiqueta'),message:`${t('Vas a eliminar')} “#${tag}”.`,detail:t('Se quitará de todas las notas, pero no se eliminará ninguna nota.'),confirmLabel:t('Eliminar'),cancelLabel:t('Cancelar'),tone:'warning'});
  if(accepted)deleteAvailableTag(tag);
 };
 const createTag=()=>{const value=newTag.trim();if(!value)return;addAvailableTag(value);setNewTag('')};

 return <AnimatePresence>{open&&<motion.div className="notes-manager-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <motion.aside className="notes-manager-panel clean-manager" initial={{opacity:0,scale:.95,y:24}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.97,y:18}}>
   <header><div><span>{t('ORGANIZACIÓN')}</span><h2>{t('Administrar contenido')}</h2><p>{t('Edita notas, elige iconos kawaii, muévelas entre grupos y administra las etiquetas.')}</p></div><motion.button data-sound="modalClose" onClick={onClose} whileHover={{rotate:90}}><X/></motion.button></header>
   <div className="manager-tabs"><button className={tab==='notes'?'active':''} onClick={()=>setTab('notes')}><FileText/>{t('Notas')}</button><button className={tab==='tags'?'active':''} onClick={()=>setTab('tags')}><Tag/>{t('Etiquetas')} <em>{tags.length}</em></button></div>
   {tab==='notes'?<>
    <div className="notes-manager-tools"><label><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder={t('Buscar por título, contenido o etiqueta…')}/></label><Select label={t('Grupo')} value={groupFilter} onChange={setGroupFilter}><option value="all">{t('Todos los grupos')}</option><option value="ungrouped">{t('Escritorio')}</option>{groups.map(group=><option key={group.id} value={group.id}>{group.icon} {group.name}</option>)}</Select><button className="primary" onClick={()=>onCreate(groupFilter==='ungrouped'?'':groupFilter!=='all'?groupFilter:undefined)}><Plus/>{t('Nueva nota')}</button></div>
    <div className="managed-note-list">{filtered.map(note=>{
     const group=groups.find(item=>item.id===note.groupId);
     return <motion.article layout key={note.id} whileHover={{y:-3}}>
      <div className="managed-note-thumb" style={{backgroundImage:`url("/assets/backgrounds/${note.customization.background.backgroundId}.svg")`}}><NoteIcon value={note.icon}/></div>
      <div className="managed-note-copy">
       {renaming===note.id?<input autoFocus value={draft} onChange={event=>setDraft(event.target.value)} onBlur={commitRename} onKeyDown={event=>{if(event.key==='Enter')commitRename();if(event.key==='Escape')setRenaming(null)}}/>:<button className="managed-note-title" data-i18n-skip onClick={()=>{onEdit(note.id);onClose()}} title={note.title||t('Sin título')}>{note.title||t('Sin título')}</button>}
       <small data-i18n-skip>{htmlToText(note.body).slice(0,92)||`${note.items.length} ${t('tareas')}`}</small>
       <em>{group?`${group.icon} ${group.name}`:note.myDay?t('Mi Día Chibi'):t('Escritorio')} · {note.archived?t('Archivada'):t('Activa')}{note.myDay?` · ${t('Mi día')}`:''}</em>
       <div className="managed-note-organize">
        <button className="managed-icon-picker-button" onClick={()=>setIconNote(note)} title={t('Cambiar icono')}><NoteIcon value={note.icon}/><span><small>{t('Icono de la nota')}</small><b>{t('Cambiar icono')}</b></span><Image/></button>
        <Select label={t('Ubicación')} value={note.myDay&&note.groupId==='__myday__'?'__myday__':note.groupId||''} onChange={value=>value==='__myday__'?updateNote(note.id,{groupId:'__myday__',myDay:true,archived:false}):value===''?updateNote(note.id,{groupId:'',myDay:false,archived:false}):updateNote(note.id,{groupId:value,myDay:false,archived:false})}><option value="">{t('Escritorio')}</option><option value="__myday__">⭐ {t('Mi Día Chibi')}</option>{groups.map(item=><option key={item.id} value={item.id}>{item.icon} {item.name}</option>)}</Select>
       </div>
       <div className="tag-chip-row">{note.tags.map(tag=><button key={tag} onClick={()=>updateNote(note.id,{tags:note.tags.filter(item=>item!==tag)})}>#{tag}<X/></button>)}<button className="add-tag-chip" onClick={()=>setTagPickerNote(note)}><Plus/>{t('Etiqueta')}</button></div>
      </div>
      <div className="managed-note-actions"><button title={t('Editar')} onClick={()=>{onEdit(note.id);onClose()}}><Pencil/></button><button title={t('Renombrar')} onClick={()=>beginRename(note.id,note.title)}><FileText/></button><button title={t('Duplicar')} onClick={()=>duplicateNote(note.id)}><Copy/></button><button title={note.archived?t('Restaurar'):t('Archivar')} onClick={()=>updateNote(note.id,{archived:!note.archived})}>{note.archived?<ArchiveRestore/>:<Archive/>}</button><button className="danger" title={note.protected?t('Esta nota está protegida'):t('Eliminar')} disabled={note.protected} onClick={()=>void remove(note.id,note.title)}><Trash2/></button></div>
     </motion.article>;
    })}{!filtered.length&&<div className="manager-empty"><FileText/><b>{t('No hay notas coincidentes')}</b><p>{t('Cambia los filtros o crea una nota nueva.')}</p></div>}</div>
   </>:<div className="tag-manager">
    <form onSubmit={event=>{event.preventDefault();createTag()}}><Tag/><input value={newTag} onChange={event=>setNewTag(event.target.value)} placeholder={t('Nueva etiqueta')}/><button className="primary"><Plus/>{t('Crear')}</button></form>
    <div className="tag-catalog-hint"><Tag/><div><b>{t('Catálogo de etiquetas')}</b><p>{t('Las etiquetas creadas aquí estarán disponibles al editar cualquier nota.')}</p></div></div>
    <div className="tag-manager-grid">{tags.map(tag=>{const count=notes.filter(note=>note.tags.includes(tag)).length;return <motion.article key={tag} whileHover={{y:-4}}><span>#{tag}</span><small>{count} {t(count===1?'nota':'notas')}</small><div><button title={t('Renombrar')} onClick={()=>setRenamingTag(tag)}><Pencil/></button><button className="danger" title={t('Eliminar')} onClick={()=>void removeTag(tag)}><Trash2/></button></div></motion.article>})}{!tags.length&&<div className="manager-empty"><Tag/><b>{t('Aún no hay etiquetas')}</b><p>{t('Crea una para clasificar notas sin moverlas de grupo.')}</p></div>}</div>
   </div>}
  </motion.aside>
  <NoteIconPicker open={Boolean(iconNote)} value={iconNote?.icon} onClose={()=>setIconNote(undefined)} onSelect={icon=>{if(iconNote)updateNote(iconNote.id,{icon});setIconNote(undefined)}}/>
  <TagPickerDialog open={Boolean(tagPickerNote)} note={tagPickerNote} onClose={()=>setTagPickerNote(undefined)}/>
  <QuickTextDialog open={Boolean(renamingTag)} title={t('Renombrar etiqueta')} label={t('Nombre de la etiqueta')} initialValue={renamingTag} onClose={()=>setRenamingTag('')} onSave={value=>{if(renamingTag&&value)renameAvailableTag(renamingTag,value)}}/>
 </motion.div>}</AnimatePresence>;
}
