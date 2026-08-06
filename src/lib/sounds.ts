import type { SoundSettings } from '../types';

export type SoundCue='achievement'|'close'|'click'|'delete'|'detailIn'|'detailOut'|'hover'|'launch'|'message'|'misc'|'modalOpen'|'modalClose'|'navigation'|'sideOpen'|'sideClose'|'sliderDown'|'sliderUp'|'startup'|'firstStartup'|'tab'|'toast'|'toggleOn'|'toggleOff';

const SOURCES:Record<SoundCue,string>={
 achievement:'/assets/sounds/achievement-toast.mp3',
 close:'/assets/sounds/bumper-end-02.mp3',
 click:'/assets/sounds/default-activation.mp3',
 delete:'/assets/sounds/bumper-end.mp3',
 detailIn:'/assets/sounds/into-game-detail.mp3',
 detailOut:'/assets/sounds/out-of-game-detail.mp3',
 hover:'/assets/sounds/navigation.mp3',
 launch:'/assets/sounds/launch-game.mp3',
 message:'/assets/sounds/message-toast.mp3',
 misc:'/assets/sounds/misc-10.mp3',
 // No se utiliza show-modal.mp3: la apertura de paneles usa una transición breve y menos intrusiva.
 modalOpen:'/assets/sounds/into-game-detail.mp3',
 modalClose:'/assets/sounds/hide-modal.mp3',
 navigation:'/assets/sounds/navigation.mp3',
 sideOpen:'/assets/sounds/side-menu-fly-in.mp3',
 sideClose:'/assets/sounds/side-menu-fly-out.mp3',
 sliderDown:'/assets/sounds/slider-down.mp3',
 sliderUp:'/assets/sounds/slider-up.mp3',
 startup:'/assets/sounds/startup.mp3',
 firstStartup:'/assets/sounds/first-startup.mp3',
 tab:'/assets/sounds/tab-transition-01.mp3',
 toast:'/assets/sounds/toast.mp3',
 toggleOn:'/assets/sounds/switch-toggle-on.mp3',
 toggleOff:'/assets/sounds/switch-toggle-off.mp3'
};
const MULTIPLIER:Partial<Record<SoundCue,number>>={hover:.28,navigation:.42,tab:.48,click:.58,sliderDown:.38,sliderUp:.38,firstStartup:.72,startup:.62};
let settings:SoundSettings={enabled:true,volume:.58,hover:true,typing:false,startup:true,notifications:true};
let hoverAt=0;let sliderValue=new WeakMap<HTMLInputElement,number>();

export function configureSounds(next:SoundSettings){settings={...next,typing:false};}
export function playSound(cue:SoundCue,force=false){
 if(!settings.enabled&&!force)return;
 if(cue==='hover'&&!settings.hover)return;
 if((cue==='toast'||cue==='message'||cue==='achievement')&&!settings.notifications)return;
 const now=performance.now();
 if(cue==='hover'&&now-hoverAt<75)return;
 if(cue==='hover')hoverAt=now;
 try{const audio=new Audio(SOURCES[cue]);audio.preload='auto';audio.volume=Math.max(0,Math.min(1,settings.volume*(MULTIPLIER[cue]??1)));void audio.play().catch(()=>undefined);}catch{return;}
}
export function playStartupSound(){
 if(!settings.enabled||!settings.startup)return;
 const first=!localStorage.getItem('chibi-notes-started');
 localStorage.setItem('chibi-notes-started','1');
 playSound(first?'firstStartup':'startup');
}
export function installGlobalSoundEffects(){
 const onPointer=(event:PointerEvent)=>{const target=(event.target as Element|null)?.closest('button,[role="button"],.clickable');if(!target||target.closest('[data-sound-disabled="true"]'))return;const related=event.relatedTarget as Node|null;if(related&&target.contains(related))return;const requested=(target as HTMLElement).dataset.sound;if(requested==='silent')return;playSound(requested as SoundCue||'hover');};
 const onClick=(event:MouseEvent)=>{const target=(event.target as Element|null)?.closest('button,[role="button"]') as HTMLElement|null;if(!target||target.hasAttribute('disabled')||target.closest('[data-sound-disabled="true"]'))return;const requested=target.dataset.sound;if(requested==='silent')return;playSound((requested as SoundCue)||'click');};
 const onInput=(event:Event)=>{const input=event.target as HTMLInputElement;if(input?.type!=='range')return;const value=Number(input.value);const previous=sliderValue.get(input)??value;playSound(value>=previous?'sliderUp':'sliderDown');sliderValue.set(input,value);};
 document.addEventListener('pointerover',onPointer);document.addEventListener('click',onClick);document.addEventListener('input',onInput);
 return()=>{document.removeEventListener('pointerover',onPointer);document.removeEventListener('click',onClick);document.removeEventListener('input',onInput);};
}
