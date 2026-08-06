import type { Customization, IconStyle, SavedTheme } from '../types';
export const FONT_OPTIONS = [
  'Nunito','Quicksand','Fredoka','Baloo 2','M PLUS Rounded 1c','Zen Maru Gothic','Yomogi','Caveat','Patrick Hand','Kalam',
  'Comic Neue','Poppins','Rubik','Montserrat','Josefin Sans','Comfortaa','Balsamiq Sans','DynaPuff','Bubblegum Sans','Chewy',
  'Cherry Bomb One','Sniglet','Short Stack','Schoolbell','Handlee','Indie Flower','Gochi Hand','Kiwi Maru','Noto Sans','Noto Serif',
  'Inter','DM Sans','Space Grotesk','Lexend','Ubuntu','Roboto Slab','Merriweather','Lora','Alegreya Sans','Playfair Display',
  'Cormorant Garamond','Orbitron','Press Start 2P','Atkinson Hyperlegible','Segoe UI','Arial','Verdana','Georgia','Trebuchet MS'
];
export const FONT_SIZE_PRESETS = [
  {id:'compact',name:'Compacta',title:17,body:12},
  {id:'normal',name:'Normal',title:22,body:16},
  {id:'large',name:'Grande',title:30,body:21},
  {id:'extra',name:'Extra grande',title:40,body:28}
];
export const ICON_STYLES:{id:IconStyle;name:string;description:string}[] = [
  {id:'rounded',name:'Rounded Fill',description:'Botones suaves y rellenos'},
  {id:'outline',name:'Soft Outline',description:'Trazos limpios y ligeros'},
  {id:'duotone',name:'Duotone',description:'Dos niveles de color'},
  {id:'pixel',name:'Pixel Pop',description:'Controles de videojuego'},
  {id:'technical',name:'Technical HUD',description:'Panel futurista preciso'},
  {id:'candy',name:'Candy Gel',description:'Controles pastel con brillo de caramelo'},
  {id:'sticker',name:'Sticker Pop',description:'Botones adhesivos redondos y juguetones'},
  {id:'softglass',name:'Soft Glass',description:'Cristal suave con brillo lechoso'}
];
export const DEFAULT_CUSTOMIZATION:Customization = {
  background:{backgroundId:'cotton-candy-cloud',opacity:1,overlay:.16,blur:0,zoom:100,positionX:50,positionY:50,borderRadius:34,borderWidth:2,borderColor:'#ffffff99',shadow:30,texture:35},
  window:{cornerRadius:28,preferredWidth:430,preferredHeight:520,minWidth:300,minHeight:300,compactBreakpoint:380,responsive:true,scaleContent:true},
  frame:{presetId:'soft-pastel',style:'solid',customFrameId:'',width:4,primary:'#ffffffcc',secondary:'#f7b8d9',tertiary:'#bfd9ff',opacity:1,glow:12,animation:true,speed:5,inset:false,hoverBoost:20},
  mascot:{mode:'random',packId:'',mascotId:'',corner:'top-right',size:132,rotation:0,offsetX:8,offsetY:-38,opacity:1,flip:false,idleAnimation:'float',reaction:'sticker-pop',shadow:true},
  colors:{title:'#3f3344',body:'#4f4352',accent:'#e86aa8',muted:'#786b7d',completed:'#9b91a0',link:'#6b75d8',checkbox:'#e86aa8',selection:'#f6bfdc',shadow:'#2e2035'},
  typography:{titleFont:'Fredoka',bodyFont:'Nunito',titleSize:22,bodySize:16,titleWeight:700,bodyWeight:550,lineHeight:1.55,letterSpacing:.1,titleTransform:'none'},
  icons:{style:'rounded',size:18,stroke:2.2,color:'#49394a',buttonFill:'#ffffff88',hoverFill:'#ffffffdd',glow:12,toolbarDensity:'normal',labels:false},
  effects:{transition:'spring',motionIntensity:65,hoverLift:5,clickSquash:7,particles:'stars',ambient:'float',sound:true,reduceMotion:false},
  voice:{language:'es-ES',voiceName:'',rate:1,pitch:1,volume:1,readTitle:true,readChecklist:true,dictationDuration:180,dictationMode:'append'}
};
export const deepClone = <T,>(x:T):T => JSON.parse(JSON.stringify(x));
export const STARTER_THEME_NAMES = ['Algodón soñador','Sakura despistado','Arcade caótico','Noche de brujas','Biblioteca calentita','Zen kawaii'];
