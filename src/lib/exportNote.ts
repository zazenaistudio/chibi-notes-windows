import type { Note } from '../types';
import { htmlToText } from './richText';
import { isTauri } from './utils';

const safeName=(value:string,extension:string)=>`${(value||'nota-chibi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9-_]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase()||'nota-chibi'}.${extension}`;

async function saveBytes(defaultName:string,bytes:Uint8Array,mime:string){
 if(isTauri()){
  try{
   const [{save},{writeFile}]=await Promise.all([import('@tauri-apps/plugin-dialog'),import('@tauri-apps/plugin-fs')]);
   const path=await save({defaultPath:defaultName,filters:[{name:defaultName.split('.').pop()?.toUpperCase()||'Archivo',extensions:[defaultName.split('.').pop()||'txt']}]});
   if(path){await writeFile(path,bytes);return true;}
  }catch(error){console.warn('No se pudo usar el diálogo nativo; se usará la descarga web.',error)}
 }
 const blobBuffer=new ArrayBuffer(bytes.byteLength);
 new Uint8Array(blobBuffer).set(bytes);
 const blob=new Blob([blobBuffer],{type:mime});
 const url=URL.createObjectURL(blob);
 const anchor=document.createElement('a');anchor.href=url;anchor.download=defaultName;anchor.click();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 return true;
}

async function saveText(defaultName:string,text:string,mime:string){return saveBytes(defaultName,new TextEncoder().encode(text),mime)}

const checklistText=(note:Note)=>note.items.map(item=>`${item.done?'[x]':'[ ]'} ${item.text}`).join('\n');
const resourcesText=(note:Note)=>{const resources=note.resources||[];if(!resources.length)return '';const files=resources.filter(item=>item.kind==='file').map(item=>`- ${item.title}: ${item.value}`);const webs=resources.filter(item=>item.kind==='web').map(item=>`- ${item.title}: ${item.value}`);return [files.length?'ARCHIVOS\n'+files.join('\n'):'',webs.length?'WEBS\n'+webs.join('\n'):''].filter(Boolean).join('\n\n')};
const noteText=(note:Note)=>[note.title,htmlToText(note.body),checklistText(note),resourcesText(note)].filter(Boolean).join('\n\n');

export const exportNoteTxt=(note:Note)=>saveText(safeName(note.title,'txt'),noteText(note),'text/plain;charset=utf-8');
export const exportNoteMarkdown=(note:Note)=>{const resources=note.resources||[];const files=resources.filter(item=>item.kind==='file').map(item=>`- **${item.title}**: \`${item.value}\``).join('\n');const webs=resources.filter(item=>item.kind==='web').map(item=>`- [${item.title}](${item.value})`).join('\n');return saveText(safeName(note.title,'md'),[`# ${note.title||'Nota Chibi'}`,htmlToText(note.body),note.items.map(item=>`- [${item.done?'x':' '}] ${item.text}`).join('\n'),files?`## Archivos\n${files}`:'',webs?`## Webs\n${webs}`:''].filter(Boolean).join('\n\n'),'text/markdown;charset=utf-8')};
export const exportNoteJson=(note:Note)=>saveText(safeName(note.title,'json'),JSON.stringify(note,null,2),'application/json;charset=utf-8');
export const exportAllNotesJson=(notes:Note[])=>saveText('chibi-notes-export.json',JSON.stringify(notes,null,2),'application/json;charset=utf-8');

const cp1252:Record<string,number>={'€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159};
const pdfEscaped=(text:string)=>Array.from(text).map(char=>{
 const code=cp1252[char]??char.charCodeAt(0);
 if(char==='\\'||char==='('||char===')')return `\\${char}`;
 if(code<32||code>126)return `\\${Math.min(255,code).toString(8).padStart(3,'0')}`;
 return char;
}).join('');

const wrap=(text:string,max=82)=>{
 const lines:string[]=[];
 for(const paragraph of text.split(/\r?\n/)){
  if(!paragraph.trim()){lines.push('');continue;}
  let current='';
  for(const word of paragraph.split(/\s+/)){
   if(!current){current=word;continue;}
   if(`${current} ${word}`.length<=max)current+=` ${word}`;
   else{lines.push(current);current=word;}
  }
  if(current)lines.push(current);
 }
 return lines;
};

export function createNotePdfBytes(note:Note){
 const bodyLines=wrap([htmlToText(note.body),checklistText(note),resourcesText(note)].filter(Boolean).join('\n\n'));
 const chunks:string[][]=[];
 while(bodyLines.length)chunks.push(bodyLines.splice(0,47));
 if(!chunks.length)chunks.push([]);
 const pageCount=chunks.length;
 const pageIds=Array.from({length:pageCount},(_,i)=>3+i);
 const contentStart=3+pageCount;
 const contentIds=Array.from({length:pageCount},(_,i)=>contentStart+i);
 const fontId=contentStart+pageCount;
 const objects=new Map<number,string>();
 objects.set(1,'<< /Type /Catalog /Pages 2 0 R >>');
 objects.set(2,`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageCount} >>`);
 chunks.forEach((lines,index)=>{
  objects.set(pageIds[index],`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentIds[index]} 0 R >>`);
  const title=index===0?(note.title||'Nota Chibi'):`${note.title||'Nota Chibi'} — continuación`;
  const commands=[
   'BT','/F1 18 Tf','50 790 Td',`(${pdfEscaped(title)}) Tj`,'/F1 10 Tf','0 -24 Td',`(${pdfEscaped(new Date(note.updatedAt).toLocaleString('es-ES'))}) Tj`,'/F1 11 Tf','0 -28 Td'
  ];
  lines.forEach((line,lineIndex)=>{if(lineIndex>0)commands.push('0 -15 Td');commands.push(`(${pdfEscaped(line)}) Tj`)});
  commands.push('ET');
  const stream=commands.join('\n');
  objects.set(contentIds[index],`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`);
 });
 objects.set(fontId,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
 let pdf='%PDF-1.4\n%ChibiNotes\n';
 const offsets:number[]=[0];
 for(let id=1;id<=fontId;id++){
  offsets[id]=new TextEncoder().encode(pdf).length;
  pdf+=`${id} 0 obj\n${objects.get(id)}\nendobj\n`;
 }
 const xrefOffset=new TextEncoder().encode(pdf).length;
 pdf+=`xref\n0 ${fontId+1}\n0000000000 65535 f \n`;
 for(let id=1;id<=fontId;id++)pdf+=`${String(offsets[id]).padStart(10,'0')} 00000 n \n`;
 pdf+=`trailer\n<< /Size ${fontId+1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
 return new TextEncoder().encode(pdf);
}

export const exportNotePdf=(note:Note)=>saveBytes(safeName(note.title,'pdf'),createNotePdfBytes(note),'application/pdf');
