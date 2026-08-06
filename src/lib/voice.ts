import type { Note, VoiceSettings } from '../types';
import { htmlToText } from './richText';

let activeUtterance:SpeechSynthesisUtterance|null=null;

export const listSpeechVoices=()=>typeof window==='undefined'||!('speechSynthesis' in window)?[]:window.speechSynthesis.getVoices();

export function stopSpeaking(){
 if(typeof window!=='undefined'&&'speechSynthesis' in window)window.speechSynthesis.cancel();
 activeUtterance=null;
}

export function noteSpeechText(note:Note,settings:VoiceSettings){
 const parts:string[]=[];
 if(settings.readTitle&&note.title.trim())parts.push(note.title.trim());
 const body=htmlToText(note.body);
 if(body)parts.push(body);
 if(settings.readChecklist&&note.items.length){
  const pending=note.items.filter(item=>!item.done).map(item=>item.text.trim()).filter(Boolean);
  const completed=note.items.filter(item=>item.done).map(item=>item.text.trim()).filter(Boolean);
  if(pending.length)parts.push(`Tareas pendientes: ${pending.join('. ')}`);
  if(completed.length)parts.push(`Tareas completadas: ${completed.join('. ')}`);
 }
 return parts.join('. ').replace(/\s+/g,' ').trim();
}

export function speakText(text:string,settings:VoiceSettings,onEnd?:()=>void){
 if(typeof window==='undefined'||!('speechSynthesis' in window))throw new Error('El sistema no ofrece síntesis de voz.');
 const clean=text.replace(/\s+/g,' ').trim();
 if(!clean)throw new Error('Selecciona un texto para leer.');
 stopSpeaking();
 const utterance=new SpeechSynthesisUtterance(clean);
 utterance.lang=settings.language;utterance.rate=settings.rate;utterance.pitch=settings.pitch;utterance.volume=settings.volume;
 const voices=listSpeechVoices();const voice=voices.find(item=>item.name===settings.voiceName)||voices.find(item=>item.lang.toLowerCase().startsWith(settings.language.split('-')[0].toLowerCase()));
 if(voice)utterance.voice=voice;
 utterance.onend=()=>{activeUtterance=null;onEnd?.()};utterance.onerror=()=>{activeUtterance=null;onEnd?.()};activeUtterance=utterance;window.speechSynthesis.speak(utterance);
}

export function speakNote(note:Note,settings:VoiceSettings,onEnd?:()=>void){
 if(typeof window==='undefined'||!('speechSynthesis' in window))throw new Error('El sistema no ofrece síntesis de voz.');
 const text=noteSpeechText(note,settings);
 if(!text)throw new Error('La nota no contiene texto para leer.');
 stopSpeaking();
 const utterance=new SpeechSynthesisUtterance(text);
 utterance.lang=settings.language;
 utterance.rate=settings.rate;
 utterance.pitch=settings.pitch;
 utterance.volume=settings.volume;
 const voice=listSpeechVoices().find(item=>item.name===settings.voiceName)||listSpeechVoices().find(item=>item.lang.toLowerCase().startsWith(settings.language.split('-')[0].toLowerCase()));
 if(voice)utterance.voice=voice;
 utterance.onend=()=>{activeUtterance=null;onEnd?.()};
 utterance.onerror=()=>{activeUtterance=null;onEnd?.()};
 activeUtterance=utterance;
 window.speechSynthesis.speak(utterance);
}
