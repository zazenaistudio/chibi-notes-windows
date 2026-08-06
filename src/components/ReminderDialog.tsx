import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CalendarClock, Check, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Note } from '../types';
import { ensureNotificationPermission } from '../lib/notifications';
import { useI18n } from '../i18n';

const toLocalInput = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

type Props = { open: boolean; note?: Note; onClose: () => void; onSave: (value: string) => void };

export function ReminderDialog({ open, note, onClose, onSave }: Props) {
  const { t } = useI18n();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(note?.reminderAt || '');
      setError('');
      setSaving(false);
    }
  }, [open, note?.reminderAt]);

  const quick = (kind: 'hour' | 'tomorrow' | 'week') => {
    const date = new Date();
    if (kind === 'hour') date.setHours(date.getHours() + 1, 0, 0, 0);
    if (kind === 'tomorrow') { date.setDate(date.getDate() + 1); date.setHours(9, 0, 0, 0); }
    if (kind === 'week') { date.setDate(date.getDate() + 7); date.setHours(9, 0, 0, 0); }
    setValue(toLocalInput(date));
  };

  const save = async () => {
    setError('');
    if (value) {
      const selectedDate = new Date(value);
      if (Number.isNaN(selectedDate.getTime())) {
        setError(t('Selecciona una fecha y una hora válidas.'));
        return;
      }
      if (selectedDate.getTime() <= Date.now()) {
        setError(t('El recordatorio debe programarse para una fecha futura.'));
        return;
      }
      setSaving(true);
      try {
        const allowed = await ensureNotificationPermission();
        if (!allowed) {
          setError(t('Debes permitir las notificaciones para recibir el recordatorio en Windows.'));
          return;
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : t('No se pudo solicitar permiso para las notificaciones.'));
        return;
      } finally {
        setSaving(false);
      }
    }
    onSave(value);
    onClose();
  };

  const dialog = (
    <AnimatePresence>
      {open && (
        <motion.div className="quick-dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
          <motion.form className="quick-dialog reminder-dialog chibi-modal-card" initial={{ opacity: 0, scale: 0.92, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }} onSubmit={(event) => { event.preventDefault(); void save(); }}>
            <header>
              <span><Bell /><div><b>{t('Recordatorio')}</b><small data-i18n-skip>{note?.title || t('Nota seleccionada')}</small></div></span>
              <button type="button" onClick={onClose}><X /></button>
            </header>
            <label className="quick-field"><span><CalendarClock />{t('Fecha y hora')}</span><input autoFocus type="datetime-local" min={toLocalInput(new Date())} value={value} onChange={(event) => setValue(event.target.value)} /></label>
            <div className="quick-presets">
              <button type="button" onClick={() => quick('hour')}>{t('Dentro de 1 hora')}</button>
              <button type="button" onClick={() => quick('tomorrow')}>{t('Mañana, 09:00')}</button>
              <button type="button" onClick={() => quick('week')}>{t('Dentro de una semana')}</button>
            </div>
            {error && <motion.p className="quick-dialog-error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>{error}</motion.p>}
            <footer>
              <button type="button" className="danger-soft" onClick={() => { onSave(''); onClose(); }}><Trash2 />{t('Quitar')}</button>
              <button type="button" className="secondary" onClick={onClose}>{t('Cancelar')}</button>
              <button className="primary" disabled={saving}><Check />{saving ? t('Comprobando permisos…') : t('Guardar')}</button>
            </footer>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(dialog, document.body);
}
