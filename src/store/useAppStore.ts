import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import backgroundsJson from '../data/backgrounds.generated.json';
import mascotsJson from '../data/mascots.generated.json';
import type { AppLanguage, AssetItem, Customization, InterfaceThemeSettings, Note, NoteGroup, SavedTheme, SoundSettings } from '../types';
import { DEFAULT_CUSTOMIZATION, deepClone } from '../data/options';
import { BUILTIN_THEMES } from '../data/builtinThemes';
import { DEFAULT_INTERFACE_THEME, INTERFACE_PALETTES } from '../data/interfacePalettes';
import { pickRandom, uid } from '../lib/utils';
import { applyGroupPatch, dedupeGroupsById, mergeGroupsByUpdatedAt, normalizeGroupId } from '../lib/groupMetrics';

export const APP_STORAGE_KEY = 'chibi-notes-state-v1';

const builtinBackgrounds = backgroundsJson as AssetItem[];
const builtinMascots = mascotsJson as AssetItem[];
const now = () => new Date().toISOString();
const builtinThemeIds = new Set(BUILTIN_THEMES.map((theme) => theme.id));

export const DEFAULT_NOTE_ICON = '/assets/note-icons/documentos_y_datos/002_cuaderno.png';
export const GROUP_ICONS = ['🐣', '📁', '⭐', '💼', '📚', '💡', '🎨', '🏠', '🛒', '🎮', '🎵', '🌸', '☕', '🚀', '💖', '🌙', '🐾', '🧸', '🍓', '🌈'];
export const DEFAULT_SOUND_SETTINGS: SoundSettings = { enabled: true, volume: 0.58, hover: true, typing: false, startup: true, notifications: true };

export const mergeCustomization = (value?: Partial<Customization>): Customization => {
  const merged = deepClone(DEFAULT_CUSTOMIZATION) as Customization;
  if (!value) return merged;
  (Object.keys(merged) as (keyof Customization)[]).forEach((key) => Object.assign(merged[key] as object, (value[key] || {}) as object));
  return merged;
};

const mascotFor = (customization: Customization, all: AssetItem[]) => {
  if (customization.mascot.mode === 'none') return '';
  if (customization.mascot.mode === 'fixed') return customization.mascot.mascotId;
  const pool = all.filter((item) => !customization.mascot.packId || item.packId === customization.mascot.packId);
  return pickRandom(pool)?.id || all[0]?.id || '';
};

const normalizeNote = (note: Note, allMascots: AssetItem[], defaultGroupId = ''): Note => {
  const customization = mergeCustomization(note.customization);
  const assigned = allMascots.some((item) => item.id === note.assignedMascotId) ? note.assignedMascotId : mascotFor(customization, allMascots);
  const cleanBody = (note.body || '')
    .replace(/Escribe una idea brillante, una tarea urgente o algo (?:completamente )?absurdo\.?(?: O algo absurdo)?/gi, 'Escribe una idea brillante, una tarea importante o un recuerdo kawaii.')
    .replace(/completamente absurdo/gi, 'totalmente kawaii')
    .replace(/algo absurdo/gi, 'algo kawaii');
  const cleanItems = (note.items || []).map((item) => ({ ...item, text: item.text.replace(/mascota ridícula/gi, 'mascota kawaii') }));
  const normalizedMyDay = Boolean((note as Note & { myDay?: boolean }).myDay);
  const normalizedGroup = normalizeGroupId(note.groupId === undefined ? defaultGroupId : note.groupId);
  const resources = Array.isArray((note as Note & { resources?: unknown }).resources)
    ? note.resources.filter((resource) => resource && typeof resource.id === 'string' && (resource.kind === 'file' || resource.kind === 'web') && typeof resource.title === 'string' && typeof resource.value === 'string')
    : [];
  return {
    ...note,
    title: note.title || 'Sin título',
    icon: note.icon?.startsWith('/assets/note-icons/') ? note.icon : DEFAULT_NOTE_ICON,
    groupId: normalizedMyDay && !normalizedGroup ? '__myday__' : normalizedGroup,
    myDay: normalizedMyDay,
    body: cleanBody,
    items: cleanItems,
    locked: Boolean(note.locked),
    protected: Boolean((note as Note & { protected?: boolean }).protected || note.id === 'note-mi-nota-chibi'),
    systemKey: (note as Note & { systemKey?: string }).systemKey,
    category: note.category || 'General',
    tags: note.tags || [],
    reminderAt: note.reminderAt || '',
    attachments: note.attachments || [],
    resources,
    drawing: note.drawing || '',
    customization,
    assignedMascotId: assigned,
  };
};

