import { AnimatePresence, motion } from 'framer-motion';
import { Check, FolderPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { GROUP_ICONS } from '../store/useAppStore';
import type { NoteGroup } from '../types';
import { useI18n } from '../i18n';

type GroupDraft = { name: string; icon: string; color: string };
type Props = { open: boolean; group?: NoteGroup; onClose: () => void; onSave: (value: GroupDraft) => void };

const emptyDraft = (): GroupDraft => ({ name: '', icon: '📁', color: '#9fdfff' });

export function GroupDialog({ open, group, onClose, onSave }: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<GroupDraft>(emptyDraft);

  useEffect(() => {
    if (!open) return;
    setDraft({
      name: group?.name || '',
      icon: typeof group?.icon === 'string' && group.icon.trim() ? group.icon.trim() : '📁',
      color: group?.color || '#9fdfff',
    });
  }, [open, group?.id, group?.name, group?.icon, group?.color]);

  const save = () => {
    const name = draft.name.trim();
    const icon = draft.icon.trim() || '📁';
    if (!name) return;
    onSave({ name, icon, color: draft.color });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="quick-dialog-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
          <motion.form
            className="quick-dialog group-dialog group-dialog-v2"
            initial={{ opacity: 0, scale: 0.92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            onSubmit={(event) => { event.preventDefault(); save(); }}
          >
            <header>
              <span>
                <FolderPlus />
                <div>
                  <b>{t(group ? 'Editar grupo' : 'Crear grupo')}</b>
                  <small>{t(group ? 'Actualiza su nombre, icono o color.' : 'Organiza notas relacionadas.')}</small>
                </div>
              </span>
              <button type="button" onClick={onClose}><X /></button>
            </header>

            <motion.div
              key={`${draft.icon}-${draft.color}`}
              className="group-dialog-preview"
              style={{ background: draft.color }}
              initial={{ scale: 0.82, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
            >
              {draft.icon}
            </motion.div>

            <label className="quick-field">
              <span>{t('Nombre')}</span>
              <input autoFocus value={draft.name} onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))} placeholder={t('Nombre del grupo')} />
            </label>

            <section className="group-icon-picker">
              <header>
                <b>{t('Icono')}</b>
                <small>{t('El icono seleccionado se aplicará al grupo al guardar.')}</small>
              </header>
              <div role="listbox" aria-label={t('Icono')}>
                {GROUP_ICONS.map((item) => {
                  const selected = draft.icon === item;
                  return (
                    <motion.button
                      type="button"
                      key={item}
                      role="option"
                      aria-selected={selected}
                      className={selected ? 'selected' : ''}
                      onClick={() => setDraft((value) => ({ ...value, icon: item }))}
                      whileHover={{ scale: 1.08, y: -2 }}
                      whileTap={{ scale: 0.88 }}
                      aria-label={`${t('Seleccionar icono')} ${item}`}
                    >
                      <span>{item}</span>
                      {selected && <i><Check /></i>}
                    </motion.button>
                  );
                })}
              </div>
            </section>

            <label className="quick-field color-field group-color-field">
              <span>{t('Color')}</span>
              <div>
                <input type="color" value={draft.color} onChange={(event) => setDraft((value) => ({ ...value, color: event.target.value }))} />
                <code>{draft.color.toUpperCase()}</code>
              </div>
            </label>

            <footer>
              <button type="button" className="secondary" onClick={onClose}>{t('Cancelar')}</button>
              <button type="submit" className="primary"><Check />{t(group ? 'Guardar' : 'Crear grupo')}</button>
            </footer>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
