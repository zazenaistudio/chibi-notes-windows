import { useEffect } from 'react';
import { APP_STORAGE_KEY, useAppStore } from '../store/useAppStore';
import { SHOWCASE_STORAGE_KEY, useShowcaseStore } from '../store/useShowcaseStore';

type SyncScope='app'|'showcase';
type SyncMessage={source:string;scope:SyncScope};

const CHANNEL_NAME='chibi-notes-cross-window-v1';

/**
 * Mantiene sincronizados los stores de Zustand entre el dashboard y las
 * ventanas Tauri independientes. localStorage es compartido, pero cada
 * WebView conserva su propia copia en memoria; sin esta capa una ventana
 * antigua podía sobrescribir el fondo, la mascota o los recursos guardados
 * por otra al volver a abrir un widget.
 */
export function CrossWindowSyncRuntime(){
 useEffect(()=>{
  const source=crypto.randomUUID();
  const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel(CHANNEL_NAME):null;
  let applyingApp=false;
  let applyingShowcase=false;
  let appBroadcastTimer:number|undefined;
  let showcaseBroadcastTimer:number|undefined;
  let appHydrateTimer:number|undefined;
  let showcaseHydrateTimer:number|undefined;

  const broadcast=(scope:SyncScope)=>{
   if((scope==='app'&&applyingApp)||(scope==='showcase'&&applyingShowcase))return;
   const existing=scope==='app'?appBroadcastTimer:showcaseBroadcastTimer;
   window.clearTimeout(existing);
   const timer=window.setTimeout(()=>channel?.postMessage({source,scope} satisfies SyncMessage),40);
   if(scope==='app')appBroadcastTimer=timer;else showcaseBroadcastTimer=timer;
  };

  const rehydrate=async(scope:SyncScope)=>{
   if(scope==='app'){
    applyingApp=true;
    try{await useAppStore.persist.rehydrate()}finally{queueMicrotask(()=>{applyingApp=false})}
    return;
   }
   applyingShowcase=true;
   try{await useShowcaseStore.persist.rehydrate()}finally{queueMicrotask(()=>{applyingShowcase=false})}
  };

  const scheduleHydrate=(scope:SyncScope)=>{
   const existing=scope==='app'?appHydrateTimer:showcaseHydrateTimer;
   window.clearTimeout(existing);
   const timer=window.setTimeout(()=>void rehydrate(scope),25);
   if(scope==='app')appHydrateTimer=timer;else showcaseHydrateTimer=timer;
  };

  const unsubscribeApp=useAppStore.subscribe(()=>broadcast('app'));
  const unsubscribeShowcase=useShowcaseStore.subscribe(()=>broadcast('showcase'));
  const onStorage=(event:StorageEvent)=>{
   if(event.key===APP_STORAGE_KEY)scheduleHydrate('app');
   if(event.key===SHOWCASE_STORAGE_KEY)scheduleHydrate('showcase');
  };
  const onMessage=(event:MessageEvent<SyncMessage>)=>{
   if(!event.data||event.data.source===source)return;
   if(event.data.scope==='app'||event.data.scope==='showcase')scheduleHydrate(event.data.scope);
  };

  window.addEventListener('storage',onStorage);
  if(channel)channel.onmessage=onMessage;
  return()=>{
   unsubscribeApp();
   unsubscribeShowcase();
   window.removeEventListener('storage',onStorage);
   window.clearTimeout(appBroadcastTimer);
   window.clearTimeout(showcaseBroadcastTimer);
   window.clearTimeout(appHydrateTimer);
   window.clearTimeout(showcaseHydrateTimer);
   channel?.close();
  };
 },[]);
 return null;
}