const seedDate = (minute: number) => `2026-08-04T08:${String(minute).padStart(2, '0')}:00.000Z`;

const DEFAULT_GROUPS: NoteGroup[] = [
  { id: 'group-weekly-planning', systemKey: 'weekly-planning', name: 'Planificación Semanal', icon: '📅', color: '#a9d7ff', createdAt: seedDate(1), updatedAt: seedDate(1) },
  { id: 'group-active-projects', systemKey: 'active-projects', name: 'Proyectos Activos', icon: '🚀', color: '#c4afff', createdAt: seedDate(2), updatedAt: seedDate(2) },
  { id: 'group-leisure-hobbies', systemKey: 'leisure-hobbies', name: 'Ocio y Hobbies', icon: '🎮', color: '#ffb9d7', createdAt: seedDate(3), updatedAt: seedDate(3) },
  { id: 'group-health-diet', systemKey: 'health-diet', name: 'Salud y Dieta', icon: '🌿', color: '#aee6bd', createdAt: seedDate(4), updatedAt: seedDate(4) },
  { id: 'group-plans-events', systemKey: 'plans-events', name: 'Planes y Eventos', icon: '🎉', color: '#ffd59f', createdAt: seedDate(5), updatedAt: seedDate(5) },
  { id: 'group-important', systemKey: 'important', name: 'Importantes', icon: '⭐', color: '#ffd76b', createdAt: seedDate(6), updatedAt: seedDate(6) },
];

const seedNote = (data: {
  id: string;
  systemKey: string;
  title: string;
  groupId?: string;
  myDay?: boolean;
  icon?: string;
  body?: string;
  items?: string[];
  pinned?: boolean;
  protected?: boolean;
  minute: number;
}): Note => {
  const customization = mergeCustomization();
  return {
    id: data.id,
    systemKey: data.systemKey,
    protected: Boolean(data.protected),
    title: data.title,
    icon: data.icon || DEFAULT_NOTE_ICON,
    groupId: data.groupId || '',
    myDay: Boolean(data.myDay),
    body: data.body || '',
    items: (data.items || []).map((text, index) => ({ id: `${data.id}-item-${index + 1}`, text, done: false })),
    kind: data.items?.length ? 'checklist' : 'text',
    pinned: Boolean(data.pinned),
    alwaysOnTop: false,
    archived: false,
    locked: false,
    category: 'General',
    tags: [],
    reminderAt: '',
    attachments: [],
    resources: [],
    drawing: '',
    createdAt: seedDate(data.minute),
    updatedAt: seedDate(data.minute),
    customization,
    assignedMascotId: mascotFor(customization, builtinMascots),
  };
};

