import { isTauri } from './utils';

export async function backendRequest<T=unknown>(method:string, params:Record<string,unknown>={}):Promise<T>{
  if(!isTauri()) throw new Error('Backend Tauri no disponible');
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>('backend_request',{payload:{id:crypto.randomUUID(),method,params}});
}


export type ShowcaseSnapshot<TNote=unknown,TWidget=unknown>={note:TNote;widget:TWidget};

export async function createShowcaseWindow(noteId:string,widgetId:string,noteSnapshot:unknown,widgetSnapshot:unknown){
 if(!isTauri()){
  sessionStorage.setItem(`chibi-showcase:${widgetId}`,JSON.stringify({note:noteSnapshot,widget:widgetSnapshot}));
  return window.open(`/?view=showcase&note_id=${encodeURIComponent(noteId)}&widget_id=${encodeURIComponent(widgetId)}`,'_blank','width=432,height=768,resizable=yes');
 }
 const {invoke}=await import('@tauri-apps/api/core');
 return invoke('create_showcase_window',{noteId,widgetId,noteSnapshot,widgetSnapshot,width:432,height:768});
}

export async function getShowcaseSnapshot<TNote=unknown,TWidget=unknown>(widgetId:string):Promise<ShowcaseSnapshot<TNote,TWidget>>{
 if(!isTauri()){
  const raw=sessionStorage.getItem(`chibi-showcase:${widgetId}`);
  if(!raw)throw new Error('La información de la nota visual no está disponible.');
  return JSON.parse(raw) as ShowcaseSnapshot<TNote,TWidget>;
 }
 const {invoke}=await import('@tauri-apps/api/core');
 return invoke<ShowcaseSnapshot<TNote,TWidget>>('get_showcase_snapshot',{widgetId});
}

export async function createWidgetWindow(noteId:string,width=400,height=460,minWidth=300,minHeight=300){
  const widgetWidth=Math.min(460,Math.max(320,width));
  const widgetHeight=Math.min(520,Math.max(340,height));
  const widgetMinWidth=Math.min(widgetWidth,Math.max(260,minWidth));
  const widgetMinHeight=Math.min(widgetHeight,Math.max(260,minHeight));
  if(!isTauri()) return window.open(`/?view=widget&note_id=${noteId}`,'_blank',`width=${widgetWidth},height=${widgetHeight},resizable=yes`);
  const { invoke }=await import('@tauri-apps/api/core');
  return invoke('create_note_window',{noteId,width:widgetWidth,height:widgetHeight,minWidth:widgetMinWidth,minHeight:widgetMinHeight});
}

export async function resizeCurrentWindow(width:number,height:number,minWidth=300,minHeight=300){
  if(!isTauri()){
    try{window.resizeTo(width,height)}catch{ /* El navegador puede bloquear resizeTo. */ }
    return;
  }
  const [{getCurrentWindow},{LogicalSize}]=await Promise.all([
    import('@tauri-apps/api/window'),
    import('@tauri-apps/api/dpi')
  ]);
  const current=getCurrentWindow();
  await current.setMinSize(new LogicalSize(minWidth,minHeight));
  await current.setSize(new LogicalSize(width,height));
}

export async function setWindowAlwaysOnTop(value:boolean){
  if(!isTauri()) return;
  const { getCurrentWindow }=await import('@tauri-apps/api/window');
  await getCurrentWindow().setAlwaysOnTop(value);
}

async function currentWindowAction(action:'minimize'|'toggle-maximize'|'close'|'drag'){
  if(!isTauri()){
    if(action==='close') window.close();
    return;
  }
  const {invoke}=await import('@tauri-apps/api/core');
  await invoke('window_action',{action});
}

export async function minimizeCurrentWindow(){
  await currentWindowAction('minimize');
}

export async function toggleMaximizeCurrentWindow(){
  await currentWindowAction('toggle-maximize');
}

export async function closeCurrentWindow(){
  await currentWindowAction('close');
}

export async function startCurrentWindowDragging(){
  await currentWindowAction('drag');
}

export async function openNoteResource(kind:'file'|'web',value:string){
  const target=value.trim();
  if(!target)throw new Error(kind==='web'?'El enlace está vacío.':'La ubicación del archivo está vacía.');
  if(!isTauri()){
    if(kind==='web')window.open(target,'_blank','noopener,noreferrer');
    else await navigator.clipboard.writeText(target);
    return;
  }
  const {invoke}=await import('@tauri-apps/api/core');
  await invoke('open_note_resource',{kind,value:target});
}
