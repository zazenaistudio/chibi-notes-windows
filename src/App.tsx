import { useEffect } from 'react';
import { ManagerApp } from './components/ManagerApp';
import { WidgetApp } from './components/WidgetApp';
import { ShowcaseWidgetApp } from './components/ShowcaseWidgetApp';
import { configureSounds, installGlobalSoundEffects, playStartupSound } from './lib/sounds';
import { useAppStore } from './store/useAppStore';
import { I18nRuntime } from './i18n';
import { DictationHost } from './components/DictationDialog';
import { ConfirmDialogHost } from './components/ConfirmDialog';
import { ReminderRuntime } from './components/ReminderRuntime';
import { CrossWindowSyncRuntime } from './components/CrossWindowSyncRuntime';

function InterfaceThemeRuntime(){
 const theme=useAppStore(state=>state.interfaceTheme);
 useEffect(()=>{
  const root=document.documentElement;
  const variables:Record<string,string>={
   '--ui-bg':theme.background,'--ui-surface':theme.surface,'--ui-surface-alt':theme.surfaceAlt,'--ui-primary':theme.primary,'--ui-secondary':theme.secondary,'--ui-accent':theme.accent,'--ui-text':theme.text,'--ui-muted':theme.muted,'--ui-button':theme.button,'--ui-button-hover':theme.buttonHover,'--ui-border':theme.border,'--ui-danger':theme.danger,'--ui-panel-opacity':String(theme.panelOpacity),'--ui-glow':`${theme.glow}px`
  };
  Object.entries(variables).forEach(([key,value])=>root.style.setProperty(key,value));
  root.dataset.chibiTheme=theme.darkMode?'dark':'light';
 },[theme]);
 return null;
}

function SoundRuntime({playStartup}:{playStartup:boolean}){
 const settings=useAppStore(state=>state.soundSettings);
 useEffect(()=>configureSounds(settings),[settings]);
 useEffect(()=>installGlobalSoundEffects(),[]);
 useEffect(()=>{if(!playStartup)return;const timer=window.setTimeout(()=>playStartupSound(),360);return()=>window.clearTimeout(timer)},[playStartup]);
 return null;
}
export default function App(){const view=new URLSearchParams(location.search).get('view');const widget=view==='widget';const showcase=view==='showcase';return <><CrossWindowSyncRuntime/><I18nRuntime/><InterfaceThemeRuntime/><ConfirmDialogHost/><DictationHost/><ReminderRuntime/><SoundRuntime playStartup={!widget&&!showcase}/>{showcase?<ShowcaseWidgetApp/>:widget?<WidgetApp/>:<ManagerApp/>}</>}
