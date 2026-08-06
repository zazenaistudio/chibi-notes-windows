import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ShowcaseWidgetSettings, WidgetBackground } from '../types';

const now=()=>new Date().toISOString();
const uid=()=>`showcase-${Date.now().toString(36)}-${crypto.randomUUID()}`;

export const SHOWCASE_STORAGE_KEY='chibi-notes-visual-widgets-v1';

export const SHOWCASE_SIZE_PRESETS={
 small:{width:360,height:640,label:'Pequeña'},
 medium:{width:432,height:768,label:'Mediana'},
 large:{width:486,height:864,label:'Grande'}
} as const;

export const createShowcaseDefaults=(noteId:string,backgroundId:string,mascotId:string):ShowcaseWidgetSettings=>({
 id:uid(),noteId,backgroundId,mascotId,createdAt:now(),updatedAt:now(),
 sizePreset:'medium',alwaysOnTop:false,cornerRadius:34,
 backgroundZoom:100,backgroundPositionX:50,backgroundPositionY:50,overlay:4,
 glassOpacity:58,glassBlur:16,glassBorderOpacity:72,
 titleSize:25,bodySize:16,textAlign:'left',showTitle:true,showBody:true,showChecklist:true,
 mascotCorner:'top-right',mascotSize:132,mascotOffsetX:13,mascotOffsetY:-18,mascotOpacity:100,mascotFlip:false,mascotAnimation:'float',
 controlsOnHover:true
});

const clonePreset=(preset:ShowcaseWidgetSettings,noteId:string):ShowcaseWidgetSettings=>({
 ...preset,
 id:uid(),
 noteId,
 createdAt:now(),
 updatedAt:now(),
});

type State={
 widgets:ShowcaseWidgetSettings[];
 presets:Record<string,ShowcaseWidgetSettings>;
 customBackgrounds:WidgetBackground[];
 createWidget:(noteId:string,backgroundId:string,mascotId:string)=>string;
 updateWidget:(id:string,patch:Partial<ShowcaseWidgetSettings>)=>void;
 removeWidget:(id:string)=>void;
 ensureWidget:(id:string,noteId:string,backgroundId:string,mascotId:string)=>void;
 addCustomBackground:(background:WidgetBackground)=>void;
 removeCustomBackground:(id:string)=>void;
};

type PersistedShowcaseState=Pick<State,'presets'|'customBackgrounds'>;

export const useShowcaseStore=create<State>()(persist((set,get)=>({
 widgets:[],
 presets:{},
 customBackgrounds:[],
 createWidget:(noteId,backgroundId,mascotId)=>{
  const preset=get().presets[noteId];
  const widget=preset?clonePreset(preset,noteId):createShowcaseDefaults(noteId,backgroundId,mascotId);
  set(state=>({widgets:[...state.widgets.filter(item=>item.id!==widget.id),widget]}));
  return widget.id;
 },
 updateWidget:(id,patch)=>set(state=>{
  let updated:ShowcaseWidgetSettings|undefined;
  const widgets=state.widgets.map(widget=>{
   if(widget.id!==id)return widget;
   updated={...widget,...patch,id:widget.id,noteId:widget.noteId,updatedAt:now()};
   return updated;
  });
  if(!updated)return state;
  return {widgets,presets:{...state.presets,[updated.noteId]:{...updated}}};
 }),
 removeWidget:id=>set(state=>({widgets:state.widgets.filter(widget=>widget.id!==id)})),
 ensureWidget:(id,noteId,backgroundId,mascotId)=>{
  if(get().widgets.some(widget=>widget.id===id))return;
  const preset=get().presets[noteId];
  const widget=preset?{...clonePreset(preset,noteId),id}:{...createShowcaseDefaults(noteId,backgroundId,mascotId),id};
  set(state=>({widgets:[...state.widgets,widget]}));
 },
 addCustomBackground:background=>set(state=>({
  customBackgrounds:[background,...state.customBackgrounds.filter(item=>item.id!==background.id)]
 })),
 removeCustomBackground:id=>set(state=>({
  customBackgrounds:state.customBackgrounds.filter(item=>item.id!==id),
  widgets:state.widgets.map(widget=>widget.backgroundId===id?{...widget,backgroundId:'',updatedAt:now()}:widget),
  presets:Object.fromEntries(Object.entries(state.presets).map(([noteId,preset])=>[noteId,preset.backgroundId===id?{...preset,backgroundId:'',updatedAt:now()}:preset]))
 }))
}),{
 name:SHOWCASE_STORAGE_KEY,
 version:4,
 migrate:persisted=>{
  const state=persisted as Partial<State>;
  const widgets=state.widgets||[];
  const presets={...(state.presets||{})};
  for(const widget of widgets){
   const current=presets[widget.noteId];
   if(!current||widget.updatedAt.localeCompare(current.updatedAt)>0)presets[widget.noteId]={...widget};
  }
  return {presets,customBackgrounds:state.customBackgrounds||[]} satisfies PersistedShowcaseState;
 },
 // Las ventanas visuales son efímeras. Solo se guardan el preset de cada nota y
 // los fondos importados. Omitir `widgets` evita que una rehidratación entre
 // ventanas elimine el widget que está abierto en ese momento.
 partialize:state=>({presets:state.presets,customBackgrounds:state.customBackgrounds}),
 merge:(persisted,current)=>{
  const saved=persisted as Partial<PersistedShowcaseState>;
  return {
   ...current,
   presets:saved.presets||current.presets,
   customBackgrounds:saved.customBackgrounds||current.customBackgrounds,
   widgets:current.widgets,
  };
 }
}));
