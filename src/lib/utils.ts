export const uid = (prefix='id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
export const cx = (...v:(string|false|undefined|null)[]) => v.filter(Boolean).join(' ');
export const clamp = (n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
export const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
export const pickRandom = <T,>(items:T[]):T|undefined => items[Math.floor(Math.random()*items.length)];
export const fileToDataUrl = (file:File) => new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(file)});
export const downloadJson = (name:string,data:unknown)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download=name;a.click();URL.revokeObjectURL(a.href)};
