import type { AssetItem } from '../types';

const MAX_SIZE=720;
const loadImage=(file:File)=>new Promise<HTMLImageElement>((resolve,reject)=>{
 const url=URL.createObjectURL(file);
 const image=new Image();
 image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};
 image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('No se pudo leer la mascota seleccionada.'))};
 image.src=url;
});
const cleanName=(name:string)=>name.replace(/\.[^.]+$/,'').trim()||'Mascota personalizada';

export async function importWidgetMascot(file:File,language:'es'|'en'='es'):Promise<AssetItem>{
 if(!file.type.startsWith('image/'))throw new Error(language==='en'?'Choose a valid image file.':'Selecciona un archivo de imagen válido.');
 const image=await loadImage(file);
 if(!image.naturalWidth||!image.naturalHeight)throw new Error(language==='en'?'The selected image has an invalid size.':'La imagen seleccionada no tiene un tamaño válido.');
 const scale=Math.min(1,MAX_SIZE/Math.max(image.naturalWidth,image.naturalHeight));
 const width=Math.max(1,Math.round(image.naturalWidth*scale));
 const height=Math.max(1,Math.round(image.naturalHeight*scale));
 const canvas=document.createElement('canvas');
 canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d',{alpha:true});
 if(!context)throw new Error(language==='en'?'The mascot could not be prepared.':'No se pudo preparar la mascota.');
 context.clearRect(0,0,width,height);
 context.imageSmoothingEnabled=true;
 context.imageSmoothingQuality='high';
 context.drawImage(image,0,0,width,height);
 return {
  id:`custom-widget-mascot-${crypto.randomUUID()}`,
  name:cleanName(file.name),
  src:canvas.toDataURL('image/png'),
  builtin:false,
  category:language==='en'?'My mascots':'Mis mascotas',
  packId:'custom-widget-mascots',
  packName:language==='en'?'My mascots':'Mis mascotas',
  width,
  height,
 };
}
