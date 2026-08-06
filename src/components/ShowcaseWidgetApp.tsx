import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, Crop, Eye, EyeOff, GripHorizontal, Image, ImagePlus, LoaderCircle, Maximize2, PawPrint, Pin, Settings2, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { AssetItem, Note, ShowcaseMascotAnimation, ShowcaseMascotCorner, ShowcaseSizePreset, ShowcaseWidgetSettings, WidgetBackground } from '../types';
import { BUILTIN_MASCOTS, useAppStore } from '../store/useAppStore';
import { SHOWCASE_SIZE_PRESETS, useShowcaseStore } from '../store/useShowcaseStore';
import { closeCurrentWindow, getShowcaseSnapshot, resizeCurrentWindow, setWindowAlwaysOnTop, startCurrentWindowDragging } from '../lib/backend';
import { WIDGET_BACKGROUNDS } from '../lib/showcaseWidget';
import { NoteIcon } from './NoteIcon';
import { importWidgetBackground } from '../lib/widgetBackgroundImport';
import { importWidgetMascot } from '../lib/widgetMascotImport';

const animationFor=(name:ShowcaseMascotAnimation)=>name==='float'?{y:[0,-8,0],rotate:[0,1.5,0]}:name==='bounce'?{y:[0,-12,0]}:name==='wiggle'?{rotate:[-3,3,-3]}:name==='breathe'?{scale:[1,1.035,1]}:{};
const hexRgba=(hex:string,alpha:number)=>{const value=hex.replace('#','');const normalized=value.length===3?value.split('').map(char=>char+char).join(''):value;const number=Number.parseInt(normalized,16);return `rgba(${(number>>16)&255}, ${(number>>8)&255}, ${number&255}, ${alpha})`;};

type Tab='background'|'mascot'|'settings';
type ThemeGroup={id:string;name:string;description:string;preview:WidgetBackground};
type MascotPackGroup={id:string;name:string;preview:AssetItem;count:number};

declare global{
 interface Window{__CHIBI_SHOWCASE_SNAPSHOT__?:{note:Note;widget:ShowcaseWidgetSettings}}
}

