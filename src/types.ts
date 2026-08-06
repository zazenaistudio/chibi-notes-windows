export type AppLanguage = 'es'|'en';
export type Corner = 'top-left'|'top-right'|'bottom-left'|'bottom-right';
export type IconStyle = 'rounded'|'outline'|'duotone'|'pixel'|'technical'|'candy'|'sticker'|'softglass';
export type TransitionStyle = 'spring'|'pop'|'fade'|'slide'|'jelly';
export type FrameStyle = 'none'|'solid'|'double'|'dotted'|'candy'|'holographic'|'aurora'|'neon'|'sticker'|'gold'|'stitched'|'glass'|'image';
export interface FramePreset { id:string; name:string; description:string; style:FrameStyle; category:string; }
export interface InterfaceThemeSettings { paletteId:string; background:string; surface:string; surfaceAlt:string; primary:string; secondary:string; accent:string; text:string; muted:string; button:string; buttonHover:string; border:string; danger:string; panelOpacity:number; glow:number; darkMode:boolean; }
export interface InterfacePalette { id:string; name:string; description:string; colors:InterfaceThemeSettings; }
export interface SoundSettings { enabled:boolean; volume:number; hover:boolean; typing:boolean; startup:boolean; notifications:boolean; }
export interface NoteIconAsset { id:string; themeId:string; themeEs:string; themeEn:string; nameEs:string; nameEn:string; src:string; }
export interface AssetItem { id:string; name:string; src:string; builtin:boolean; category?:string; packId?:string; packName?:string; description?:string; palette?:string[]; width?:number; height?:number; }
export interface NoteColors { title:string; body:string; accent:string; muted:string; completed:string; link:string; checkbox:string; selection:string; shadow:string; }
export interface TypographySettings { titleFont:string; bodyFont:string; titleSize:number; bodySize:number; titleWeight:number; bodyWeight:number; lineHeight:number; letterSpacing:number; titleTransform:'none'|'uppercase'|'lowercase'; }
export interface MascotSettings { mode:'random'|'fixed'|'none'; packId:string; mascotId:string; corner:Corner; size:number; rotation:number; offsetX:number; offsetY:number; opacity:number; flip:boolean; idleAnimation:'float'|'bounce'|'wiggle'|'breathe'|'none'; reaction:'confetti'|'sparkles'|'hearts'|'sticker-pop'|'none'; shadow:boolean; }
export interface BackgroundSettings { backgroundId:string; customSrc?:string; opacity:number; overlay:number; blur:number; zoom:number; positionX:number; positionY:number; borderRadius:number; borderWidth:number; borderColor:string; shadow:number; texture:number; }
export interface WindowSettings { cornerRadius:number; preferredWidth:number; preferredHeight:number; minWidth:number; minHeight:number; compactBreakpoint:number; responsive:boolean; scaleContent:boolean; }
export interface FrameSettings { presetId:string; style:FrameStyle; customFrameId:string; width:number; primary:string; secondary:string; tertiary:string; opacity:number; glow:number; animation:boolean; speed:number; inset:boolean; hoverBoost:number; }
export interface VoiceSettings { language:string; voiceName:string; rate:number; pitch:number; volume:number; readTitle:boolean; readChecklist:boolean; dictationDuration:number; dictationMode:'append'|'replace'|'prepend'; }
export interface IconSettings { style:IconStyle; size:number; stroke:number; color:string; buttonFill:string; hoverFill:string; glow:number; toolbarDensity:'compact'|'normal'|'comfortable'; labels:boolean; }
export interface EffectSettings { transition:TransitionStyle; motionIntensity:number; hoverLift:number; clickSquash:number; particles:'none'|'stars'|'petals'|'bubbles'|'pixels'|'confetti'; ambient:'none'|'float'|'glow'|'shimmer'|'drift'; sound:boolean; reduceMotion:boolean; }
export interface Customization { background:BackgroundSettings; window:WindowSettings; frame:FrameSettings; mascot:MascotSettings; colors:NoteColors; typography:TypographySettings; icons:IconSettings; effects:EffectSettings; voice:VoiceSettings; }
export interface ChecklistItem { id:string; text:string; done:boolean; }
export interface NoteAttachment { id:string; name:string; type:string; src:string; createdAt:string; }
export type NoteResourceKind = 'file'|'web';
export interface NoteResource { id:string; kind:NoteResourceKind; title:string; value:string; createdAt:string; updatedAt:string; }
export interface NoteGroup { id:string; name:string; icon:string; color:string; createdAt:string; updatedAt:string; systemKey?:string; }
export interface Note { id:string; title:string; icon:string; groupId:string; myDay:boolean; body:string; items:ChecklistItem[]; kind:'text'|'checklist'|'task'; pinned:boolean; alwaysOnTop:boolean; archived:boolean; locked:boolean; protected:boolean; systemKey?:string; category:string; tags:string[]; reminderAt:string; attachments:NoteAttachment[]; resources:NoteResource[]; drawing:string; createdAt:string; updatedAt:string; customization:Customization; assignedMascotId:string; }
export interface SavedTheme { id:string; name:string; description:string; createdAt:string; builtin:boolean; customization:Customization; }

export interface WidgetBackgroundPalette { background:string; surface:string; primary:string; secondary:string; text:string; muted:string; border:string; shadow:string; glass:string; glassStrong:string; dark:boolean; }
export interface WidgetBackground { id:string; name:string; themeId:string; themeName:string; themeDescription:string; src:string; width:number; height:number; aspectRatio:'9:16'; palette:WidgetBackgroundPalette; builtin?:boolean; sourceName?:string; createdAt?:string; }
export type ShowcaseMascotAnimation='float'|'bounce'|'breathe'|'wiggle'|'none';
export type ShowcaseMascotCorner='top-left'|'top-right'|'bottom-left'|'bottom-right';
export type ShowcaseSizePreset='small'|'medium'|'large';
export interface ShowcaseWidgetSettings {
 id:string; noteId:string; backgroundId:string; mascotId:string; createdAt:string; updatedAt:string;
 sizePreset:ShowcaseSizePreset; alwaysOnTop:boolean; cornerRadius:number;
 backgroundZoom:number; backgroundPositionX:number; backgroundPositionY:number; overlay:number;
 glassOpacity:number; glassBlur:number; glassBorderOpacity:number;
 titleSize:number; bodySize:number; textAlign:'left'|'center'; showTitle:boolean; showBody:boolean; showChecklist:boolean;
 mascotCorner:ShowcaseMascotCorner; mascotSize:number; mascotOffsetX:number; mascotOffsetY:number; mascotOpacity:number; mascotFlip:boolean; mascotAnimation:ShowcaseMascotAnimation;
 controlsOnHover:boolean;
}

