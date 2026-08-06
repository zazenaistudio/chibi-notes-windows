import type { Note } from '../types';
import { htmlToText } from './richText';
import { isTauri } from './utils';

export async function ensureNotificationPermission() {
  if (isTauri()) {
    const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification');
    if (await isPermissionGranted()) return true;
    return (await requestPermission()) === 'granted';
  }
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  return (await Notification.requestPermission()) === 'granted';
}

export function reminderNotificationContent(note:Note){
 const title=`Chibi Notes · ${note.title || 'Sin título'}`;
 const body=htmlToText(note.body).slice(0,160)||note.items.find(item=>!item.done)?.text||'Tienes una nota pendiente.';
 return {title,body};
}

export async function sendReminderNotification(note: Note) {
  const allowed = await ensureNotificationPermission();
  if (!allowed) throw new Error('No se concedió permiso para mostrar notificaciones de Windows.');
  const {title,body}=reminderNotificationContent(note);
  if (isTauri()) {
    const { sendNotification } = await import('@tauri-apps/plugin-notification');
    sendNotification({ title, body });
  } else {
    new Notification(title, { body });
  }
}

export async function scheduleNativeReminder(note:Note){
 if(!isTauri()||!note.reminderAt)return;
 const allowed=await ensureNotificationPermission();
 if(!allowed)throw new Error('No se concedió permiso para mostrar notificaciones de Windows.');
 const timestamp=new Date(note.reminderAt).getTime();
 if(Number.isNaN(timestamp))return;
 const {invoke}=await import('@tauri-apps/api/core');
 const {title,body}=reminderNotificationContent(note);
 await invoke('schedule_reminder',{noteId:note.id,reminderAt:note.reminderAt,title,body,timestampMs:timestamp});
}

export async function cancelNativeReminder(noteId:string){
 if(!isTauri())return;
 const {invoke}=await import('@tauri-apps/api/core');
 await invoke('cancel_reminder',{noteId});
}