export function ShowcaseWidgetApp(){
 const params=new URLSearchParams(location.search);
 const noteId=params.get('note_id')||'';
 const widgetId=params.get('widget_id')||'';
 const notes=useAppStore(state=>state.notes);
 const customMascots=useAppStore(state=>state.customMascots);
 const addMascot=useAppStore(state=>state.addMascot);
 const deleteAsset=useAppStore(state=>state.deleteAsset);
 const interfaceLanguage=useAppStore(state=>state.interfaceLanguage);
 const english=interfaceLanguage==='en';
 const widgets=useShowcaseStore(state=>state.widgets);
 const customBackgrounds=useShowcaseStore(state=>state.customBackgrounds);
 const updateWidget=useShowcaseStore(state=>state.updateWidget);
 const removeWidget=useShowcaseStore(state=>state.removeWidget);
 const addCustomBackground=useShowcaseStore(state=>state.addCustomBackground);
 const removeCustomBackground=useShowcaseStore(state=>state.removeCustomBackground);
 const allBackgrounds=useMemo(()=>[...customBackgrounds,...WIDGET_BACKGROUNDS],[customBackgrounds]);
 const [snapshot,setSnapshot]=useState<{note:Note;widget:ShowcaseWidgetSettings}|null>(()=>window.__CHIBI_SHOWCASE_SNAPSHOT__||null);
 const [loadError,setLoadError]=useState('');
 const storedNote=notes.find(item=>item.id===noteId);
 const storedWidget=widgets.find(item=>item.id===widgetId);
 const note=storedNote||snapshot?.note;
 const widget=storedWidget||snapshot?.widget;
 const allMascots=useMemo(()=>[...BUILTIN_MASCOTS,...customMascots],[customMascots]);
 const fallbackMascot=allMascots.find(item=>item.id===note?.assignedMascotId)||allMascots[0];
 const fallbackBackground=allBackgrounds.find(item=>item.themeId===fallbackMascot?.packId)||allBackgrounds[0];
 const [settingsOpen,setSettingsOpen]=useState(false);
 const [tab,setTab]=useState<Tab>('background');
 const [themeId,setThemeId]=useState(widget?allBackgrounds.find(item=>item.id===widget.backgroundId)?.themeId||'pastel-kawaii':fallbackBackground?.themeId||'pastel-kawaii');
 const [packId,setPackId]=useState(widget?allMascots.find(item=>item.id===widget.mascotId)?.packId||'pastel-kawaii':fallbackMascot?.packId||'pastel-kawaii');
 const [importingBackground,setImportingBackground]=useState(false);
 const [backgroundImportError,setBackgroundImportError]=useState('');
 const [importingMascot,setImportingMascot]=useState(false);
 const [mascotImportError,setMascotImportError]=useState('');
 const backgroundFileInputRef=useRef<HTMLInputElement>(null);
 const mascotFileInputRef=useRef<HTMLInputElement>(null);

 useEffect(()=>{
  const initial=snapshot?.widget;
  if(!initial)return;
  useShowcaseStore.setState(state=>state.widgets.some(item=>item.id===initial.id)?state:{...state,widgets:[...state.widgets,initial]});
 },[snapshot?.widget]);

 useEffect(()=>{
  if(!widgetId)return;
  let cancelled=false;
  void getShowcaseSnapshot<Note,ShowcaseWidgetSettings>(widgetId).then(value=>{
   if(cancelled)return;
   setSnapshot(value);
   useShowcaseStore.setState(state=>state.widgets.some(item=>item.id===value.widget.id)?state:{...state,widgets:[...state.widgets,value.widget]});
  }).catch(error=>{if(!cancelled)setLoadError(error instanceof Error?error.message:'No se pudo cargar la nota visual.')});
  return()=>{cancelled=true};
 },[widgetId]);

 useEffect(()=>{
  document.body.classList.add('showcase-body');
  document.documentElement.classList.add('showcase-html');
  // La mezcla del store visual conserva el widget activo y recupera únicamente
  // presets y fondos persistentes. CrossWindowSyncRuntime mantiene las demás
  // ventanas actualizadas sin recurrir a sondeos que puedan restaurar datos viejos.
  void Promise.all([useAppStore.persist.rehydrate(),useShowcaseStore.persist.rehydrate()]);
  return()=>{document.body.classList.remove('showcase-body');document.documentElement.classList.remove('showcase-html')};
 },[]);

 const activeWidget=widgets.find(item=>item.id===widgetId)||widget;
 const background=allBackgrounds.find(item=>item.id===activeWidget?.backgroundId)||fallbackBackground;
 const mascot=allMascots.find(item=>item.id===activeWidget?.mascotId)||fallbackMascot;
 const themeGroups=useMemo<ThemeGroup[]>(()=>{const groups:ThemeGroup[]=[];for(const item of allBackgrounds)if(!groups.some(group=>group.id===item.themeId))groups.push({id:item.themeId,name:item.themeName,description:item.themeDescription,preview:item});return groups},[allBackgrounds]);
 const packGroups=useMemo<MascotPackGroup[]>(()=>{const groups:MascotPackGroup[]=[];for(const item of allMascots){const id=item.packId||'custom';const existing=groups.find(group=>group.id===id);if(existing)existing.count+=1;else groups.push({id,name:item.packName||item.category||'Personalizadas',preview:item,count:1})}return groups},[allMascots]);
 const themeBackgrounds=allBackgrounds.filter(item=>item.themeId===themeId);
 const packMascots=allMascots.filter(item=>(item.packId||'custom')===packId);

 if(!note||!activeWidget||!background)return <div className="showcase-empty"><img src="/assets/branding/chibi-notes.png" alt=""/><b>{loadError?'No se pudo abrir la nota visual':'Preparando la nota visual…'}</b><p>{loadError||'Estamos cargando el fondo, la mascota y el contenido de esta nota.'}</p><button onClick={()=>void closeCurrentWindow()}>Cerrar ventana</button></div>;

 const palette=background.palette;
 const style={
  '--visual-bg':`url("${background.src}")`,'--visual-bg-color':palette.background,'--visual-surface':palette.surface,'--visual-primary':palette.primary,'--visual-secondary':palette.secondary,
  '--visual-text':palette.text,'--visual-muted':palette.muted,'--visual-border':hexRgba(palette.border,activeWidget.glassBorderOpacity/100),
  '--visual-shadow':hexRgba(palette.shadow,.26),'--visual-glass':hexRgba(palette.surface,activeWidget.glassOpacity/100),'--visual-glass-strong':palette.glassStrong,
  '--visual-overlay':hexRgba(palette.surface,activeWidget.overlay/100),'--visual-radius':`${activeWidget.cornerRadius}px`,
  '--visual-blur':`${activeWidget.glassBlur}px`,'--visual-title-size':`${activeWidget.titleSize}px`,'--visual-body-size':`${activeWidget.bodySize}px`,
  '--visual-bg-size':`${activeWidget.backgroundZoom}%`,'--visual-bg-position':`${activeWidget.backgroundPositionX}% ${activeWidget.backgroundPositionY}%`
 } as CSSProperties;
 const mascotPosition:CSSProperties=activeWidget.mascotCorner==='top-left'?{left:activeWidget.mascotOffsetX,top:activeWidget.mascotOffsetY}:activeWidget.mascotCorner==='top-right'?{right:activeWidget.mascotOffsetX,top:activeWidget.mascotOffsetY}:activeWidget.mascotCorner==='bottom-left'?{left:activeWidget.mascotOffsetX,bottom:activeWidget.mascotOffsetY}: {right:activeWidget.mascotOffsetX,bottom:activeWidget.mascotOffsetY};
 const completed=note.items.filter(item=>item.done).length;
 const update=(patch:Parameters<typeof updateWidget>[1])=>updateWidget(activeWidget.id,patch);
 const chooseBackground=(item:WidgetBackground)=>{update({backgroundId:item.id});setThemeId(item.themeId)};
 const importBackground=async(file?:File)=>{
  if(!file)return;
  setImportingBackground(true);
  setBackgroundImportError('');
  try{
   const imported=await importWidgetBackground(file,interfaceLanguage);
   addCustomBackground(imported);
   chooseBackground(imported);
   setThemeId(imported.themeId);
  }catch(error){
   setBackgroundImportError(error instanceof Error?error.message:'No se pudo importar el fondo.');
  }finally{
   setImportingBackground(false);
   if(backgroundFileInputRef.current)backgroundFileInputRef.current.value='';
  }
 };
 const deleteCustomBackground=(item:WidgetBackground)=>{
  if(!window.confirm(english?`Delete “${item.name}” from your custom backgrounds?`:`¿Eliminar “${item.name}” de tus fondos personalizados?`))return;
  const remaining=customBackgrounds.filter(backgroundItem=>backgroundItem.id!==item.id);
  removeCustomBackground(item.id);
  if(activeWidget.backgroundId===item.id){
   const replacement=remaining[0]||WIDGET_BACKGROUNDS[0];
   if(replacement)chooseBackground(replacement);
  }
 };
 const chooseMascot=(item:AssetItem)=>{update({mascotId:item.id});setPackId(item.packId||'custom')};
 const importMascot=async(file?:File)=>{
  if(!file)return;
  setImportingMascot(true);
  setMascotImportError('');
  try{
   const imported=await importWidgetMascot(file,interfaceLanguage);
   addMascot(imported);
   chooseMascot(imported);
   setPackId(imported.packId||'custom-widget-mascots');
  }catch(error){
   setMascotImportError(error instanceof Error?error.message:(english?'The mascot could not be imported.':'No se pudo importar la mascota.'));
  }finally{
   setImportingMascot(false);
   if(mascotFileInputRef.current)mascotFileInputRef.current.value='';
  }
 };
 const deleteCustomMascot=(item:AssetItem)=>{
  if(item.builtin!==false)return;
  if(!window.confirm(english?`Delete “${item.name}” from your custom mascots?`:`¿Eliminar “${item.name}” de tus mascotas personalizadas?`))return;
  deleteAsset('mascot',item.id);
  if(activeWidget.mascotId===item.id){const replacement=BUILTIN_MASCOTS[0];if(replacement)chooseMascot(replacement)}
 };
 const close=async()=>{removeWidget(activeWidget.id);await closeCurrentWindow()};
 const toggleAlwaysOnTop=async()=>{const next=!activeWidget.alwaysOnTop;update({alwaysOnTop:next});await setWindowAlwaysOnTop(next)};
 const setSize=async(size:ShowcaseSizePreset)=>{const preset=SHOWCASE_SIZE_PRESETS[size];update({sizePreset:size});await resizeCurrentWindow(preset.width,preset.height,preset.width,preset.height)};

 return <div className={`showcase-window ${activeWidget.controlsOnHover?'controls-on-hover':''}`} style={style} data-sound-disabled="true">
  <motion.div className="showcase-drag-zone" onMouseDown={event=>{if(event.button===0){event.preventDefault();void startCurrentWindowDragging()}}} whileHover={{opacity:1}}><GripHorizontal/></motion.div>
  <div className="showcase-window-controls">
   <motion.button data-sound="silent" title={activeWidget.alwaysOnTop?'Dejar de mantener visible':'Mantener siempre visible'} className={activeWidget.alwaysOnTop?'active':''} onClick={()=>void toggleAlwaysOnTop()} whileHover={{scale:1.08,y:-1}} whileTap={{scale:.88}}><Pin/></motion.button>
   <motion.button data-sound="silent" title="Personalizar esta ventana" className={settingsOpen?'active':''} onClick={()=>setSettingsOpen(true)} whileHover={{scale:1.08,rotate:6}} whileTap={{scale:.88}}><Settings2/></motion.button>
   <motion.button data-sound="silent" title="Cerrar esta ventana" onClick={()=>void close()} whileHover={{scale:1.08}} whileTap={{scale:.88}}><X/></motion.button>
  </div>
  <motion.section className="showcase-card" initial={{opacity:0,scale:.96,y:12}} animate={{opacity:1,scale:1,y:0}} transition={{type:'spring',stiffness:240,damping:26}}>
   <span className="showcase-background" aria-hidden="true"><img className="showcase-background-image" src={background.src} alt="" draggable={false} style={{transform:`scale(${activeWidget.backgroundZoom/100})`,objectPosition:`${activeWidget.backgroundPositionX}% ${activeWidget.backgroundPositionY}%`}}/></span><span className="showcase-overlay" aria-hidden="true"/>
   {mascot&&<motion.div className={`showcase-mascot mascot-${activeWidget.mascotAnimation}`} style={{...mascotPosition,width:activeWidget.mascotSize,opacity:activeWidget.mascotOpacity/100}} initial={{opacity:0,scale:.5,y:12}} animate={{opacity:activeWidget.mascotOpacity/100,scale:1,y:0}} whileHover={{scale:1.08,y:-5,rotate:2}} transition={{type:'spring',stiffness:260,damping:20}}><motion.img src={mascot.src} alt="" draggable={false} style={{transform:`scaleX(${activeWidget.mascotFlip?-1:1})`}} animate={animationFor(activeWidget.mascotAnimation)} transition={activeWidget.mascotAnimation==='none'?{duration:0}:{duration:3,repeat:Infinity,ease:'easeInOut'}}/></motion.div>}
   <motion.article className="showcase-note-glass" style={{textAlign:activeWidget.textAlign}} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.08,duration:.28}}>
    {activeWidget.showTitle&&<header><span className="showcase-note-icon"><NoteIcon value={note.icon||'📝'}/></span><h1>{note.title||'Sin título'}</h1></header>}
    {activeWidget.showBody&&<div className="showcase-note-body" dangerouslySetInnerHTML={{__html:note.body||'<p>Esta nota todavía no tiene texto.</p>'}}/>}
    {activeWidget.showChecklist&&note.items.length>0&&<div className="showcase-checklist">{note.items.map(item=><div key={item.id} className={item.done?'done':''}><span>{item.done?<Check/>:null}</span><p>{item.text||'Tarea sin nombre'}</p></div>)}</div>}
    {note.items.length>0&&<small className="showcase-progress">{completed}/{note.items.length} completadas</small>}
   </motion.article>
  </motion.section>

  <AnimatePresence>{settingsOpen&&<motion.aside className="showcase-settings" initial={{opacity:0,scale:.98,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.98,y:12}} transition={{duration:.2}}>
   <header className="showcase-settings-header"><button data-sound="silent" onClick={()=>setSettingsOpen(false)}><ChevronLeft/></button><div><b>Diseño de la ventana</b><small>Los cambios solo afectan a esta nota visual.</small></div><button data-sound="silent" onClick={()=>setSettingsOpen(false)}><X/></button></header>
   <nav className="showcase-settings-tabs"><button className={tab==='background'?'active':''} onClick={()=>setTab('background')}><Image/><span>Fondo</span></button><button className={tab==='mascot'?'active':''} onClick={()=>setTab('mascot')}><PawPrint/><span>Mascota</span></button><button className={tab==='settings'?'active':''} onClick={()=>setTab('settings')}><SlidersHorizontal/><span>Ajustes</span></button></nav>
   <div className="showcase-settings-scroll">
    {tab==='background'&&<motion.div key="background" className="showcase-settings-section" initial={{opacity:0,x:12}} animate={{opacity:1,x:0}}>
     <input ref={backgroundFileInputRef} className="showcase-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/bmp,image/gif" onChange={event=>void importBackground(event.target.files?.[0])}/>
     <button className="showcase-import-background" disabled={importingBackground} onClick={()=>backgroundFileInputRef.current?.click()}>
      <span className="showcase-import-icon">{importingBackground?<LoaderCircle className="spinning"/>:<ImagePlus/>}</span>
      <span><b>{importingBackground?(english?'Preparing background…':'Preparando fondo…'):(english?'Import custom background':'Importar fondo personalizado')}</b><small>{english?'Choose an image from your computer. It will be centered, cropped and optimized automatically to 9:16.':'Elige una imagen del equipo. Se centrará, recortará y optimizará automáticamente a 9:16.'}</small></span>
      <i><Crop/>720 × 1280</i>
     </button>
     {backgroundImportError&&<p className="showcase-import-error">{backgroundImportError}</p>}
     {customBackgrounds.length>0&&<div className="showcase-custom-summary"><b>{english?'My backgrounds':'Mis fondos'}</b><small>{customBackgrounds.length} {english?(customBackgrounds.length===1?'imported':'imported'):`importado${customBackgrounds.length===1?'':'s'}`} · {english?'saved for future visual notes':'guardados para futuras notas visuales'}</small></div>}
     <div className="showcase-section-title"><b>Temas</b><small>Elige una colección y después un fondo vertical.</small></div>
     <div className="showcase-theme-grid">{themeGroups.map(group=><button key={group.id} className={themeId===group.id?'selected':''} onClick={()=>setThemeId(group.id)}><img src={group.preview.src} alt="" loading="lazy"/><span><b>{group.name}</b><small>{allBackgrounds.filter(item=>item.themeId===group.id).length} fondos</small></span></button>)}</div>
     <div className="showcase-section-title inline"><b>{themeGroups.find(item=>item.id===themeId)?.name}</b><small>9:16</small></div>
     <div className="showcase-background-grid">{themeBackgrounds.map(item=><div key={item.id} className={`showcase-background-option ${activeWidget.backgroundId===item.id?'selected':''}`}>
      <button className="showcase-background-choice" onClick={()=>chooseBackground(item)} title={item.name}><img src={item.src} alt={item.name} loading="lazy"/>{activeWidget.backgroundId===item.id&&<i><Check/></i>}</button>
      {item.builtin===false&&<button className="showcase-background-delete" title={english?'Delete custom background':'Eliminar fondo personalizado'} onClick={()=>deleteCustomBackground(item)}><Trash2/></button>}
      {item.builtin===false&&<small>{item.name}</small>}
     </div>)}</div>
     <div className="showcase-control-grid"><label><span>Zoom <b>{activeWidget.backgroundZoom}%</b></span><input type="range" min="100" max="150" value={activeWidget.backgroundZoom} onChange={event=>update({backgroundZoom:Number(event.target.value)})}/></label><label><span>Capa de lectura <b>{activeWidget.overlay}%</b></span><input type="range" min="0" max="36" value={activeWidget.overlay} onChange={event=>update({overlay:Number(event.target.value)})}/></label><label><span>Posición X <b>{activeWidget.backgroundPositionX}%</b></span><input type="range" min="0" max="100" value={activeWidget.backgroundPositionX} onChange={event=>update({backgroundPositionX:Number(event.target.value)})}/></label><label><span>Posición Y <b>{activeWidget.backgroundPositionY}%</b></span><input type="range" min="0" max="100" value={activeWidget.backgroundPositionY} onChange={event=>update({backgroundPositionY:Number(event.target.value)})}/></label></div>
    </motion.div>}
    {tab==='mascot'&&<motion.div key="mascot" className="showcase-settings-section" initial={{opacity:0,x:12}} animate={{opacity:1,x:0}}>
     <input ref={mascotFileInputRef} className="showcase-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/bmp,image/gif" onChange={event=>void importMascot(event.target.files?.[0])}/>
     <button className="showcase-import-background showcase-import-mascot" disabled={importingMascot} onClick={()=>mascotFileInputRef.current?.click()}>
      <span className="showcase-import-icon">{importingMascot?<LoaderCircle className="spinning"/>:<PawPrint/>}</span>
      <span><b>{importingMascot?(english?'Preparing mascot…':'Preparando mascota…'):(english?'Import custom mascot':'Importar mascota personalizada')}</b><small>{english?'Choose an image from your computer. It will be optimized and saved in My mascots.':'Elige una imagen del equipo. Se optimizará y guardará en Mis mascotas.'}</small></span>
      <i><ImagePlus/>{english?'Import':'Importar'}</i>
     </button>
     {mascotImportError&&<p className="showcase-import-error">{mascotImportError}</p>}
     {customMascots.length>0&&<div className="showcase-custom-summary"><b>{english?'My mascots':'Mis mascotas'}</b><small>{customMascots.length} {english?'saved for future visual notes':`guardada${customMascots.length===1?'':'s'} para futuras notas visuales`}</small></div>}
     <div className="showcase-section-title"><b>Packs de mascotas</b><small>La miniatura permite reconocer cada colección.</small></div>
     <div className="showcase-pack-grid">{packGroups.map(group=><button key={group.id} className={packId===group.id?'selected':''} onClick={()=>setPackId(group.id)}><img src={group.preview.src} alt="" loading="lazy"/><span><b>{group.name}</b><small>{group.count} mascotas</small></span></button>)}</div>
     <div className="showcase-section-title inline"><b>{packGroups.find(item=>item.id===packId)?.name}</b><small>{packMascots.length}</small></div>
     <div className="showcase-mascot-grid">{packMascots.map(item=><div key={item.id} className="showcase-mascot-option"><button className={activeWidget.mascotId===item.id?'selected':''} onClick={()=>chooseMascot(item)} title={item.name}><img src={item.src} alt={item.name} loading="lazy"/>{activeWidget.mascotId===item.id&&<i><Check/></i>}</button>{item.builtin===false&&<button className="showcase-mascot-delete" title={english?'Delete custom mascot':'Eliminar mascota personalizada'} onClick={()=>deleteCustomMascot(item)}><Trash2/></button>}</div>)}</div>
     <div className="showcase-control-grid"><label><span>Tamaño <b>{activeWidget.mascotSize}px</b></span><input type="range" min="72" max="210" value={activeWidget.mascotSize} onChange={event=>update({mascotSize:Number(event.target.value)})}/></label><label><span>Opacidad <b>{activeWidget.mascotOpacity}%</b></span><input type="range" min="20" max="100" value={activeWidget.mascotOpacity} onChange={event=>update({mascotOpacity:Number(event.target.value)})}/></label><label><span>Desplazamiento X <b>{activeWidget.mascotOffsetX}</b></span><input type="range" min="-60" max="80" value={activeWidget.mascotOffsetX} onChange={event=>update({mascotOffsetX:Number(event.target.value)})}/></label><label><span>Desplazamiento Y <b>{activeWidget.mascotOffsetY}</b></span><input type="range" min="-80" max="80" value={activeWidget.mascotOffsetY} onChange={event=>update({mascotOffsetY:Number(event.target.value)})}/></label></div>
     <div className="showcase-select-grid"><label><span>Esquina</span><select value={activeWidget.mascotCorner} onChange={event=>update({mascotCorner:event.target.value as ShowcaseMascotCorner})}><option value="top-left">Superior izquierda</option><option value="top-right">Superior derecha</option><option value="bottom-left">Inferior izquierda</option><option value="bottom-right">Inferior derecha</option></select></label><label><span>Animación</span><select value={activeWidget.mascotAnimation} onChange={event=>update({mascotAnimation:event.target.value as ShowcaseMascotAnimation})}><option value="float">Flotar</option><option value="bounce">Rebotar</option><option value="breathe">Respirar</option><option value="wiggle">Balancearse</option><option value="none">Sin animación</option></select></label></div>
     <button className={`showcase-toggle ${activeWidget.mascotFlip?'active':''}`} onClick={()=>update({mascotFlip:!activeWidget.mascotFlip})}><span>Reflejar mascota</span><i>{activeWidget.mascotFlip?<Eye/>:<EyeOff/>}</i></button>
    </motion.div>}
    {tab==='settings'&&<motion.div key="settings" className="showcase-settings-section" initial={{opacity:0,x:12}} animate={{opacity:1,x:0}}>
     <div className="showcase-section-title"><b>Tamaño 9:16</b><small>La ventana mantiene siempre su formato vertical.</small></div>
     <div className="showcase-size-grid">{(Object.keys(SHOWCASE_SIZE_PRESETS) as ShowcaseSizePreset[]).map(size=>{const preset=SHOWCASE_SIZE_PRESETS[size];return <button key={size} className={activeWidget.sizePreset===size?'selected':''} onClick={()=>void setSize(size)}><Maximize2/><b>{preset.label}</b><small>{preset.width} × {preset.height}</small></button>})}</div>
     <div className="showcase-control-grid"><label><span>Redondeado <b>{activeWidget.cornerRadius}px</b></span><input type="range" min="16" max="54" value={activeWidget.cornerRadius} onChange={event=>update({cornerRadius:Number(event.target.value)})}/></label><label><span>Vidrio <b>{activeWidget.glassOpacity}%</b></span><input type="range" min="18" max="92" value={activeWidget.glassOpacity} onChange={event=>update({glassOpacity:Number(event.target.value)})}/></label><label><span>Desenfoque <b>{activeWidget.glassBlur}px</b></span><input type="range" min="0" max="30" value={activeWidget.glassBlur} onChange={event=>update({glassBlur:Number(event.target.value)})}/></label><label><span>Borde de vidrio <b>{activeWidget.glassBorderOpacity}%</b></span><input type="range" min="0" max="100" value={activeWidget.glassBorderOpacity} onChange={event=>update({glassBorderOpacity:Number(event.target.value)})}/></label><label><span>Título <b>{activeWidget.titleSize}px</b></span><input type="range" min="18" max="38" value={activeWidget.titleSize} onChange={event=>update({titleSize:Number(event.target.value)})}/></label><label><span>Contenido <b>{activeWidget.bodySize}px</b></span><input type="range" min="12" max="24" value={activeWidget.bodySize} onChange={event=>update({bodySize:Number(event.target.value)})}/></label></div>
     <div className="showcase-select-grid"><label><span>Alineación</span><select value={activeWidget.textAlign} onChange={event=>update({textAlign:event.target.value as 'left'|'center'})}><option value="left">Izquierda</option><option value="center">Centrada</option></select></label></div>
     <div className="showcase-visibility-grid"><button className={activeWidget.showTitle?'active':''} onClick={()=>update({showTitle:!activeWidget.showTitle})}>{activeWidget.showTitle?<Eye/>:<EyeOff/>}<span>Título</span></button><button className={activeWidget.showBody?'active':''} onClick={()=>update({showBody:!activeWidget.showBody})}>{activeWidget.showBody?<Eye/>:<EyeOff/>}<span>Texto</span></button><button className={activeWidget.showChecklist?'active':''} onClick={()=>update({showChecklist:!activeWidget.showChecklist})}>{activeWidget.showChecklist?<Eye/>:<EyeOff/>}<span>Tareas</span></button></div>
     <button className={`showcase-toggle ${activeWidget.alwaysOnTop?'active':''}`} onClick={()=>void toggleAlwaysOnTop()}><span>Mantener siempre visible</span><i>{activeWidget.alwaysOnTop?<Pin/>:<Pin/>}</i></button><button className={`showcase-toggle ${activeWidget.controlsOnHover?'active':''}`} onClick={()=>update({controlsOnHover:!activeWidget.controlsOnHover})}><span>Ocultar controles hasta pasar el ratón</span><i>{activeWidget.controlsOnHover?<Eye/>:<EyeOff/>}</i></button>
    </motion.div>}
   </div>
  </motion.aside>}</AnimatePresence>
 </div>;
}
