import { useEffect } from 'react';
import { mergeCustomization, useAppStore } from '../store/useAppStore';
import { NoteWidget } from './NoteWidget';

export function WidgetApp(){
 const params=new URLSearchParams(location.search);
 const id=params.get('note_id');
 const notes=useAppStore(state=>state.notes);
 const note=notes.find(item=>item.id===id)||notes[0];
 const customization=mergeCustomization(note?.customization);
 useEffect(()=>{
  document.body.classList.add('widget-body');
  const radius=`${customization.window.cornerRadius}px`;
  document.documentElement.style.borderRadius=radius;
  document.body.style.borderRadius=radius;
  document.getElementById('root')?.style.setProperty('border-radius',radius);
  void useAppStore.persist.rehydrate();
  return()=>{document.body.classList.remove('widget-body')};
 },[customization.window.cornerRadius]);
 return note?<div className="widget-root" style={{borderRadius:customization.window.cornerRadius}}><NoteWidget note={note} widgetMode/></div>:<div className="widget-empty">Esta nota ya no existe.</div>;
}
