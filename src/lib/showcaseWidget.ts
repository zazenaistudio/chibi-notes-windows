import widgetBackgroundsJson from '../data/widgetBackgrounds.generated.json';
import type { WidgetBackground } from '../types';
import { BUILTIN_MASCOTS, useAppStore } from '../store/useAppStore';
import { useShowcaseStore } from '../store/useShowcaseStore';
import { createShowcaseWindow } from './backend';

export const WIDGET_BACKGROUNDS=widgetBackgroundsJson as WidgetBackground[];

const normalizePack=(packId?:string)=>packId||'pastel-kawaii';

export async function openShowcaseWidget(noteId:string){
 // La ventana principal puede llevar tiempo abierta mientras otro WebView guarda
 // un preset. Rehidratar antes de crear evita sobrescribir esa personalización
 // con una copia antigua que aún estuviera en memoria.
 await useShowcaseStore.persist.rehydrate();
 const app=useAppStore.getState();
 const note=app.notes.find(item=>item.id===noteId);
 if(!note)throw new Error('La nota ya no existe.');
 const allMascots=[...BUILTIN_MASCOTS,...app.customMascots];
 const mascot=allMascots.find(item=>item.id===note.assignedMascotId)||allMascots[0];
 const preferredTheme=normalizePack(mascot?.packId);
 const background=WIDGET_BACKGROUNDS.find(item=>item.themeId===preferredTheme)||WIDGET_BACKGROUNDS[0];
 if(!background)throw new Error('No hay fondos visuales disponibles.');
 const widgetId=useShowcaseStore.getState().createWidget(note.id,background.id,mascot?.id||'');
 try{
  const widget=useShowcaseStore.getState().widgets.find(item=>item.id===widgetId);
  if(!widget)throw new Error('No se pudo preparar la configuración visual.');
  await createShowcaseWindow(note.id,widgetId,note,widget);
  return widgetId;
 }catch(error){
  useShowcaseStore.getState().removeWidget(widgetId);
  throw error;
 }
}
