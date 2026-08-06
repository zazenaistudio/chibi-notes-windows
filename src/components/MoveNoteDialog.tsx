import { AnimatePresence, motion } from 'framer-motion';
import { Archive, CalendarDays, Check, Grid2X2, Layers3, X } from 'lucide-react';
import type { Note, NoteGroup } from '../types';
import { NoteIcon } from './NoteIcon';

export type MoveDestination = { type: 'desktop' | 'myday' | 'archive' } | { type: 'group'; groupId: string };

type Props = {
  open: boolean;
  note?: Note;
  groups: NoteGroup[];
  onClose: () => void;
  onMove: (destination: MoveDestination) => void;
};

export function MoveNoteDialog({ open, note, groups, onClose, onMove }: Props) {
  return (
    <AnimatePresence>
      {open && note && (
        <motion.div className="move-note-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
          <motion.section className="move-note-dialog" initial={{ opacity: 0, scale: 0.94, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }} transition={{ type: 'spring', stiffness: 280, damping: 26 }}>
            <header>
              <div className="move-note-title-icon"><NoteIcon value={note.icon || '📝'}/></div>
              <div>
                <small>MOVER NOTA</small>
                <h2>{note.title || 'Sin título'}</h2>
                <p>Elige dónde quieres organizar esta nota.</p>
              </div>
              <button className="move-note-close" onClick={onClose} aria-label="Cerrar"><X /></button>
            </header>

            <div className="move-note-primary-grid">
              <button className={!note.groupId && !note.myDay && !note.archived ? 'selected' : ''} onClick={() => onMove({ type: 'desktop' })}>
                <span className="move-note-option-icon desktop"><Grid2X2 /></span>
                <b>Escritorio</b>
                <small>Notas sin grupo, visibles en el panel principal.</small>
                {!note.groupId && !note.myDay && !note.archived && <i><Check /></i>}
              </button>
              <button className={note.myDay && !note.archived ? 'selected' : ''} onClick={() => onMove({ type: 'myday' })}>
                <span className="move-note-option-icon myday"><CalendarDays /></span>
                <b>Mi Día Chibi</b>
                <small>Destácala como prioridad para hoy.</small>
                {note.myDay && !note.archived && <i><Check /></i>}
              </button>
              <button className={note.archived ? 'selected archive' : 'archive'} onClick={() => onMove({ type: 'archive' })}>
                <span className="move-note-option-icon archived"><Archive /></span>
                <b>Archivar</b>
                <small>Guárdala sin eliminarla del proyecto.</small>
                {note.archived && <i><Check /></i>}
              </button>
            </div>

            <div className="move-note-groups-heading">
              <div>
                <Layers3 />
                <span>
                  <b>Grupos personalizados</b>
                  <small>{groups.length ? 'Selecciona una categoría.' : 'Todavía no has creado grupos.'}</small>
                </span>
              </div>
            </div>

            <div className="move-note-groups-grid">
              {groups.map((group) => (
                <button key={group.id} className={note.groupId === group.id && !note.archived ? 'selected' : ''} onClick={() => onMove({ type: 'group', groupId: group.id })}>
                  <span style={{ background: group.color }}>{group.icon}</span>
                  <div>
                    <b>{group.name}</b>
                    <small>Mover a este grupo</small>
                  </div>
                  {note.groupId === group.id && !note.archived && <i><Check /></i>}
                </button>
              ))}
              {!groups.length && <div className="move-note-no-groups"><Layers3 /><b>No hay grupos personalizados</b><small>Puedes crearlos desde la barra lateral.</small></div>}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
