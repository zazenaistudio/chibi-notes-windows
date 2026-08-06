import { AnimatePresence, motion } from 'framer-motion';
import { Maximize2, Trash2, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { NoteAttachment } from '../types';
import { useI18n } from '../i18n';

export type AttachmentContextState = { attachment: NoteAttachment; x: number; y: number } | null;

export function AttachmentContextMenu({ context, onClose, onExpand, onDelete }: {
  context: AttachmentContextState;
  onClose: () => void;
  onExpand: (attachment: NoteAttachment) => void;
  onDelete: (attachment: NoteAttachment) => void;
}) {
  const { t } = useI18n();
  if (typeof document === 'undefined') return null;
  const left = context ? Math.max(12, Math.min(context.x, window.innerWidth - 238)) : 0;
  const top = context ? Math.max(12, Math.min(context.y, window.innerHeight - 150)) : 0;
  return createPortal(
    <AnimatePresence>
      {context && (
        <>
          <button className="attachment-context-catcher" aria-label={t('Cerrar')} onClick={onClose} />
          <motion.div className="attachment-context-menu" style={{ left, top }} initial={{ opacity: 0, scale: 0.92, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
            <header>
              <img src={context.attachment.src} alt="" />
              <div><b>{context.attachment.name}</b><small>{t('Imagen adjunta')}</small></div>
            </header>
            <button onClick={() => { onExpand(context.attachment); onClose(); }}><Maximize2 />{t('Expandir imagen')}</button>
            <button className="danger" onClick={() => { onDelete(context.attachment); onClose(); }}><Trash2 />{t('Eliminar imagen')}</button>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function AttachmentPreviewDialog({ attachment, onClose }: { attachment: NoteAttachment | null; onClose: () => void }) {
  const { t } = useI18n();
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {attachment && (
        <motion.div className="attachment-preview-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
          <motion.section className="attachment-preview-dialog" initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}>
            <header>
              <div><b>{attachment.name}</b><small>{t('Vista ampliada')}</small></div>
              <button onClick={onClose} aria-label={t('Cerrar')}><X /></button>
            </header>
            <div className="attachment-preview-stage"><img src={attachment.src} alt={attachment.name} /></div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
