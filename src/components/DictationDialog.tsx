import { AnimatePresence, motion } from 'framer-motion';
import { Check, Clipboard, Mic, MicOff, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { appendTextToHtml, escapeHtml, prependTextToHtml } from '../lib/richText';
import { clearActiveDictation, discardDictationSession, pollDictationSession, startDictationSession, stopDictationSession } from '../lib/dictation';
import { useAppStore } from '../store/useAppStore';
import { useI18n } from '../i18n';

type Props = { open: boolean; noteId: string; onClose: () => void };

export function DictationDialog({ open, noteId, onClose }: Props) {
  const { t } = useI18n();
  const note = useAppStore((state) => state.notes.find((item) => item.id === noteId));
  const updateNote = useAppStore((state) => state.updateNote);
  const [sessionId, setSessionId] = useState('');
  const [text, setText] = useState('');
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const pollTimer = useRef<number | undefined>(undefined);
  const sessionRef = useRef('');
  const manualEdit = useRef(false);
  const mounted = useRef(true);

  const stopPolling = () => {
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    pollTimer.current = undefined;
  };

  const applyStatus = (status: Awaited<ReturnType<typeof pollDictationSession>>) => {
    setActive(status.active);
    setReady(status.ready);
    if (status.error) setError(status.error);
    if (!manualEdit.current) setText(status.displayText || status.text || '');
    if (!status.active) {
      stopPolling();
      clearActiveDictation(status.sessionId);
    }
  };

  const poll = async (id: string) => {
    try {
      const status = await pollDictationSession(id);
      if (mounted.current) applyStatus(status);
    } catch (reason) {
      if (!mounted.current) return;
      setError(reason instanceof Error ? reason.message : t('No se pudo obtener el texto reconocido.'));
      setActive(false);
      stopPolling();
    }
  };

  const begin = async (preserveText = false) => {
    if (!note || starting) return;
    stopPolling();
    setStarting(true);
    setStopping(false);
    setError('');
    setCopied(false);
    if (!preserveText) {
      setText('');
      manualEdit.current = false;
    }
    try {
      const result = await startDictationSession(note.customization.voice.language, note.customization.voice.dictationDuration || 180);
      if (!mounted.current) return;
      setSessionId(result.sessionId);
      sessionRef.current = result.sessionId;
      setDeviceName(result.availability.deviceName || t('Micrófono predeterminado'));
      setActive(true);
      setReady(false);
      await poll(result.sessionId);
      pollTimer.current = window.setInterval(() => void poll(result.sessionId), 360);
    } catch (reason) {
      if (!mounted.current) return;
      setError(reason instanceof Error ? reason.message : t('No se pudo iniciar el dictado con Vosk.'));
      setActive(false);
      setReady(false);
    } finally {
      if (mounted.current) setStarting(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    if (!open) return;
    const timer = window.setTimeout(() => void begin(false), 120);
    return () => {
      mounted.current = false;
      window.clearTimeout(timer);
      stopPolling();
      if (sessionRef.current) void discardDictationSession(sessionRef.current);
    };
  }, [open, noteId]);

  const stop = async () => {
    if (!sessionId || stopping) return;
    setStopping(true);
    setError('');
    try {
      await stopDictationSession(sessionId);
      let latest = await pollDictationSession(sessionId);
      for (let attempt = 0; attempt < 24 && latest.active; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 125));
        latest = await pollDictationSession(sessionId);
      }
      applyStatus(latest);
      if (latest.active) {
        await discardDictationSession(sessionId);
        setActive(false);
        setReady(false);
        setError(t('El micrófono tardó demasiado en detenerse y se cerró la sesión de forma segura.'));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('No se pudo detener el micrófono.'));
      await discardDictationSession(sessionId);
      setActive(false);
      setReady(false);
    } finally {
      stopPolling();
      clearActiveDictation(sessionId);
      setStopping(false);
    }
  };

  const close = async () => {
    stopPolling();
    const current=sessionRef.current||sessionId;
    if (current) await discardDictationSession(current);
    clearActiveDictation(current);
    sessionRef.current='';
    setActive(false);
    onClose();
  };

  const insert = async () => {
    if (!note || !text.trim()) return;
    if (active) await stop();
    const clean = text.trim();
    const mode = note.customization.voice.dictationMode;
    const body = mode === 'replace'
      ? `<div>${escapeHtml(clean)}</div>`
      : mode === 'prepend'
        ? prependTextToHtml(note.body, clean)
        : appendTextToHtml(note.body, clean);
    updateNote(note.id, { body });
    await close();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(t('No se pudo copiar el texto.'));
    }
  };

  const statusTitle = starting
    ? t('Preparando el micrófono…')
    : stopping
      ? t('Deteniendo el dictado…')
      : active
        ? ready ? t('Escuchando…') : t('Preparando el micrófono…')
        : error ? t('Revisa el micrófono') : t('Dictado detenido');

  const statusDescription = active
    ? t('Habla con normalidad. El texto aparecerá en la caja inferior.')
    : error
      ? t('Puedes revisar el mensaje y volver a intentarlo.')
      : t('Puedes editar el texto antes de añadirlo a la nota.');

  const dialog = (
    <AnimatePresence>
      {open && note && (
        <motion.div className="dictation-dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) void close(); }}>
          <motion.section className="dictation-dialog chibi-modal-card" initial={{ opacity: 0, scale: 0.92, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
            <header>
              <motion.div className="dictation-mascot" animate={{ y: [0, -5, 0], rotate: [-2, 2, -2] }} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}>
                <img src="/assets/feature-icons/13_pollito_nota_de_voz.png" alt="" />
              </motion.div>
              <div className="dictation-heading"><small>{t('DICTADO LOCAL')}</small><h2>{t('Habla y revisa el texto')}</h2><p data-i18n-skip>{note.title}</p></div>
              <button className="modal-close-button" onClick={() => void close()} aria-label={t('Cerrar')}><X /></button>
            </header>

            <div className={`dictation-microphone-stage ${error ? 'has-error' : ''}`}>
              <motion.button
                className={active ? 'recording' : ''}
                disabled={starting || stopping}
                onClick={() => active ? void stop() : void begin(true)}
                animate={active ? { boxShadow: ['0 0 0 0 rgba(244,117,166,.35)', '0 0 0 20px rgba(244,117,166,0)', '0 0 0 0 rgba(244,117,166,0)'] } : {}}
                transition={{ duration: 1.6, repeat: active ? Infinity : 0 }}
              >
                {active ? <MicOff /> : error ? <RotateCcw /> : <Mic />}
              </motion.button>
              <div><b>{statusTitle}</b><small>{statusDescription}</small>{deviceName && <em>{deviceName}</em>}</div>
            </div>

            <label className="dictation-textbox">
              <span>{t('Texto reconocido')}</span>
              <textarea
                value={text}
                onChange={(event) => { manualEdit.current = true; setText(event.target.value); }}
                placeholder={t('Lo que digas aparecerá aquí…')}
              />
            </label>

            {error && <motion.p className="dictation-error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>{error}</motion.p>}

            <footer>
              <button className="secondary" onClick={() => void copy()} disabled={!text.trim()}><Clipboard />{copied ? t('Copiado') : t('Copiar al portapapeles')}</button>
              <button className="secondary" onClick={() => void close()}><X />{t('Cancelar')}</button>
              <button className="primary" onClick={() => void insert()} disabled={!text.trim()}><Check />{t('Añadir a la nota')}</button>
            </footer>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(dialog, document.body);
}

export function DictationHost() {
  const [noteId, setNoteId] = useState('');
  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent<{ noteId?: string }>).detail;
      if (detail?.noteId) setNoteId(detail.noteId);
    };
    window.addEventListener('chibi:open-dictation', open);
    return () => window.removeEventListener('chibi:open-dictation', open);
  }, []);
  return <DictationDialog open={Boolean(noteId)} noteId={noteId} onClose={() => setNoteId('')} />;
}
