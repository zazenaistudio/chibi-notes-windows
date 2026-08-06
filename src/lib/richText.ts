const tagPattern=/<\/?[a-z][\s\S]*>/i;

export const escapeHtml=(value:string)=>value
 .replace(/&/g,'&amp;')
 .replace(/</g,'&lt;')
 .replace(/>/g,'&gt;')
 .replace(/"/g,'&quot;')
 .replace(/'/g,'&#039;');

export const ensureRichHtml=(value:string)=>{
 if(!value)return '';
 if(tagPattern.test(value))return value;
 return value.split(/\r?\n/).map(line=>line?`<div>${escapeHtml(line)}</div>`:'<div><br></div>').join('');
};

export const htmlToText=(value:string)=>{
 if(!value)return '';
 if(typeof document==='undefined')return value.replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
 const el=document.createElement('div');
 el.innerHTML=ensureRichHtml(value);
 return (el.innerText||el.textContent||'').replace(/\u00a0/g,' ').trim();
};

export const appendTextToHtml=(html:string,text:string)=>{
 const clean=text.trim();
 if(!clean)return ensureRichHtml(html);
 return `${ensureRichHtml(html)}${html?'<div><br></div>':''}<div>${escapeHtml(clean)}</div>`;
};

export const prependTextToHtml=(html:string,text:string)=>{
 const clean=text.trim();
 return clean?`<div>${escapeHtml(clean)}</div>${html?'<div><br></div>':''}${ensureRichHtml(html)}`:ensureRichHtml(html);
};
