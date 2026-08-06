import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Clipboard, FileText, HelpCircle, Info, Keyboard, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { LICENSE_TEXT } from '../data/license';

type InfoTab='help'|'about'|'license';

export function AppInfoModal({open,initialTab='help',onClose}:{open:boolean;initialTab?:InfoTab;onClose:()=>void}){
 const [tab,setTab]=useState<InfoTab>(initialTab);
 const copyLicense=async()=>{await navigator.clipboard?.writeText(LICENSE_TEXT)};
 return <AnimatePresence>{open&&<motion.div className="info-modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}>
  <motion.section className="info-modal" initial={{opacity:0,scale:.9,y:30}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.94,y:20}} transition={{type:'spring',stiffness:310,damping:28}} onClick={event=>event.stopPropagation()}>
   <button className="info-close" data-sound="modalClose" onClick={onClose}><X/></button>
   <aside className="info-nav">
    <img src="/assets/branding/chibi-notes.png" alt="Icono de Chibi Notes"/>
    <button className={tab==='help'?'active':''} onClick={()=>setTab('help')}><HelpCircle/>Ayuda</button>
    <button className={tab==='about'?'active':''} onClick={()=>setTab('about')}><Info/>Acerca de</button>
    <button className={tab==='license'?'active':''} onClick={()=>setTab('license')}><ShieldCheck/>Licencia</button>
   </aside>
   <div className="info-content">
    <AnimatePresence mode="wait">
     {tab==='help'&&<motion.div key="help" initial={{opacity:0,x:18}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-14}}>
      <span className="info-kicker"><HelpCircle/>CENTRO DE AYUDA</span><h2>Cómo usar Chibi Notes</h2><p>Gestiona y edita tus notas en el dashboard y ábrelas como ventanas visuales verticales, independientes y personalizables.</p>
      <div className="help-grid">
       <article><BookOpen/><div><b>Crear y editar</b><p>Usa «Nueva nota» o <kbd>Ctrl + Alt + N</kbd>. El editor admite negrita, cursiva, subrayado, listas y resaltador.</p></div></article>
       <article><Sparkles/><div><b>Personalización</b><p>Cambia fondos, marcos, mascotas, tipografías, sonidos, colores y animaciones desde un único panel.</p></div></article>
       <article><Keyboard/><div><b>Grupos e iconos</b><p>Abre «Administrar notas» para crear grupos, asignar notas y elegir iconos identificativos.</p></div></article>
       <article><FileText/><div><b>Ventanas visuales</b><p>Pulsa el icono de monitor para abrir varias notas 9:16 con fondo, mascota, vidrio y paleta automática propios.</p></div></article>
      </div>
      <div className="help-callout"><ShieldCheck/><div><b>Privacidad local</b><p>SQLite y Vosk funcionan localmente. El audio del dictado no se envía a un servidor.</p></div></div>
     </motion.div>}
     {tab==='about'&&<motion.div key="about" initial={{opacity:0,x:18}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-14}}>
      <span className="info-kicker"><Info/>ACERCA DE</span><div className="about-hero"><img src="/assets/branding/chibi-notes.png" alt="Chibi Notes"/><div><h2>Chibi Notes</h2><p>Versión 0.4.26</p><strong>Zazen AI Studio</strong></div></div>
      <p>Gestor de notas-widget kawaii para Windows, construido con Tauri 2, React, TypeScript, Framer Motion, Python, SQLite y Vosk.</p>
      <div className="about-stats"><span><b>662</b>Mascotas</span><span><b>74</b>Fondos visuales 9:16</span><span><b>23</b>Efectos de sonido</span><span><b>Grupos</b>Organización</span></div>
      <div className="about-copyright">Copyright © 2026 Samuel Acosta Fernández — Zazen AI Studio. Todos los derechos reservados.</div>
     </motion.div>}
     {tab==='license'&&<motion.div key="license" className="license-view" initial={{opacity:0,x:18}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-14}}>
      <span className="info-kicker"><ShieldCheck/>LICENCIA PROPIETARIA</span><div className="license-title"><div><h2>Zazen AI Studio Personal Use License</h2><p>Versión 1.0 — Agosto de 2026</p></div><button onClick={()=>void copyLicense()}><Clipboard/>Copiar</button></div>
      <pre>{LICENSE_TEXT}</pre>
     </motion.div>}
    </AnimatePresence>
   </div>
  </motion.section>
 </motion.div>}</AnimatePresence>;
}
