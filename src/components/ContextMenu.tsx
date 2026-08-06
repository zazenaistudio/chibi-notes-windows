import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

type Props = { open: boolean; x: number; y: number; onClose: () => void; children: ReactNode };

export function ContextMenu({ open, x, y, onClose, children }: Props) {
  const left = Math.max(12, Math.min(x, window.innerWidth - 302));
  const top = Math.max(12, Math.min(y, window.innerHeight - 572));

  return (
    <AnimatePresence>
      {open && (
        <>
          <button className="context-menu-catcher" aria-label="Cerrar menú contextual" onClick={onClose} />
          <motion.div
            className="context-menu"
            style={{ left, top }}
            initial={{ opacity: 0, scale: 0.92, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -3 }}
            transition={{ duration: 0.15 }}
            onContextMenu={(event) => event.preventDefault()}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
