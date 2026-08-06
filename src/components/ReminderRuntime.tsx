import {useEffect,useRef} from 'react';
import {useAppStore} from '../store/useAppStore';
import {cancelNativeReminder,scheduleNativeReminder,sendReminderNotification} from '../lib/notifications';
import {isTauri} from '../lib/utils';

const isDue=(value:string)=>{const date=new Date(value);return !Number.isNaN(date.getTime())&&date.getTime()<=Date.now()};

type NativeReminderEvent={noteId:string;reminderAt:string;title:string;ok:boolean;error?:string};

export function ReminderRuntime(){
 const notes=useAppStore(state=>state.notes);
 const checking=useRef(false);
 const scheduled=useRef(new Map<string,string>());

 useEffect(()=>{
  if(new URLSearchParams(location.search).get('view'))return;
  const active=new Map(notes.filter(note=>Boolean(note.reminderAt)).map(note=>[note.id,note.reminderAt]));
  for(const [oldId] of scheduled.current)if(!active.has(oldId)){void cancelNativeReminder(oldId);scheduled.current.delete(oldId)}
  for(const note of notes){
   if(!note.reminderAt)continue;
   const date=new Date(note.reminderAt);
   if(Number.isNaN(date.getTime())||date.getTime()<=Date.now())continue;
   if(scheduled.current.get(note.id)===note.reminderAt)continue;
   scheduled.current.set(note.id,note.reminderAt);
   void scheduleNativeReminder(note).catch(error=>{scheduled.current.delete(note.id);window.dispatchEvent(new CustomEvent('chibi:reminder-error',{detail:{message:error instanceof Error?error.message:'No se pudo programar la notificación.'}}))});
  }
 },[notes]);

 useEffect(()=>{
  if(!isTauri()||new URLSearchParams(location.search).get('view'))return;
  let unlisten:(()=>void)|undefined;
  let cancelled=false;
  void import('@tauri-apps/api/event').then(({listen})=>listen<NativeReminderEvent>('native-reminder-fired',event=>{
   const value=event.payload;
   const key=`chibi-reminder-v3:${value.noteId}:${value.reminderAt}`;
   if(value.ok){
    localStorage.setItem(key,new Date().toISOString());
    window.dispatchEvent(new CustomEvent('chibi:reminder-fired',{detail:{noteId:value.noteId,title:value.title.replace(/^Chibi Notes · /,'')}}));
   }else{
    window.dispatchEvent(new CustomEvent('chibi:reminder-error',{detail:{message:value.error||'No se pudo mostrar la notificación.'}}));
   }
  })).then(dispose=>{if(cancelled)dispose();else unlisten=dispose}).catch(()=>undefined);
  return()=>{cancelled=true;unlisten?.()};
 },[]);

 useEffect(()=>{
  if(new URLSearchParams(location.search).get('view'))return;
  const check=async()=>{
   if(checking.current)return;
   checking.current=true;
   try{
    for(const note of notes){
     if(!note.reminderAt||!isDue(note.reminderAt))continue;
     // En Tauri el temporizador nativo tiene prioridad. La comprobación JS espera
     // 30 segundos antes de actuar como respaldo para evitar avisos duplicados.
     if(isTauri()&&Date.now()-new Date(note.reminderAt).getTime()<30000)continue;
     const key=`chibi-reminder-v3:${note.id}:${note.reminderAt}`;
     if(localStorage.getItem(key))continue;
     const retryKey=`${key}:retry`;
     const lastRetry=Number(localStorage.getItem(retryKey)||0);
     if(Date.now()-lastRetry<60000)continue;
     localStorage.setItem(retryKey,String(Date.now()));
     try{
      await sendReminderNotification(note);
      localStorage.setItem(key,new Date().toISOString());
      window.dispatchEvent(new CustomEvent('chibi:reminder-fired',{detail:{noteId:note.id,title:note.title}}));
     }catch(error){
      window.dispatchEvent(new CustomEvent('chibi:reminder-error',{detail:{message:error instanceof Error?error.message:'No se pudo mostrar la notificación.'}}));
     }
    }
   }finally{checking.current=false}
  };
  void check();
  const timer=window.setInterval(()=>void check(),5000);
  return()=>window.clearInterval(timer);
 },[notes]);
 return null;
}
