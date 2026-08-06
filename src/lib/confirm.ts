export type ConfirmationTone='danger'|'warning'|'info';
export type ConfirmationOptions={
 title:string;
 message:string;
 detail?:string;
 confirmLabel?:string;
 cancelLabel?:string;
 tone?:ConfirmationTone;
};

type ConfirmationRequest=ConfirmationOptions&{resolve:(value:boolean)=>void};

export function requestConfirmation(options:ConfirmationOptions):Promise<boolean>{
 return new Promise(resolve=>{
  window.dispatchEvent(new CustomEvent<ConfirmationRequest>('chibi:confirm',{detail:{...options,resolve}}));
 });
}

export type {ConfirmationRequest};