const DEFAULT_NOTES: Note[] = [
  seedNote({
    id: 'note-mi-nota-chibi', systemKey: 'welcome', title: 'Mi nota chibi', protected: true, pinned: true, minute: 59,
    body: 'Guarda tus ideas, tareas y recuerdos en un espacio totalmente kawaii.',
    items: ['Personalizar el fondo', 'Elegir una mascota kawaii', 'Organizar mis notas por grupos'],
  }),
  seedNote({ id: 'note-tareas-hoy', systemKey: 'today-tasks', title: 'Tareas de Hoy', groupId: '__myday__', myDay: true, minute: 10, icon: '/assets/note-icons/documentos_y_datos/003_portapapeles_tareas_1.png', body: 'Anota aquí lo más importante del día.', items: ['Tarea principal', 'Una tarea rápida', 'Algo para ti'] }),
  ...['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((title, index) => seedNote({ id: `note-week-${index + 1}`, systemKey: `week-${index + 1}`, title, groupId: 'group-weekly-planning', minute: 11 + index, icon: '/assets/note-icons/comunicacion_y_organizacion/009_calendario_1.png', body: `Planificación para ${title.toLowerCase()}.` })),
  seedNote({ id: 'note-project-work', systemKey: 'project-work', title: 'Laboral', groupId: 'group-active-projects', minute: 20, icon: '/assets/note-icons/documentos_y_datos/003_portapapeles_tareas_1.png' }),
  seedNote({ id: 'note-project-study', systemKey: 'project-study', title: 'Estudio', groupId: 'group-active-projects', minute: 21, icon: '/assets/note-icons/documentos_y_datos/001_libro.png' }),
  seedNote({ id: 'note-projects', systemKey: 'projects', title: 'Proyectos', groupId: 'group-active-projects', minute: 22, icon: '/assets/note-icons/multimedia_y_sonido/002_carpeta.png' }),
  seedNote({ id: 'note-movies-series', systemKey: 'movies-series', title: 'Películas y Series', groupId: 'group-leisure-hobbies', minute: 23, icon: '/assets/note-icons/multimedia_y_sonido/006_reproducir.png' }),
  seedNote({ id: 'note-gym', systemKey: 'gym', title: 'Gimnasio', groupId: 'group-leisure-hobbies', minute: 24, icon: '/assets/note-icons/salud_bienestar/001_estetoscopio.png' }),
  seedNote({ id: 'note-playlists', systemKey: 'playlists', title: 'Playlists', groupId: 'group-leisure-hobbies', minute: 25, icon: '/assets/note-icons/multimedia_y_sonido/007_musica.png' }),
  seedNote({ id: 'note-pending-games', systemKey: 'pending-games', title: 'Juegos Pendientes', groupId: 'group-leisure-hobbies', minute: 26, icon: '/assets/note-icons/recompensas_y_juegos/003_trofeo.png' }),
  seedNote({ id: 'note-books', systemKey: 'books', title: 'Libros', groupId: 'group-leisure-hobbies', minute: 27, icon: '/assets/note-icons/documentos_y_datos/001_libro.png' }),
  seedNote({ id: 'note-daily-meals', systemKey: 'daily-meals', title: 'Comidas Diarias', groupId: 'group-health-diet', minute: 28, icon: '/assets/note-icons/comida/004_pan.png' }),
  seedNote({ id: 'note-healthy-food', systemKey: 'healthy-food', title: 'Alimentación Sana', groupId: 'group-health-diet', minute: 29, icon: '/assets/note-icons/comida/001_manzana.png' }),
  seedNote({ id: 'note-forbidden-food', systemKey: 'forbidden-food', title: 'Alimentos Prohibidos', groupId: 'group-health-diet', minute: 30, icon: '/assets/note-icons/comida/003_zanahoria.png' }),
  seedNote({ id: 'note-upcoming-events', systemKey: 'upcoming-events', title: 'Próximos Eventos', groupId: 'group-plans-events', minute: 31, icon: '/assets/note-icons/comunicacion_y_organizacion/013_calendario_2.png' }),
  seedNote({ id: 'note-social-plans', systemKey: 'social-plans', title: 'Planes Sociales', groupId: 'group-plans-events', minute: 32, icon: '/assets/note-icons/navegacion_y_edicion/009_corazon.png' }),
  seedNote({ id: 'note-priorities', systemKey: 'priorities', title: 'Prioridades', groupId: 'group-important', minute: 33, icon: '/assets/note-icons/navegacion_y_edicion/013_favorito_estrella.png', pinned: true }),
];

const cloneSeedGroups = () => DEFAULT_GROUPS.map((group) => ({ ...group }));
const cloneSeedNotes = () => DEFAULT_NOTES.map((note) => deepClone(note));

const preserveWelcomeNote = (incoming: Note[], local: Note[]) => {
  const result = [...incoming];
  const welcome = local.find((note) => note.id === 'note-mi-nota-chibi') || cloneSeedNotes().find((note) => note.id === 'note-mi-nota-chibi');
  if (welcome && !result.some((note) => note.id === welcome.id)) result.push(welcome);
  return result;
};

const ensureSeedStructure = (notes: Note[], groups: NoteGroup[]) => {
  const nextGroups = [...groups];
  for (const group of cloneSeedGroups()) if (!nextGroups.some((item) => item.id === group.id)) nextGroups.push(group);
  const nextNotes = [...notes];
  for (const note of cloneSeedNotes()) if (!nextNotes.some((item) => item.id === note.id)) nextNotes.push(note);
  return { notes: nextNotes, groups: nextGroups };
};

type AssetKind = 'background' | 'mascot' | 'frame';
export type SidebarVisibilityMode = 'all' | 'active';
export type SidebarSortMode = 'az' | 'za' | 'created';

export type State = {
  notes: Note[];
  groups: NoteGroup[];
  selectedNoteId: string;
  customBackgrounds: AssetItem[];
  customMascots: AssetItem[];
  customFrames: AssetItem[];
  themes: SavedTheme[];
  availableTags: string[];
  panelOpen: boolean;
  sidebarCollapsed: boolean;
  sidebarGroupsExpanded: boolean;
  sidebarNotesExpanded: boolean;
  sidebarGroupsMode: SidebarVisibilityMode;
  sidebarNotesMode: SidebarVisibilityMode;
  sidebarGroupsSort: SidebarSortMode;
  sidebarNotesSort: SidebarSortMode;
  interfaceTheme: InterfaceThemeSettings;
  soundSettings: SoundSettings;
  interfaceLanguage: AppLanguage;
  defaultSeedVersion: number;
  notesRevision: number;
  groupsRevision: number;
  selectNote: (id: string) => void;
  createNote: (groupId?: string) => string;
  duplicateNote: (id: string) => void;
  deleteNote: (id: string) => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  updateCustomization: (path: string, value: unknown) => void;
  applyCustomization: (customization: Customization) => void;
  createGroup: (name: string, icon?: string, color?: string) => string;
  updateGroup: (id: string, patch: Partial<Pick<NoteGroup, 'name' | 'icon' | 'color'>>) => void;
  deleteGroup: (id: string) => void;
  assignNoteToGroup: (noteId: string, groupId: string) => void;
  reshuffleMascot: () => void;
  setPanelOpen: (value: boolean) => void;
  setSidebarCollapsed: (value: boolean) => void;
  toggleSidebar: () => void;
  setSidebarGroupsExpanded: (value: boolean) => void;
  toggleSidebarGroups: () => void;
  setSidebarNotesExpanded: (value: boolean) => void;
  toggleSidebarNotes: () => void;
  setSidebarGroupsMode: (mode: SidebarVisibilityMode) => void;
  setSidebarNotesMode: (mode: SidebarVisibilityMode) => void;
  setSidebarGroupsSort: (mode: SidebarSortMode) => void;
  setSidebarNotesSort: (mode: SidebarSortMode) => void;
  addBackground: (asset: AssetItem) => void;
  addMascot: (asset: AssetItem) => void;
  addFrame: (asset: AssetItem) => void;
  editAsset: (kind: AssetKind, id: string, patch: Partial<AssetItem>) => void;
  deleteAsset: (kind: AssetKind, id: string) => void;
  saveTheme: (name: string, description?: string) => void;
  applyTheme: (id: string) => void;
  deleteTheme: (id: string) => void;
  importTheme: (theme: SavedTheme) => void;
  addAvailableTag: (tag: string) => void;
  renameAvailableTag: (tag: string, next: string) => void;
  deleteAvailableTag: (tag: string) => void;
  hydrateFromBackend: (notes: Note[], groups: NoteGroup[], themes: SavedTheme[], assets: (AssetItem & { kind?: AssetKind })[]) => void;
  updateInterfaceTheme: (patch: Partial<InterfaceThemeSettings>) => void;
  applyInterfacePalette: (paletteId: string) => void;
  updateSoundSettings: (patch: Partial<SoundSettings>) => void;
  setInterfaceLanguage: (language: AppLanguage) => void;
};

const fresh = ensureSeedStructure([], []);

export const useAppStore = create<State>()(persist((set, get) => ({
  notes: fresh.notes,
  groups: fresh.groups,
  selectedNoteId: 'note-mi-nota-chibi',
  customBackgrounds: [],
  customMascots: [],
  customFrames: [],
  themes: BUILTIN_THEMES,
  availableTags: [],
  panelOpen: false,
  sidebarCollapsed: false,
  sidebarGroupsExpanded: true,
  sidebarNotesExpanded: true,
  sidebarGroupsMode: 'all',
  sidebarNotesMode: 'all',
  sidebarGroupsSort: 'created',
  sidebarNotesSort: 'created',
  interfaceTheme: { ...DEFAULT_INTERFACE_THEME },
  soundSettings: { ...DEFAULT_SOUND_SETTINGS },
  interfaceLanguage: 'es',
  defaultSeedVersion: 1,
  notesRevision: 0,
  groupsRevision: 0,

  selectNote: (id) => set({ selectedNoteId: id }),
  createNote: (groupId) => {
    const state = get();
    const targetGroup = normalizeGroupId(groupId);
    const customization = mergeCustomization();
    const all = [...builtinMascots, ...state.customMascots];
    const id = uid('note');
    const note: Note = {
      ...seedNote({ id, systemKey: '', title: state.interfaceLanguage === 'en' ? 'New note' : 'Nueva nota', groupId: targetGroup, myDay: targetGroup === '__myday__', minute: 0 }),
      id,
      systemKey: undefined,
      protected: false,
      createdAt: now(),
      updatedAt: now(),
      customization,
      assignedMascotId: mascotFor(customization, all),
    };
    set({ notes: [note, ...state.notes], selectedNoteId: id, notesRevision: state.notesRevision + 1 });
    return id;
  },
  duplicateNote: (id) => set((state) => {
    const source = state.notes.find((note) => note.id === id);
    if (!source) return state;
    const note: Note = { ...deepClone(source), id: uid('note'), systemKey: undefined, protected: false, title: `${source.title} (${state.interfaceLanguage === 'en' ? 'copy' : 'copia'})`, createdAt: now(), updatedAt: now() };
    return { notes: [note, ...state.notes], selectedNoteId: note.id, notesRevision: state.notesRevision + 1 };
  }),
  deleteNote: (id) => set((state) => {
    const target = state.notes.find((note) => note.id === id);
    if (!target || target.protected) return state;
    const notes = state.notes.filter((note) => note.id !== id);
    return { notes, selectedNoteId: notes[0]?.id || '', notesRevision: state.notesRevision + 1 };
  }),
  updateNote: (id, patch) => set((state) => {
    const normalizedPatch = typeof patch.groupId === 'string' ? { ...patch, groupId: normalizeGroupId(patch.groupId) } : patch;
    let changed = false;
    const notes = state.notes.map((note) => {
      if (note.id !== id) return note;
      changed = true;
      return { ...note, ...normalizedPatch, protected: note.protected, systemKey: note.systemKey, updatedAt: now() };
    });
    return changed ? { notes, notesRevision: state.notesRevision + 1 } : state;
  }),
  updateCustomization: (path, value) => set((state) => {
    const id = state.selectedNoteId || state.notes[0]?.id;
    return {
      notes: state.notes.map((note) => {
        if (note.id !== id) return note;
        const customization = mergeCustomization(note.customization) as any;
        const keys = path.split('.');
        let cursor = customization;
        for (let index = 0; index < keys.length - 1; index++) cursor = cursor[keys[index]];
        cursor[keys.at(-1)!] = value;
        let assigned = note.assignedMascotId;
        if (path === 'mascot.mascotId' || path === 'mascot.mode' || path === 'mascot.packId') assigned = mascotFor(customization, [...builtinMascots, ...state.customMascots]);
        return { ...note, customization, assignedMascotId: assigned, updatedAt: now() };
      }),
      notesRevision: state.notesRevision + 1,
    };
  }),
  applyCustomization: (customization) => set((state) => {
    const id = state.selectedNoteId || state.notes[0]?.id;
    const merged = mergeCustomization(customization);
    return { notes: state.notes.map((note) => note.id === id ? { ...note, customization: merged, assignedMascotId: mascotFor(merged, [...builtinMascots, ...state.customMascots]), updatedAt: now() } : note), notesRevision: state.notesRevision + 1 };
  }),
  createGroup: (name, icon = '📁', color = '#9fdfff') => {
    const id = uid('group');
    const cleanIcon = typeof icon === 'string' && icon.trim() ? icon.trim() : '📁';
    const group: NoteGroup = { id, name: name.trim() || (get().interfaceLanguage === 'en' ? 'New group' : 'Nuevo grupo'), icon: cleanIcon, color, createdAt: now(), updatedAt: now() };
    set((state) => ({ groups: [...state.groups, group], groupsRevision: state.groupsRevision + 1 }));
    return id;
  },
  updateGroup: (id, patch) => {
    const targetId = normalizeGroupId(id);
    if (!targetId) return;
    const state = get();
    const updatedAt = now();
    let found = false;
    const groups = dedupeGroupsById(state.groups).map((group) => {
      if (normalizeGroupId(group.id) !== targetId) return group;
      found = true;
      const result = applyGroupPatch(group, patch, updatedAt);
      return { ...result.group };
    });
    if (!found) return;
    set({ groups: [...groups], groupsRevision: state.groupsRevision + 1 });
    if (typeof window !== 'undefined') {
      const updated = groups.find((group) => normalizeGroupId(group.id) === targetId);
      window.dispatchEvent(new CustomEvent('chibi:group-updated', { detail: updated ? { ...updated } : { id: targetId } }));
    }
  },
  deleteGroup: (id) => set((state) => ({
    groups: state.groups.filter((group) => group.id !== id),
    notes: state.notes.map((note) => note.groupId === id ? { ...note, groupId: note.myDay ? '__myday__' : '', updatedAt: now() } : note),
    groupsRevision: state.groupsRevision + 1,
    notesRevision: state.notesRevision + 1,
  })),
  assignNoteToGroup: (noteId, groupId) => set((state) => {
    const targetGroup = normalizeGroupId(groupId);
    return { notes: state.notes.map((note) => note.id === noteId ? { ...note, groupId: targetGroup, myDay: targetGroup === '__myday__', archived: false, updatedAt: now() } : note), notesRevision: state.notesRevision + 1 };
  }),
  reshuffleMascot: () => set((state) => {
    const id = state.selectedNoteId || state.notes[0]?.id;
    return { notes: state.notes.map((note) => note.id === id ? { ...note, assignedMascotId: mascotFor(mergeCustomization(note.customization), [...builtinMascots, ...state.customMascots]) } : note), notesRevision: state.notesRevision + 1 };
  }),
  setPanelOpen: (value) => set({ panelOpen: value }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
  setSidebarGroupsExpanded: (value) => set({ sidebarGroupsExpanded: value }),
  toggleSidebarGroups: () => set((state) => ({ sidebarGroupsExpanded: !state.sidebarGroupsExpanded })),
  setSidebarNotesExpanded: (value) => set({ sidebarNotesExpanded: value }),
  toggleSidebarNotes: () => set((state) => ({ sidebarNotesExpanded: !state.sidebarNotesExpanded })),
  setSidebarGroupsMode: (sidebarGroupsMode) => set({ sidebarGroupsMode }),
  setSidebarNotesMode: (sidebarNotesMode) => set({ sidebarNotesMode }),
  setSidebarGroupsSort: (sidebarGroupsSort) => set({ sidebarGroupsSort }),
  setSidebarNotesSort: (sidebarNotesSort) => set({ sidebarNotesSort }),
  updateInterfaceTheme: (patch) => set((state) => ({ interfaceTheme: { ...state.interfaceTheme, ...patch } })),
  applyInterfacePalette: (paletteId) => set((state) => {
    const palette = INTERFACE_PALETTES.find((item) => item.id === paletteId);
    return palette ? { interfaceTheme: { ...palette.colors, paletteId } } : state;
  }),
  updateSoundSettings: (patch) => set((state) => ({ soundSettings: { ...state.soundSettings, ...patch } })),
  setInterfaceLanguage: (interfaceLanguage) => set({ interfaceLanguage }),
  addBackground: (asset) => set((state) => ({ customBackgrounds: [asset, ...state.customBackgrounds] })),
  addMascot: (asset) => set((state) => ({ customMascots: [asset, ...state.customMascots] })),
  addFrame: (asset) => set((state) => ({ customFrames: [asset, ...state.customFrames] })),
  editAsset: (kind, id, patch) => set((state) => kind === 'background'
    ? { customBackgrounds: state.customBackgrounds.map((asset) => asset.id === id ? { ...asset, ...patch } : asset) }
    : kind === 'mascot'
      ? { customMascots: state.customMascots.map((asset) => asset.id === id ? { ...asset, ...patch } : asset) }
      : { customFrames: state.customFrames.map((asset) => asset.id === id ? { ...asset, ...patch } : asset) }),
  deleteAsset: (kind, id) => set((state) => kind === 'background'
    ? { customBackgrounds: state.customBackgrounds.filter((asset) => asset.id !== id) }
    : kind === 'mascot'
      ? { customMascots: state.customMascots.filter((asset) => asset.id !== id) }
      : { customFrames: state.customFrames.filter((asset) => asset.id !== id) }),
  saveTheme: (name, description = 'Combinación personalizada') => set((state) => {
    const note = state.notes.find((item) => item.id === (state.selectedNoteId || state.notes[0]?.id));
    if (!note) return state;
    const theme: SavedTheme = { id: uid('theme'), name, description, createdAt: now(), builtin: false, customization: mergeCustomization(note.customization) };
    return { themes: [theme, ...state.themes] };
  }),
  applyTheme: (id) => {
    const theme = get().themes.find((item) => item.id === id);
    if (theme) get().applyCustomization(mergeCustomization(theme.customization));
  },
  deleteTheme: (id) => set((state) => ({ themes: state.themes.filter((theme) => theme.builtin || theme.id !== id) })),
  importTheme: (theme) => set((state) => ({ themes: [{ ...theme, id: uid('theme'), builtin: false, customization: mergeCustomization(theme.customization) }, ...state.themes] })),
  addAvailableTag: (tag) => set((state) => {
    const clean = tag.trim();
    if (!clean || state.availableTags.some((item) => item.toLocaleLowerCase() === clean.toLocaleLowerCase())) return state;
    return { availableTags: [...state.availableTags, clean].sort((a, b) => a.localeCompare(b, state.interfaceLanguage === 'en' ? 'en' : 'es')) };
  }),
  renameAvailableTag: (tag, next) => set((state) => {
    const clean = next.trim();
    if (!clean) return state;
    const availableTags = [...new Set(state.availableTags.map((item) => item === tag ? clean : item))].sort((a, b) => a.localeCompare(b, state.interfaceLanguage === 'en' ? 'en' : 'es'));
    const notes = state.notes.map((note) => note.tags.includes(tag) ? { ...note, tags: [...new Set(note.tags.map((item) => item === tag ? clean : item))], updatedAt: now() } : note);
    return { availableTags, notes, notesRevision: state.notesRevision + 1 };
  }),
  deleteAvailableTag: (tag) => set((state) => ({
    availableTags: state.availableTags.filter((item) => item !== tag),
    notes: state.notes.map((note) => note.tags.includes(tag) ? { ...note, tags: note.tags.filter((item) => item !== tag), updatedAt: now() } : note),
    notesRevision: state.notesRevision + 1,
  })),
  hydrateFromBackend: (backendNotes, backendGroups, themes, assets) => set((state) => {
    const customMascots = assets.filter((asset) => asset.kind === 'mascot');
    const allMascots = [...builtinMascots, ...customMascots];
    const normalizedBackendGroups = dedupeGroupsById(backendGroups.filter((group) => group.id !== 'group-general'));
    const normalizedBackendNotes = backendNotes.map((note) => {
      const normalized = normalizeNote(note, allMascots, '');
      return normalized.groupId === 'group-general' ? { ...normalized, groupId: '', myDay: false } : normalized;
    });
    const remoteGroups = normalizedBackendGroups.length ? mergeGroupsByUpdatedAt(state.groups, normalizedBackendGroups) : dedupeGroupsById(state.groups);
    const remoteNotes = normalizedBackendNotes.length ? normalizedBackendNotes : state.notes;
    const hydrated = state.defaultSeedVersion < 2
      ? ensureSeedStructure(remoteNotes, remoteGroups)
      : { notes: preserveWelcomeNote(remoteNotes, state.notes), groups: remoteGroups };
    const groups = dedupeGroupsById(hydrated.groups);
    const notes = hydrated.notes;
    const selectedNoteId = notes.some((note) => note.id === state.selectedNoteId)
      ? state.selectedNoteId
      : [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.id || notes.find((note) => note.id === 'note-mi-nota-chibi')?.id || '';
    return {
      notes,
      groups,
      selectedNoteId,
      themes: themes.length ? [...BUILTIN_THEMES, ...themes.filter((theme) => !builtinThemeIds.has(theme.id)).map((theme) => ({ ...theme, builtin: false, customization: mergeCustomization(theme.customization) }))] : state.themes,
      availableTags: [...new Set([...(state.availableTags || []), ...notes.flatMap((note) => note.tags || [])])].sort((a, b) => a.localeCompare(b, state.interfaceLanguage === 'en' ? 'en' : 'es')),
      customBackgrounds: assets.filter((asset) => asset.kind === 'background'),
      customMascots,
      customFrames: assets.filter((asset) => asset.kind === 'frame'),
      defaultSeedVersion: 2,
      notesRevision: state.notesRevision + 1,
      groupsRevision: state.groupsRevision + 1,
    };
  }),
}), {
  name: APP_STORAGE_KEY,
  version: 17,
  migrate: (persisted) => {
    const state = persisted as Partial<State>;
    const customMascots = state.customMascots || [];
    const all = [...builtinMascots, ...customMascots];
    const oldGroups = dedupeGroupsById((state.groups || []).filter((group) => group.id !== 'group-general'));
    const oldNotes = (state.notes || []).map((note) => {
      const normalized = normalizeNote(note, all, '');
      const customization = mergeCustomization(normalized.customization);
      if (customization.voice.dictationDuration <= 20) customization.voice.dictationDuration = 180;
      return {
        ...normalized,
        groupId: normalized.groupId === 'group-general' ? '' : normalized.groupId,
        myDay: normalized.groupId === 'group-general' ? false : normalized.myDay,
        customization,
      };
    });
    const seeded = state.defaultSeedVersion && state.defaultSeedVersion >= 1 ? { notes: oldNotes, groups: oldGroups } : ensureSeedStructure(oldNotes, oldGroups);
    const customThemes = (state.themes || []).filter((theme) => !builtinThemeIds.has(theme.id) && !theme.builtin).map((theme) => ({ ...theme, builtin: false, customization: mergeCustomization(theme.customization) }));
    const selectedNoteId = seeded.notes.some((note) => note.id === state.selectedNoteId)
      ? state.selectedNoteId!
      : [...seeded.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.id || seeded.notes.find((note) => note.id === 'note-mi-nota-chibi')?.id || '';
    return {
      ...state,
      notes: seeded.notes,
      groups: seeded.groups,
      selectedNoteId,
      panelOpen: false,
      sidebarCollapsed: state.sidebarCollapsed ?? false,
      sidebarGroupsExpanded: state.sidebarGroupsExpanded ?? true,
      sidebarNotesExpanded: state.sidebarNotesExpanded ?? true,
      sidebarGroupsMode: state.sidebarGroupsMode === 'active' ? 'active' : 'all',
      sidebarNotesMode: state.sidebarNotesMode === 'active' ? 'active' : 'all',
      sidebarGroupsSort: state.sidebarGroupsSort === 'az' || state.sidebarGroupsSort === 'za' ? state.sidebarGroupsSort : 'created',
      sidebarNotesSort: state.sidebarNotesSort === 'az' || state.sidebarNotesSort === 'za' ? state.sidebarNotesSort : 'created',
      interfaceTheme: { ...DEFAULT_INTERFACE_THEME, ...(state.interfaceTheme || {}) },
      soundSettings: { ...DEFAULT_SOUND_SETTINGS, ...(state.soundSettings || {}) },
      interfaceLanguage: state.interfaceLanguage === 'en' ? 'en' : 'es',
      defaultSeedVersion: state.defaultSeedVersion && state.defaultSeedVersion >= 2 ? 2 : 1,
      notesRevision: 0,
      groupsRevision: 0,
      customBackgrounds: state.customBackgrounds || [],
      customMascots,
      customFrames: state.customFrames || [],
      themes: [...BUILTIN_THEMES, ...customThemes],
      availableTags: [...new Set([...(state.availableTags || []), ...seeded.notes.flatMap((note) => note.tags || [])])].sort((a, b) => a.localeCompare(b, state.interfaceLanguage === 'en' ? 'en' : 'es')),
    } as State;
  },
  partialize: (state) => ({
    notes: state.notes,
    groups: state.groups,
    selectedNoteId: state.selectedNoteId,
    customBackgrounds: state.customBackgrounds,
    customMascots: state.customMascots,
    customFrames: state.customFrames,
    themes: state.themes,
    availableTags: state.availableTags,
    sidebarCollapsed: state.sidebarCollapsed,
    sidebarGroupsExpanded: state.sidebarGroupsExpanded,
    sidebarNotesExpanded: state.sidebarNotesExpanded,
    sidebarGroupsMode: state.sidebarGroupsMode,
    sidebarNotesMode: state.sidebarNotesMode,
    sidebarGroupsSort: state.sidebarGroupsSort,
    sidebarNotesSort: state.sidebarNotesSort,
    interfaceTheme: state.interfaceTheme,
    soundSettings: state.soundSettings,
    interfaceLanguage: state.interfaceLanguage,
    defaultSeedVersion: state.defaultSeedVersion,
  }),
}));

export const BUILTIN_BACKGROUNDS = builtinBackgrounds;
export const BUILTIN_MASCOTS = builtinMascots;
