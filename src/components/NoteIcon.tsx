import type { CSSProperties } from 'react';

type Props={value?:string;className?:string;size?:number;style?:CSSProperties;alt?:string};
export const isCustomNoteIcon=(value?:string)=>Boolean(value&&value.startsWith('/assets/note-icons/'));

export function NoteIcon({value='📝',className='',size,style,alt=''}:Props){
 const custom=isCustomNoteIcon(value);
 const merged={...(size?{width:size,height:size}:{}),...style};
 return custom?<img className={`note-custom-icon ${className}`} src={value} alt={alt} draggable={false} style={merged}/>:<span className={`note-emoji-icon ${className}`} style={merged}>{value||'📝'}</span>;
}
