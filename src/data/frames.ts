import type { FramePreset } from '../types';

export const FRAME_PRESETS:FramePreset[]=[
  {id:'none',name:'Sin marco',description:'Fondo limpio sin borde adicional',style:'none',category:'Básicos'},
  {id:'soft-pastel',name:'Soft Pastel',description:'Borde pastel suave con resplandor ligero',style:'solid',category:'Pastel'},
  {id:'candy-stripe',name:'Candy Stripe',description:'Rayas de caramelo animadas',style:'candy',category:'Pastel'},
  {id:'holographic-flow',name:'Holographic Flow',description:'Marco holográfico animado con cambio de color',style:'holographic',category:'Animados'},
  {id:'aurora-dream',name:'Aurora Dream',description:'Aurora fluida de tonos pastel',style:'aurora',category:'Animados'},
  {id:'neon-dream',name:'Neon Dream',description:'Contorno neón con pulso luminoso',style:'neon',category:'Animados'},
  {id:'sticker-white',name:'Sticker White',description:'Borde adhesivo grueso y divertido',style:'sticker',category:'Kawaii'},
  {id:'gold-foil',name:'Gold Foil',description:'Doble línea dorada con brillo metálico',style:'gold',category:'Elegantes'},
  {id:'stitched-fabric',name:'Stitched Fabric',description:'Costura decorativa de tela',style:'stitched',category:'Artesanales'},
  {id:'glass-prism',name:'Glass Prism',description:'Cristal translúcido con refracción',style:'glass',category:'Pastel'},
  {id:'double-pop',name:'Double Pop',description:'Doble borde de color contrastado',style:'double',category:'Básicos'},
  {id:'dotted-sprinkles',name:'Dotted Sprinkles',description:'Puntos kawaii alrededor de la nota',style:'dotted',category:'Kawaii'}
];
