import { AnimatePresence,motion } from 'framer-motion';
import {AlertTriangle,Check,Info,Trash2,X} from 'lucide-react';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import type {ConfirmationRequest} from '../lib/confirm';
import {useI18n} from '../i18n';

export function ConfirmDialogHost(){
 const {t}=useI18n();
 const [request,setRequest]=useState<ConfirmationRequest|null>(null);
 useEffect(()=>{
  const handler=(event:Event)=>{
   const next=(event as CustomEvent<ConfirmationRequest>).detail;
   if(!next)return;
   setRequest(current=>{current?.resolve(false);return next});
  };
  window.addEventListener('chibi:confirm',handler);
  return()=>window.removeEventListener('chibi:confirm',handler);
 },[]);
 const finish=(value:boolean)=>{request?.resolve(value);setRequest(null)};
 const tone=request?.tone||'danger';
 const dialog=<AnimatePresence>{request&&<motion.div className="confirm-dialog-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={event=>{if(event.target===event.currentTarget)finish(false)}}>
  <motion.section className={`confirm-dialog tone-${tone}`} initial={{opacity:0,scale:.92,y:18}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.95,y:10}} transition={{type:'spring',stiffness:310,damping:28}} role="alertdialog" aria-modal="true">
   <motion.div className="confirm-mascot" animate={{y:[0,-5,0],rotate:[-2,2,-2]}} transition={{duration:3.3,repeat:Infinity,ease:'easeInOut'}}><img src="/assets/feature-icons/12_pollito_eliminar_nota.png" alt=""/></motion.div>
   <button className="confirm-close" onClick={()=>finish(false)} aria-label={t('Cerrar')}><X/></button>
   <span className="confirm-icon">{tone==='danger'?<Trash2/>:tone==='warning'?<AlertTriangle/>:<Info/>}</span>
   <div className="confirm-copy"><small>{t('CONFIRMACIÓN')}</small><h2>{request.title}</h2><p>{request.message}</p>{request.detail&&<div className="confirm-detail">{request.detail}</div>}</div>
   <footer><button className="secondary" onClick={()=>finish(false)}><X/>{request.cancelLabel||t('Cancelar')}</button><button className={tone==='danger'?'danger-confirm':'primary'} onClick={()=>finish(true)}><Check/>{request.confirmLabel||t('Eliminar')}</button></footer>
  </motion.section>
 </motion.div>}</AnimatePresence>;
 return createPortal(dialog,document.body);
}
