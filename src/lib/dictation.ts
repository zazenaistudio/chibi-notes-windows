import { backendRequest } from './backend';

export type VoiceAvailability={available:boolean;modelPath?:string;deviceName?:string;sampleRate?:number;error?:string};

export type DictationPoll = {
  sessionId: string;
  active: boolean;
  ready: boolean;
  text: string;
  partial: string;
  displayText: string;
  error: string;
  duration?: number;
};

let activeSessionId = '';

export function openDictationForNote(noteId: string) {
  window.dispatchEvent(new CustomEvent('chibi:open-dictation', { detail: { noteId } }));
}

export async function checkDictationAvailability(language='es-ES'){
  const status=await backendRequest<VoiceAvailability>('voice.status',{language});
  if(!status.available)throw new Error(status.error||'El reconocimiento de voz no está disponible.');
  return status;
}

export async function startDictationSession(language = 'es-ES', duration = 180) {
  if (activeSessionId) await discardDictationSession(activeSessionId).catch(() => undefined);
  const availability=await checkDictationAvailability(language);
  const sessionId = crypto.randomUUID();
  await backendRequest('voice.start', {
    sessionId,
    language,
    duration: Math.max(30, Math.min(duration, 600)),
    sampleRate: availability.sampleRate,
  });
  activeSessionId = sessionId;
  return {sessionId,availability};
}

export async function pollDictationSession(sessionId: string) {
  return backendRequest<DictationPoll>('voice.poll', { sessionId });
}

export async function stopDictationSession(sessionId = activeSessionId) {
  if (!sessionId) return;
  await backendRequest('voice.stop', { sessionId });
}

export async function discardDictationSession(sessionId = activeSessionId) {
  if (!sessionId) return;
  await backendRequest('voice.discard', { sessionId }).catch(() => undefined);
  if (activeSessionId === sessionId) activeSessionId = '';
}

export function clearActiveDictation(sessionId: string) {
  if (activeSessionId === sessionId) activeSessionId = '';
}
