import { AnimatePresence, motion } from 'framer-motion';
import { Archive, ArrowDownAZ, ArrowUpAZ, Bell, CalendarDays, ChevronDown, ChevronRight, Copy, Eye, Files, FolderInput, FolderPlus, Grid2X2, ListChecks, Mic, Minus, MonitorUp, Moon, Palette, PanelLeftClose, PanelLeftOpen, Pencil, Pin, Plus, Search, Square, Star, Trash2, Wrench, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { State as AppState } from '../store/useAppStore';
import { closeCurrentWindow, minimizeCurrentWindow, startCurrentWindowDragging, toggleMaximizeCurrentWindow } from '../lib/backend';
import { openShowcaseWidget } from '../lib/showcaseWidget';
import { startBackendSync } from '../lib/backendSync';
import { isTauri } from '../lib/utils';
import { htmlToText } from '../lib/richText';
import { openDictationForNote } from '../lib/dictation';
import { playSound } from '../lib/sounds';
import { NoteWidget } from './NoteWidget';
import { CustomizationPanel } from './CustomizationPanel';
import { NotesManagerPanel } from './NotesManagerPanel';
import { AppInfoModal } from './AppInfoModal';
import { FeatureHubPanel } from './FeatureHubPanel';
import { ContextMenu } from './ContextMenu';
import { GroupDialog } from './GroupDialog';
import { QuickTextDialog } from './QuickTextDialog';
import { ReminderDialog } from './ReminderDialog';
import { MoveNoteDialog } from './MoveNoteDialog';
import type { MoveDestination } from './MoveNoteDialog';
import type { Note, NoteGroup } from '../types';
import { NoteIcon } from './NoteIcon';
import { useI18n } from '../i18n';
import { requestConfirmation } from '../lib/confirm';
import { buildActiveGroupCounts, countActiveNotesForGroup, isActiveNoteInGroup, normalizeGroupId } from '../lib/groupMetrics';

type InfoTab = 'help' | 'about' | 'license';
type ManagerTab = 'notes' | 'tags';
type View = 'active' | 'archived' | 'myday';
type ContextTarget = { type: 'note' | 'group' | 'groups-header' | 'notes-header'; id: string; x: number; y: number } | null;


function SidebarGroupCount({ groupId }: { groupId: string }) {
  const selector = useMemo(() => (state: AppState) => countActiveNotesForGroup(state.notes, groupId), [groupId]);
  const count = useAppStore(selector);
  return <motion.em key={`${groupId}-${count}`} initial={{ scale: 0.82, opacity: 0.55 }} animate={{ scale: 1, opacity: 1 }}>{count}</motion.em>;
}

const dueToday = (note: Note) => {
  if (!note.reminderAt) return false;
  const value = new Date(note.reminderAt);
  if (Number.isNaN(value.getTime())) return false;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return value <= end;
};

export function ManagerApp() {
  const notes = useAppStore((state) => state.notes);
  const groups = useAppStore((state) => state.groups);
  const notesRevision = useAppStore((state) => state.notesRevision);
  const groupsRevision = useAppStore((state) => state.groupsRevision);
  const selectedId = useAppStore((state) => state.selectedNoteId);
  const selectNote = useAppStore((state) => state.selectNote);
  const createNote = useAppStore((state) => state.createNote);
  const duplicateNote = useAppStore((state) => state.duplicateNote);
  const deleteNote = useAppStore((state) => state.deleteNote);
  const updateNote = useAppStore((state) => state.updateNote);
  const createGroup = useAppStore((state) => state.createGroup);
  const updateGroup = useAppStore((state) => state.updateGroup);
  const deleteGroup = useAppStore((state) => state.deleteGroup);
  const panelOpen = useAppStore((state) => state.panelOpen);
  const setPanelOpen = useAppStore((state) => state.setPanelOpen);
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const sidebarGroupsExpanded = useAppStore((state) => state.sidebarGroupsExpanded);
  const toggleSidebarGroups = useAppStore((state) => state.toggleSidebarGroups);
  const setSidebarGroupsExpanded = useAppStore((state) => state.setSidebarGroupsExpanded);
  const sidebarNotesExpanded = useAppStore((state) => state.sidebarNotesExpanded);
  const toggleSidebarNotes = useAppStore((state) => state.toggleSidebarNotes);
  const setSidebarNotesExpanded = useAppStore((state) => state.setSidebarNotesExpanded);
  const sidebarGroupsMode = useAppStore((state) => state.sidebarGroupsMode);
  const setSidebarGroupsMode = useAppStore((state) => state.setSidebarGroupsMode);
  const sidebarNotesMode = useAppStore((state) => state.sidebarNotesMode);
  const setSidebarNotesMode = useAppStore((state) => state.setSidebarNotesMode);
  const sidebarGroupsSort = useAppStore((state) => state.sidebarGroupsSort);
  const setSidebarGroupsSort = useAppStore((state) => state.setSidebarGroupsSort);
  const sidebarNotesSort = useAppStore((state) => state.sidebarNotesSort);
  const setSidebarNotesSort = useAppStore((state) => state.setSidebarNotesSort);
  const interfaceTheme = useAppStore((state) => state.interfaceTheme);
  const { t } = useI18n();

  const initialNote = notes.find((note) => note.id === selectedId) || notes.find((note) => note.id === 'note-mi-nota-chibi') || notes[0];
  const [titleQuery, setTitleQuery] = useState('');
  const [titleFocused, setTitleFocused] = useState(false);
  const [view, setView] = useState<View>(() => initialNote?.archived ? 'archived' : initialNote?.groupId === '__myday__' || initialNote?.myDay ? 'myday' : 'active');
  const [groupFilter, setGroupFilter] = useState(() => initialNote?.groupId && initialNote.groupId !== '__myday__' ? initialNote.groupId : 'desktop');
  const [desktopOverview, setDesktopOverview] = useState(false);
  const [archiveOverview, setArchiveOverview] = useState(false);
  const [groupOverview, setGroupOverview] = useState(false);
  const [myDayOverview, setMyDayOverview] = useState(false);
  const [message, setMessage] = useState('');
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerTab, setManagerTab] = useState<ManagerTab>('notes');
  const [featureHubOpen, setFeatureHubOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoTab, setInfoTab] = useState<InfoTab>('help');
  const [focusMode, setFocusMode] = useState(false);
  const [context, setContext] = useState<ContextTarget>(null);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<NoteGroup | undefined>();
  const [renameNote, setRenameNote] = useState<Note | undefined>();
  const [reminderNote, setReminderNote] = useState<Note | undefined>();
  const [moveNote, setMoveNote] = useState<Note | undefined>();
  const [groupVisualRevision, setGroupVisualRevision] = useState(0);

  const titleSearchRef = useRef<HTMLInputElement>(null);

  const noteCollections = useMemo(() => {
    const activeByGroup = new Map<string, Note[]>();
    const countByGroup = buildActiveGroupCounts(notes, groups.map((group) => group.id));
    groups.forEach((group) => {
      const id = normalizeGroupId(group.id);
      activeByGroup.set(id, []);
    });
    const desktop: Note[] = [];
    const myDay: Note[] = [];
    const archived: Note[] = [];
    const active: Note[] = [];

    for (const note of notes) {
      const locationId = normalizeGroupId(note.groupId);
      if (note.archived) {
        archived.push(note);
        continue;
      }
      active.push(note);
      if (locationId && locationId !== '__myday__') {
        const collection = activeByGroup.get(locationId);
        if (collection) {
          collection.push(note);
        } else desktop.push(note);
      } else if (!locationId) desktop.push(note);
      if (locationId === '__myday__' || note.myDay || dueToday(note)) myDay.push(note);
    }

    const sortDefault = (items: Note[]) => [...items].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
    for (const [id, collection] of activeByGroup) activeByGroup.set(id, sortDefault(collection));
    return {
      active: sortDefault(active),
      desktop: sortDefault(desktop),
      myDay: sortDefault(myDay),
      archived: sortDefault(archived),
      activeByGroup,
      countByGroup,
    };
  }, [notes, groups, notesRevision, groupsRevision]);

  const visibleNotes = useMemo(() => {
    if (view === 'archived') return noteCollections.archived;
    if (view === 'myday') return noteCollections.myDay;
    if (groupFilter === 'desktop') return noteCollections.desktop;
    return noteCollections.activeByGroup.get(groupFilter) || [];
  }, [noteCollections, view, groupFilter]);

  const selected = visibleNotes.find((note) => note.id === (selectedId || visibleNotes[0]?.id)) || visibleNotes[0];

  const titleSuggestions = useMemo(() => {
    const query = titleQuery.trim().toLocaleLowerCase('es-ES');
    const source = query ? notes.filter((note) => (note.title || 'Sin título').toLocaleLowerCase('es-ES').includes(query)) : notes;
    return source.slice(0, 8);
  }, [notes, titleQuery]);

  const filtered = useMemo(() => {
    const query = titleQuery.trim().toLocaleLowerCase('es-ES');
    return query ? visibleNotes.filter((note) => (note.title || 'Sin título').toLocaleLowerCase('es-ES').includes(query)) : visibleNotes;
  }, [visibleNotes, titleQuery]);

  const activeNotesCount = noteCollections.active.length;
  const archivedNotesCount = noteCollections.archived.length;
  const myDayNotesCount = noteCollections.myDay.length;
  const currentGroup = useMemo(() => groupFilter !== 'desktop' ? groups.find((group) => group.id.trim() === groupFilter.trim()) : undefined, [groups, groupFilter, groupsRevision, groupVisualRevision]);
  const currentGroupId = currentGroup?.id.trim() || '';
  const currentGroupCountSelector = useMemo(() => (state: AppState) => countActiveNotesForGroup(state.notes, currentGroupId), [currentGroupId]);
  const currentGroupActiveCount = useAppStore(currentGroupCountSelector);
  const groupScopedNotes = useMemo(() => ({
    active: groupFilter === 'desktop'
      ? noteCollections.desktop
      : notes.filter((note) => isActiveNoteInGroup(note, currentGroupId)).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)),
    archived: noteCollections.archived.filter((note) => groupFilter === 'desktop' ? !normalizeGroupId(note.groupId) : normalizeGroupId(note.groupId) === currentGroupId),
  }), [noteCollections, notes, groupFilter, currentGroupId, notesRevision]);
  const dueTodayCount = useMemo(() => noteCollections.myDay.filter(dueToday).length, [noteCollections]);
  const pinnedInFiltered = filtered.filter((note) => note.pinned).length;

  const interfaceStyle = {
    '--ui-bg': interfaceTheme.background,
    '--ui-surface': interfaceTheme.surface,
    '--ui-surface-alt': interfaceTheme.surfaceAlt,
    '--ui-primary': interfaceTheme.primary,
    '--ui-secondary': interfaceTheme.secondary,
    '--ui-accent': interfaceTheme.accent,
    '--ui-text': interfaceTheme.text,
    '--ui-muted': interfaceTheme.muted,
    '--ui-button': interfaceTheme.button,
    '--ui-button-hover': interfaceTheme.buttonHover,
    '--ui-border': interfaceTheme.border,
    '--ui-danger': interfaceTheme.danger,
    '--ui-panel-opacity': interfaceTheme.panelOpacity,
    '--ui-glow': `${interfaceTheme.glow}px`,
  } as CSSProperties;

  useEffect(() => {
    const root = document.documentElement;
    const variables: Record<string, string> = {
      '--ui-bg': interfaceTheme.background, '--ui-surface': interfaceTheme.surface, '--ui-surface-alt': interfaceTheme.surfaceAlt,
      '--ui-primary': interfaceTheme.primary, '--ui-secondary': interfaceTheme.secondary, '--ui-accent': interfaceTheme.accent,
      '--ui-text': interfaceTheme.text, '--ui-muted': interfaceTheme.muted, '--ui-button': interfaceTheme.button,
      '--ui-button-hover': interfaceTheme.buttonHover, '--ui-border': interfaceTheme.border, '--ui-danger': interfaceTheme.danger,
      '--ui-panel-opacity': String(interfaceTheme.panelOpacity), '--ui-glow': `${interfaceTheme.glow}px`,
    };
    Object.entries(variables).forEach(([key, value]) => root.style.setProperty(key, value));
    root.dataset.chibiTheme = interfaceTheme.darkMode ? 'dark' : 'light';
  }, [interfaceTheme]);

  const showToast = (text: string) => {
    setMessage(text);
    playSound('toast');
    window.setTimeout(() => setMessage(''), 4200);
  };

  const openNote = (id: string) => {
    const note = notes.find((item) => item.id === id);
    if (!note) return;
    setView(note.archived ? 'archived' : note.myDay && note.groupId === '__myday__' ? 'myday' : 'active');
    setGroupFilter(note.groupId && note.groupId !== '__myday__' ? note.groupId : 'desktop');
    setDesktopOverview(false);
    setArchiveOverview(false);
    setGroupOverview(false);
    setMyDayOverview(false);
    selectNote(id);
    setTitleFocused(false);
  };

  const openInfo = (tab: InfoTab) => {
    setInfoTab(tab);
    setInfoOpen(true);
  };

  const openCustomization = (tab = 'interface') => {
    setPanelOpen(true);
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('chibi:custom-tab', { detail: tab })), 60);
  };

  const openManager = (tab: ManagerTab) => {
    setManagerTab(tab);
    setManagerOpen(true);
  };

  const focusSearch = () => {
    titleSearchRef.current?.focus();
    setTitleFocused(true);
  };

  const createInCurrentGroup = useCallback(() => {
    const target = view === 'myday' ? '__myday__' : view === 'active' && groupFilter !== 'desktop' ? groupFilter : '';
    const id = createNote(target);
    setView(target === '__myday__' ? 'myday' : 'active');
    setGroupFilter(target && target !== '__myday__' ? target : 'desktop');
    setDesktopOverview(false);
    setArchiveOverview(false);
    setGroupOverview(false);
    setMyDayOverview(false);
    selectNote(id);
    playSound('achievement');
  }, [view, groupFilter, createNote, selectNote]);

  const createWidget = async (note: Note) => {
    try {
      await openShowcaseWidget(note.id);
      showToast('Ventana visual creada. Puedes moverla y personalizarla de forma independiente.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo crear la ventana visual.');
    }
  };

  const handleWindowDrag = (event: ReactMouseEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('button,input,textarea,select,a,[contenteditable="true"],[data-no-drag]')) return;
    event.preventDefault();
    void startCurrentWindowDragging().catch((error) => console.warn('No se pudo arrastrar la ventana:', error));
  };

  const openGroupCreate = () => {
    setEditingGroup(undefined);
    setGroupDialogOpen(true);
  };

  const openGroupEdit = (group: NoteGroup) => {
    setEditingGroup({ ...group });
    setGroupDialogOpen(true);
  };

  const saveGroup = (value: { name: string; icon: string; color: string }) => {
    if (editingGroup) {
      const groupId = editingGroup.id;
      updateGroup(groupId, { name: value.name, icon: value.icon, color: value.color });
      setGroupFilter(groupId);
      setView('active');
      setDesktopOverview(false);
      setArchiveOverview(false);
      setGroupOverview(true);
      setMyDayOverview(false);
      setEditingGroup(undefined);
      setGroupVisualRevision((revision) => revision + 1);
    } else {
      const id = createGroup(value.name, value.icon, value.color);
      setView('active');
      setGroupFilter(id);
      setDesktopOverview(false);
      setArchiveOverview(false);
      setGroupOverview(true);
      setMyDayOverview(false);
      setGroupVisualRevision((revision) => revision + 1);
    }
    window.dispatchEvent(new CustomEvent('chibi:sync-now'));
  };

  const removeGroup = async (group: NoteGroup) => {
    const count = notes.filter((note) => note.groupId === group.id).length;
    const accepted = await requestConfirmation({
      title: t('Eliminar grupo'),
      message: `${t('Vas a eliminar')} “${group.name}”.`,
      detail: count ? `${count} ${t(count === 1 ? 'nota pasará al Escritorio.' : 'notas pasarán al Escritorio.')}` : t('El grupo está vacío.'),
      confirmLabel: t('Eliminar grupo'),
      cancelLabel: t('Cancelar'),
      tone: 'danger',
    });
    if (!accepted) return;
    deleteGroup(group.id);
    if (groupFilter === group.id) { setGroupFilter('desktop'); setDesktopOverview(true); setGroupOverview(false); setMyDayOverview(false); }
  };

  const dictate = () => {
    if (!selected || showDesktopAdmin || archiveOverview) {
      showToast(t('Abre una nota antes de iniciar el dictado.'));
      return;
    }
    openDictationForNote(selected.id);
  };
  const moveNoteTo = (destination: MoveDestination) => {
    if (!moveNote) return;
    const id = moveNote.id;
    if (destination.type === 'desktop') {
      updateNote(id, { groupId: '', myDay: false, archived: false });
      setView('active');
      setGroupFilter('desktop');
      setDesktopOverview(true);
      setGroupOverview(false);
      setMyDayOverview(false);
    } else if (destination.type === 'myday') {
      updateNote(id, { groupId: '__myday__', myDay: true, archived: false });
      setView('myday');
      setGroupFilter('desktop');
      setDesktopOverview(false);
      setArchiveOverview(false);
      setGroupOverview(false);
      setMyDayOverview(true);
    } else if (destination.type === 'archive') {
      updateNote(id, { archived: true, myDay: false });
      setView('archived');
      setGroupFilter('desktop');
      setDesktopOverview(false);
      setArchiveOverview(true);
      setGroupOverview(false);
      setMyDayOverview(false);
    } else if (destination.type === 'group') {
      updateNote(id, { groupId: destination.groupId, myDay: false, archived: false });
      setView('active');
      setGroupFilter(destination.groupId);
      setDesktopOverview(false);
      setArchiveOverview(false);
      setGroupOverview(true);
      setMyDayOverview(false);
    }
    setMoveNote(undefined);
    selectNote(id);
    showToast('Nota movida correctamente.');
  };


  useEffect(() => {
    if (!selected && visibleNotes[0]) selectNote(visibleNotes[0].id);
    else if (selected && selectedId !== selected.id) selectNote(selected.id);
  }, [selectedId, selected, visibleNotes, selectNote]);

  useEffect(() => {
    setPanelOpen(false);
    void startBackendSync();
  }, [setPanelOpen]);

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        focusSearch();
      }
      if (event.key === 'Escape') {
        setContext(null);
        if (document.activeElement === titleSearchRef.current) {
          setTitleQuery('');
          titleSearchRef.current?.blur();
        }
      }
    };
    const openTags = () => openManager('tags');
    window.addEventListener('keydown', handle);
    window.addEventListener('chibi:open-tags-manager', openTags);
    return () => {
      window.removeEventListener('keydown', handle);
      window.removeEventListener('chibi:open-tags-manager', openTags);
    };
  }, []);

  useEffect(() => {
    const fired = (event: Event) => {
      const detail = (event as CustomEvent<{ title?: string }>).detail;
      showToast(`${t('Recordatorio')}: ${detail?.title || t('Nota')}`);
    };
    const failed = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      showToast(detail?.message || t('No se pudo mostrar la notificación.'));
    };
    window.addEventListener('chibi:reminder-fired', fired);
    window.addEventListener('chibi:reminder-error', failed);
    return () => {
      window.removeEventListener('chibi:reminder-fired', fired);
      window.removeEventListener('chibi:reminder-error', failed);
    };
  }, [t]);

  useEffect(() => {
    if (!isTauri()) return;
    let disposeEvent: (() => void) | undefined;
    let disposed = false;
    const shortcuts = ['CommandOrControl+Alt+N', 'CommandOrControl+Alt+H'];
    import('@tauri-apps/api/event')
      .then(({ listen }) => listen('create-note-requested', () => {
        createInCurrentGroup();
      }))
      .then((fn) => {
        if (disposed) fn();
        else disposeEvent = fn;
      });
    Promise.all([import('@tauri-apps/plugin-global-shortcut'), import('@tauri-apps/api/window')])
      .then(async ([{ register }, { getCurrentWindow }]) => {
        await register(shortcuts, async (event) => {
          if (event.state !== 'Pressed') return;
          if (event.shortcut.endsWith('+N')) {
            createInCurrentGroup();
          }
          if (event.shortcut.endsWith('+H')) {
            const current = getCurrentWindow();
            (await current.isVisible()) ? await current.hide() : await current.show();
          }
        });
      })
      .catch((error) => console.warn('Atajos globales no disponibles:', error));
    return () => {
      disposed = true;
      disposeEvent?.();
      import('@tauri-apps/plugin-global-shortcut').then(({ unregister }) => unregister(shortcuts)).catch(() => undefined);
    };
  }, [createInCurrentGroup]);

  const contextNote = context?.type === 'note' ? notes.find((note) => note.id === context.id) : undefined;
  const contextGroup = context?.type === 'group' ? groups.find((group) => group.id === context.id) : undefined;
  const contextGroupsHeader = context?.type === 'groups-header';
  const contextNotesHeader = context?.type === 'notes-header';

  const emptyMode = !selected
    ? titleQuery.trim()
      ? 'search'
      : view === 'myday'
        ? 'myday'
        : view === 'archived'
          ? 'archived'
          : currentGroup
              ? 'group'
              : 'default'
    : null;

  const emptyTitle =
    emptyMode === 'search'
      ? 'No hay resultados para esta búsqueda'
      : emptyMode === 'myday'
        ? 'Mi día Chibi está despejado'
        : emptyMode === 'archived'
          ? 'No hay notas archivadas'
          : emptyMode === 'group'
              ? `${currentGroup?.name || 'Este grupo'} está listo para usarse`
              : 'Tu escritorio está listo';

  const emptyDescription =
    emptyMode === 'search'
      ? 'Prueba con otro título o vuelve al escritorio para encontrar más notas.'
      : emptyMode === 'myday'
        ? 'Añade notas importantes a Mi día para tener un plan visual, simple y amable.'
        : emptyMode === 'archived'
          ? 'Aquí aparecerán las notas que quieras guardar sin borrarlas.'
          : emptyMode === 'group'
              ? 'Usa este panel como centro de administración del grupo para crear, organizar y revisar sus notas.'
              : 'Crea tu primera nota para empezar a llenar tu espacio kawaii.';


  useEffect(() => {
    const refreshGroupVisuals = () => setGroupVisualRevision((revision) => revision + 1);
    window.addEventListener('chibi:group-updated', refreshGroupVisuals);
    return () => window.removeEventListener('chibi:group-updated', refreshGroupVisuals);
  }, []);


  const activeSidebarGroup = currentGroup || (selected?.groupId && selected.groupId !== '__myday__' ? groups.find((group) => group.id === selected.groupId) : undefined);
  const sortByMode = <T extends { title?: string; name?: string; createdAt: string }>(items: T[], mode: 'az' | 'za' | 'created') => [...items].sort((a, b) => {
    if (mode === 'az') return (a.title || a.name || '').localeCompare(b.title || b.name || '', undefined, { sensitivity: 'base' });
    if (mode === 'za') return (b.title || b.name || '').localeCompare(a.title || a.name || '', undefined, { sensitivity: 'base' });
    return a.createdAt.localeCompare(b.createdAt);
  });
  const sortSidebarNotes = (items: Note[], mode: 'az' | 'za' | 'created') => [...items].sort((a, b) => {
    const pinnedOrder = Number(b.pinned) - Number(a.pinned);
    if (pinnedOrder !== 0) return pinnedOrder;
    if (mode === 'az') return (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });
    if (mode === 'za') return (b.title || '').localeCompare(a.title || '', undefined, { sensitivity: 'base' });
    return a.createdAt.localeCompare(b.createdAt);
  });
  const countNotesInGroup = (groupId: string) => countActiveNotesForGroup(notes, groupId);
  const visibleGroupPool = sidebarGroupsMode === 'active' ? groups.filter((group) => group.id === activeSidebarGroup?.id) : groups;
  const sidebarGroups = sortByMode(visibleGroupPool, sidebarGroupsSort);
  const visibleNotePool = sidebarNotesMode === 'active' ? filtered.filter((note) => note.id === selected?.id) : filtered;
  const sidebarNotes = sortSidebarNotes(visibleNotePool, sidebarNotesSort);

  const showDesktopAdmin = view === 'active' && groupFilter === 'desktop' && desktopOverview && !titleQuery.trim();
  const showMyDayAdmin = view === 'myday' && myDayOverview && !titleQuery.trim();
  const showArchiveAdmin = view === 'archived' && archiveOverview && !titleQuery.trim();
  const showGroupAdmin = view === 'active' && Boolean(currentGroup) && groupOverview && !titleQuery.trim();
  const desktopNotes = groupScopedNotes.active;
  const desktopTaskCount = desktopNotes.reduce((total, note) => total + note.items.filter((item) => !item.done).length, 0);

  return (
    <div className={`app-shell ${focusMode ? 'study-mode' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${interfaceTheme.darkMode ? 'ui-dark' : ''}`} style={interfaceStyle}>
      <header className="topbar" onMouseDown={handleWindowDrag}>
        <div className="brand">
          <motion.div className="brand-icon" animate={{ y: [0, -3, 0], rotate: [-2, 2, -2] }} transition={{ duration: 3.6, repeat: Infinity }}>
            <img src="/assets/branding/chibi-notes.png" alt="" />
          </motion.div>
          <span>
            <b>Chibi Notes</b>
            <small>Zazen AI Studio</small>
          </span>
        </div>

        <div className="global-search title-autocomplete">
          <Search />
          <input
            ref={titleSearchRef}
            value={titleQuery}
            onFocus={() => setTitleFocused(true)}
            onBlur={() => window.setTimeout(() => setTitleFocused(false), 130)}
            onChange={(event) => setTitleQuery(event.target.value)}
            placeholder="Buscar por título de nota…"
          />
          <kbd>Ctrl K</kbd>
          <AnimatePresence>
            {titleFocused && titleSuggestions.length > 0 && (
              <motion.div className="title-suggestions" initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -7, scale: 0.98 }}>
                {titleSuggestions.map((note) => {
                  const group = groups.find((item) => item.id === note.groupId);
                  return (
                    <motion.button key={note.id} onMouseDown={(event) => event.preventDefault()} onClick={() => openNote(note.id)} whileHover={{ x: 4 }}>
                      <span className="suggestion-icon"><NoteIcon value={note.icon || '📝'}/></span>
                      <div>
                        <b>{note.title || 'Sin título'}</b>
                        <small>{group ? `${group.icon} ${group.name} · ` : ''}{htmlToText(note.body).slice(0, 60) || `${note.items.length} tareas`}</small>
                      </div>
                      <em>{note.archived ? 'Archivada' : note.myDay ? 'Mi día' : 'Activa'}</em>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="top-actions">
          {selected && <button data-tooltip="Abrir nota visual 9:16" onClick={() => void createWidget(selected)}><MonitorUp /></button>}
          <button data-tooltip="Herramientas, ayuda y acerca de" onClick={() => setFeatureHubOpen(true)}><Wrench /></button>
          <button className="top-action-optional" onClick={dictate} data-tooltip={t('Abrir dictado')}><Mic /></button>
          <button className="top-action-optional" data-tooltip="Configurar recordatorio" onClick={() => selected && setReminderNote(selected)}><Bell />{notes.some((note) => note.reminderAt) && <i />}</button>
          <button data-tooltip={t('Notas archivadas')} className={view === 'archived' ? 'active' : ''} onClick={() => { setView('archived'); setGroupFilter('desktop'); setDesktopOverview(false); setArchiveOverview(true); setGroupOverview(false); setMyDayOverview(false); }}><Archive /></button>
          <button data-tooltip="Administrar notas y etiquetas" className={managerOpen ? 'active' : ''} onClick={() => openManager('notes')}><Files /></button>
          <button data-tooltip="Modo estudio" className={focusMode ? 'active top-action-optional' : 'top-action-optional'} onClick={() => setFocusMode((value) => !value)}><Moon /></button>
          <button data-tooltip="Personalización" onClick={() => openCustomization('interface')} className={panelOpen ? 'active' : ''}><Palette /></button>
          <span className="window-controls">
            <button data-tooltip="Minimizar" onClick={() => void minimizeCurrentWindow().catch((error) => showToast(String(error)))}><Minus /></button>
            <button data-tooltip="Maximizar o restaurar" onClick={() => void toggleMaximizeCurrentWindow().catch((error) => showToast(String(error)))}><Square /></button>
            <button className="close" data-tooltip="Cerrar a la bandeja" onClick={() => void closeCurrentWindow().catch((error) => showToast(String(error)))}><X /></button>
          </span>
        </div>
      </header>

      <aside className="leftbar">
        <button className="new-note" onClick={createInCurrentGroup}><img src="/assets/feature-icons/05_pollito_crear_nueva_nota.png" alt="" /><span>Nueva nota</span></button>

        <nav>
          <button data-tooltip="Escritorio" className={view === 'active' && groupFilter === 'desktop' ? 'active' : ''} onClick={() => { setView('active'); setGroupFilter('desktop'); setDesktopOverview(true); setArchiveOverview(false); setGroupOverview(false); setMyDayOverview(false); }}>
            <Grid2X2 />
            <span>Escritorio</span>
            <em>{noteCollections.desktop.length}</em>
          </button>
          <button data-tooltip="Mi día Chibi" className={view === 'myday' ? 'active' : ''} onClick={() => { setView('myday'); setGroupFilter('desktop'); setDesktopOverview(false); setArchiveOverview(false); setGroupOverview(false); setMyDayOverview(true); }}>
            <ListChecks />
            <span>Mi día Chibi</span>
            <em>{myDayNotesCount}</em>
          </button>
        </nav>

        <div className={`sidebar-groups ${sidebarGroupsExpanded ? 'expanded' : 'collapsed'}`}>
          <header onContextMenu={(event) => { event.preventDefault(); setContext({ type: 'groups-header', id: 'groups-header', x: event.clientX, y: event.clientY }); }}>
            <button className="sidebar-section-toggle" data-sound="silent" data-tooltip={sidebarGroupsExpanded ? 'Contraer grupos' : 'Expandir grupos'} onClick={toggleSidebarGroups}>
              {sidebarGroupsExpanded ? <ChevronDown /> : <ChevronRight />}
              <span>GRUPOS</span>
            </button>
            <div className="sidebar-section-actions">
              <button data-sound="silent" data-tooltip={t('Nuevo Grupo')} onClick={openGroupCreate}><FolderPlus /></button>
            </div>
          </header>
          <AnimatePresence initial={false}>
            {sidebarGroupsExpanded && (
              <motion.div className="sidebar-section-content sidebar-group-list" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                {sidebarGroups.map((group) => (
                  <button
                    key={`${group.id}-${group.icon}-${group.color}-${groupsRevision}-${groupVisualRevision}`}
                    className={view === 'active' && groupFilter === group.id ? 'active' : ''}
                    onClick={() => { setView('active'); setGroupFilter(group.id); setDesktopOverview(false); setArchiveOverview(false); setGroupOverview(true); setMyDayOverview(false); }}
                    onContextMenu={(event) => { event.preventDefault(); setContext({ type: 'group', id: group.id, x: event.clientX, y: event.clientY }); }}
                    data-tooltip={`${group.name}: clic derecho para opciones`}
                  >
                    <i style={{ background: group.color }}>{group.icon}</i>
                    <span>{group.name}</span>
                    <SidebarGroupCount groupId={group.id} />
                  </button>
                ))}
                {groups.length > 0 && sidebarGroupsMode === 'active' && !sidebarGroups.length && <small className="sidebar-groups-empty">No hay un grupo personalizado activo. Haz clic derecho en “Grupos” y elige “Mostrar todos”.</small>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={`notes-mini ${sidebarNotesExpanded ? 'expanded' : 'collapsed'}`}>
          <header className="notes-mini-header" onContextMenu={(event) => { event.preventDefault(); setContext({ type: 'notes-header', id: 'notes-header', x: event.clientX, y: event.clientY }); }}>
            <button className="sidebar-section-toggle" data-sound="silent" data-tooltip={sidebarNotesExpanded ? 'Contraer notas' : 'Expandir notas'} onClick={toggleSidebarNotes}>
              {sidebarNotesExpanded ? <ChevronDown /> : <ChevronRight />}
              <span>NOTAS</span>
            </button>
            <div className="sidebar-section-actions">
              <button data-sound="silent" data-tooltip={t('Nueva Nota')} onClick={createInCurrentGroup}><Plus /></button>
            </div>
          </header>
          <AnimatePresence initial={false}>
            {sidebarNotesExpanded && (
              <motion.div className="sidebar-section-content notes-mini-list" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                {sidebarNotes.map((note) => {
                  const group = groups.find((item) => item.id === note.groupId);
                  return (
                    <button
                      key={note.id}
                      className={!desktopOverview && !archiveOverview && !groupOverview && !myDayOverview && selected?.id === note.id ? 'active' : ''}
                      onClick={() => { selectNote(note.id); setDesktopOverview(false); setArchiveOverview(false); setGroupOverview(false); setMyDayOverview(false); }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        selectNote(note.id);
                        setContext({ type: 'note', id: note.id, x: event.clientX, y: event.clientY });
                      }}
                      data-tooltip="Clic derecho para todas las opciones"
                    >
                      <span className="mini-note-icon" style={{ backgroundImage: `url(/assets/backgrounds/${note.customization.background.backgroundId}.svg)` }}><i><NoteIcon value={note.icon || '📝'} /></i></span>
                      <div>
                        <b>{note.pinned ? '📌 ' : ''}{note.title || 'Sin título'}</b>
                        <small>{group ? `${group.icon} ${group.name} · ` : note.myDay ? '⭐ Mi Día Chibi · ' : '🖥️ Escritorio · '}{htmlToText(note.body) || `${note.items.length} tareas`}</small>
                      </div>
                    </button>
                  );
                })}
                {sidebarNotes.length === 0 && <small className="no-results">{sidebarNotesMode === 'active' ? 'No hay una nota activa en esta vista. Haz clic derecho en “Notas” y elige “Mostrar todos”.' : view === 'myday' ? 'Mueve una nota a Mi Día desde su menú contextual.' : view === 'archived' ? 'No hay notas archivadas.' : groupFilter === 'desktop' ? 'El escritorio todavía no tiene notas.' : currentGroup ? 'Este grupo todavía no tiene notas activas.' : 'No hay notas en esta vista.'}</small>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="sidebar-bottom">
          <motion.button className="sidebar-toggle" aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Comprimir barra lateral'} data-tooltip={sidebarCollapsed ? 'Expandir barra lateral' : 'Comprimir barra lateral'} onClick={toggleSidebar} data-sound="silent" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.88 }}>
            {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </motion.button>
        </div>
      </aside>

      <main className="workspace workspace-clean">
        <AnimatePresence mode="wait">
          {showMyDayAdmin ? (
            <motion.section key="myday-admin" className="group-admin-panel myday-admin-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
              <div className="group-admin-hero">
                <div className="group-admin-icon myday-icon">✅</div>
                <div>
                  <small className="group-admin-eyebrow">{t('PLAN DEL DÍA')}</small>
                  <h2>{t('Mi día Chibi')}</h2>
                  <p>{t('Revisa en un solo lugar las notas elegidas para hoy y aquellas cuyo recordatorio ya está próximo.')}</p>
                </div>
              </div>
              <div className="group-admin-stats">
                <article><b>{noteCollections.myDay.length}</b><span>{t('Notas para hoy')}</span></article>
                <article><b>{dueTodayCount}</b><span>{t('Con recordatorio')}</span></article>
                <article><b>{noteCollections.myDay.reduce((total, note) => total + note.items.filter((item) => !item.done).length, 0)}</b><span>{t('Tareas pendientes')}</span></article>
              </div>
              <div className="group-admin-actions">
                <button className="primary" onClick={() => { const id = createNote('__myday__'); selectNote(id); setMyDayOverview(false); }}><Plus />{t('Nueva Nota')}</button>
                <button onClick={() => openManager('notes')}><Files />{t('Administrar todas')}</button>
                <button onClick={() => { setView('active'); setGroupFilter('desktop'); setDesktopOverview(true); setMyDayOverview(false); }}><Grid2X2 />{t('Ir al escritorio')}</button>
                <button onClick={() => openCustomization('interface')}><Palette />{t('Personalizar')}</button>
              </div>
              <div className="desktop-note-grid myday-note-grid">
                {noteCollections.myDay.map((note) => (
                  <motion.article key={note.id} className="desktop-note-card" whileHover={{ y: -4 }} onContextMenu={(event) => { event.preventDefault(); selectNote(note.id); setContext({ type: 'note', id: note.id, x: event.clientX, y: event.clientY }); }}>
                    <button className="desktop-note-preview" onClick={() => openNote(note.id)} style={{ backgroundImage: `url(/assets/backgrounds/${note.customization.background.backgroundId}.svg)` }}>
                      <span><NoteIcon value={note.icon || '/assets/note-icons/documentos_y_datos/002_cuaderno.png'} /></span>
                      {note.pinned && <i>📌</i>}
                    </button>
                    <div className="desktop-note-copy">
                      <button className="desktop-note-title" onClick={() => openNote(note.id)}>{note.title || t('Sin título')}</button>
                      <p>{htmlToText(note.body).slice(0, 110) || `${note.items.length} ${t('tareas')}`}</p>
                      <small>{note.reminderAt ? new Date(note.reminderAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : note.items.length ? `${note.items.filter((item) => item.done).length}/${note.items.length} ${t('tareas')}` : t('Nota rápida')}</small>
                    </div>
                    <div className="desktop-note-actions">
                      <button data-tooltip={t('Abrir')} onClick={() => openNote(note.id)}><Pencil /></button>
                      <button data-tooltip={t('Mover a…')} onClick={() => setMoveNote(note)}><FolderInput /></button>
                      <button data-tooltip={note.pinned ? t('Desfijar') : t('Fijar')} onClick={() => updateNote(note.id, { pinned: !note.pinned })}><Pin /></button>
                    </div>
                  </motion.article>
                ))}
                {!noteCollections.myDay.length && (
                  <div className="desktop-notes-empty">
                    <img src="/assets/feature-icons/08_pollito_creando_checklist.png" alt="" />
                    <b>{t('Tu día está despejado')}</b>
                    <p>{t('Crea una nota para hoy o mueve una nota existente a Mi día Chibi.')}</p>
                    <button className="primary" onClick={() => { const id = createNote('__myday__'); selectNote(id); setMyDayOverview(false); }}><Plus />{t('Crear primera nota')}</button>
                  </div>
                )}
              </div>
            </motion.section>
          ) : showArchiveAdmin ? (
            <motion.section key="archive-admin" className="group-admin-panel archive-admin-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
              <div className="group-admin-hero">
                <div className="group-admin-icon archive-icon">🗃️</div>
                <div>
                  <small className="group-admin-eyebrow">{t('ARCHIVO DE NOTAS')}</small>
                  <h2>{t('Notas archivadas')}</h2>
                  <p>{t('Consulta, restaura o reorganiza las notas que has apartado del escritorio principal.')}</p>
                </div>
              </div>
              <div className="group-admin-stats">
                <article><b>{archivedNotesCount}</b><span>{t('Notas archivadas')}</span></article>
                <article><b>{notes.filter((note) => note.archived && note.pinned).length}</b><span>{t('Notas fijadas')}</span></article>
                <article><b>{notes.filter((note) => note.archived && note.reminderAt).length}</b><span>{t('Con recordatorio')}</span></article>
              </div>
              <div className="group-admin-actions">
                <button className="primary" onClick={() => { setView('active'); setGroupFilter('desktop'); setDesktopOverview(true); setArchiveOverview(false); setGroupOverview(false); setMyDayOverview(false); }}><Grid2X2 />{t('Volver al escritorio')}</button>
                <button onClick={() => openManager('notes')}><Files />{t('Administrar todas')}</button>
              </div>
              <div className="desktop-note-grid archive-note-grid">
                {visibleNotes.map((note) => (
                  <motion.article key={note.id} className="desktop-note-card" whileHover={{ y: -4 }} onContextMenu={(event) => { event.preventDefault(); selectNote(note.id); setContext({ type: 'note', id: note.id, x: event.clientX, y: event.clientY }); }}>
                    <button className="desktop-note-preview" onClick={() => { selectNote(note.id); setArchiveOverview(false); }} style={{ backgroundImage: `url(/assets/backgrounds/${note.customization.background.backgroundId}.svg)` }}>
                      <span><NoteIcon value={note.icon || '/assets/note-icons/documentos_y_datos/002_cuaderno.png'} /></span>
                      {note.pinned && <i>📌</i>}
                    </button>
                    <div className="desktop-note-copy">
                      <button className="desktop-note-title" onClick={() => { selectNote(note.id); setArchiveOverview(false); }}>{note.title || t('Sin título')}</button>
                      <p>{htmlToText(note.body).slice(0, 110) || `${note.items.length} ${t('tareas')}`}</p>
                      <small>{t('Archivada')}</small>
                    </div>
                    <div className="desktop-note-actions">
                      <button data-tooltip={t('Abrir')} onClick={() => { selectNote(note.id); setArchiveOverview(false); }}><Pencil /></button>
                      <button data-tooltip={t('Mover a…')} onClick={() => setMoveNote(note)}><FolderInput /></button>
                    </div>
                  </motion.article>
                ))}
                {!visibleNotes.length && <div className="desktop-notes-empty"><Archive /><b>{t('No hay notas archivadas')}</b><p>{t('Las notas que archives aparecerán aquí.')}</p></div>}
              </div>
            </motion.section>
          ) : showDesktopAdmin ? (
            <motion.section key="desktop-admin" className="group-admin-panel desktop-admin-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
              <div className="group-admin-hero">
                <div className="group-admin-icon desktop-icon">🖥️</div>
                <div>
                  <small className="group-admin-eyebrow">PANEL PRINCIPAL</small>
                  <h2>Escritorio</h2>
                  <p>Aquí viven las notas que no pertenecen a un grupo personalizado. Puedes abrirlas, moverlas, fijarlas o enviarlas a Mi Día.</p>
                </div>
              </div>

              <div className="group-admin-stats">
                <article><b>{desktopNotes.length}</b><span>Notas en el escritorio</span></article>
                <article><b>{desktopNotes.filter((note) => note.pinned).length}</b><span>Notas fijadas</span></article>
                <article><b>{desktopTaskCount}</b><span>Tareas pendientes</span></article>
              </div>

              <div className="group-admin-actions">
                <button className="primary" onClick={() => { const id=createNote(''); selectNote(id); setDesktopOverview(false); setArchiveOverview(false); }}><Plus />Nueva nota</button>
                <button onClick={() => openManager('notes')}><Files />Administrar todas</button>
                <button onClick={() => { setView('myday'); setGroupFilter('desktop'); setDesktopOverview(false); setArchiveOverview(false); setGroupOverview(false); setMyDayOverview(true); }}><ListChecks />Mi Día Chibi</button>
                <button onClick={() => openCustomization('interface')}><Palette />Personalizar</button>
              </div>

              <div className="desktop-note-grid">
                {desktopNotes.map((note) => (
                  <motion.article
                    key={note.id}
                    className="desktop-note-card"
                    whileHover={{ y: -4 }}
                    onContextMenu={(event) => { event.preventDefault(); selectNote(note.id); setContext({ type: 'note', id: note.id, x: event.clientX, y: event.clientY }); }}
                  >
                    <button className="desktop-note-preview" onClick={() => openNote(note.id)} style={{ backgroundImage: `url(/assets/backgrounds/${note.customization.background.backgroundId}.svg)` }}>
                      <span><NoteIcon value={note.icon || '📝'}/></span>
                      {note.pinned && <i>📌</i>}
                    </button>
                    <div className="desktop-note-copy">
                      <button className="desktop-note-title" onClick={() => openNote(note.id)}>{note.title || 'Sin título'}</button>
                      <p>{htmlToText(note.body).slice(0, 110) || `${note.items.length} tareas`}</p>
                      <small>{note.myDay ? '⭐ Mi Día · ' : ''}{note.items.length ? `${note.items.filter((item) => item.done).length}/${note.items.length} tareas` : 'Nota rápida'}</small>
                    </div>
                    <div className="desktop-note-actions">
                      <button data-tooltip="Abrir" onClick={() => openNote(note.id)}><Pencil /></button>
                      <button data-tooltip="Mover a…" onClick={() => setMoveNote(note)}><FolderInput /></button>
                      <button data-tooltip={note.pinned ? 'Desfijar' : 'Fijar'} onClick={() => updateNote(note.id, { pinned: !note.pinned })}><Pin /></button>
                    </div>
                  </motion.article>
                ))}
                {!desktopNotes.length && (
                  <div className="desktop-notes-empty">
                    <img src="/assets/feature-icons/05_pollito_crear_nueva_nota.png" alt="" />
                    <b>Tu escritorio está despejado</b>
                    <p>Crea una nota o mueve una desde Mi Día, un grupo o el archivo.</p>
                    <button className="primary" onClick={() => { const id=createNote(''); selectNote(id); setDesktopOverview(false); setArchiveOverview(false); }}><Plus />Crear primera nota</button>
                  </div>
                )}
              </div>
            </motion.section>
          ) : showGroupAdmin && currentGroup ? (
            <motion.section key={`group-admin-${currentGroup.id}-${currentGroup.icon}-${currentGroup.color}-${groupsRevision}-${groupVisualRevision}`} className="group-admin-panel custom-group-admin-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
              <div className="group-admin-hero">
                <div className="group-admin-icon" style={{ background: currentGroup.color }}>{currentGroup.icon}</div>
                <div>
                  <small className="group-admin-eyebrow">{t('ADMINISTRACIÓN DE GRUPO')}</small>
                  <h2>{currentGroup.name}</h2>
                  <p>{t('Consulta y organiza todas las notas activas de este grupo. Abre una tarjeta para editar su contenido.')}</p>
                </div>
              </div>

              <div className="group-admin-stats">
                <article><motion.b key={`${currentGroup.id}-${currentGroupActiveCount}`} initial={{ scale: 0.9, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }}>{currentGroupActiveCount}</motion.b><span>{t('Notas activas')}</span></article>
                <article><b>{groupScopedNotes.active.filter((note) => note.pinned).length}</b><span>{t('Notas fijadas')}</span></article>
                <article><b>{groupScopedNotes.active.reduce((total, note) => total + note.items.filter((item) => !item.done).length, 0)}</b><span>{t('Tareas pendientes')}</span></article>
              </div>

              <div className="group-admin-actions">
                <button className="primary" onClick={() => { const id = createNote(currentGroup.id); selectNote(id); setGroupOverview(false); }}><Plus />{t('Nueva Nota')}</button>
                <button onClick={() => openGroupEdit(currentGroup)}><Pencil />{t('Editar grupo')}</button>
                <button onClick={() => openManager('notes')}><Files />{t('Administrar todas')}</button>
                <button onClick={() => openCustomization('interface')}><Palette />{t('Personalizar')}</button>
              </div>

              <div className="desktop-note-grid group-note-grid">
                {groupScopedNotes.active.map((note) => (
                  <motion.article key={note.id} className="desktop-note-card" whileHover={{ y: -4 }} onContextMenu={(event) => { event.preventDefault(); selectNote(note.id); setContext({ type: 'note', id: note.id, x: event.clientX, y: event.clientY }); }}>
                    <button className="desktop-note-preview" onClick={() => openNote(note.id)} style={{ backgroundImage: `url(/assets/backgrounds/${note.customization.background.backgroundId}.svg)` }}>
                      <span><NoteIcon value={note.icon || '/assets/note-icons/documentos_y_datos/002_cuaderno.png'} /></span>
                      {note.pinned && <i>📌</i>}
                    </button>
                    <div className="desktop-note-copy">
                      <button className="desktop-note-title" onClick={() => openNote(note.id)}>{note.title || t('Sin título')}</button>
                      <p>{htmlToText(note.body).slice(0, 110) || `${note.items.length} ${t('tareas')}`}</p>
                      <small>{note.items.length ? `${note.items.filter((item) => item.done).length}/${note.items.length} ${t('tareas')}` : t('Nota rápida')}</small>
                    </div>
                    <div className="desktop-note-actions">
                      <button data-tooltip={t('Abrir')} onClick={() => openNote(note.id)}><Pencil /></button>
                      <button data-tooltip={t('Mover a…')} onClick={() => setMoveNote(note)}><FolderInput /></button>
                      <button data-tooltip={note.pinned ? t('Desfijar') : t('Fijar')} onClick={() => updateNote(note.id, { pinned: !note.pinned })}><Pin /></button>
                    </div>
                  </motion.article>
                ))}
                {!groupScopedNotes.active.length && (
                  <div className="desktop-notes-empty">
                    <img src="/assets/feature-icons/05_pollito_crear_nueva_nota.png" alt="" />
                    <b>{t('Este grupo está vacío')}</b>
                    <p>{t('Crea una nota nueva para empezar a organizar este espacio.')}</p>
                    <button className="primary" onClick={() => { const id = createNote(currentGroup.id); selectNote(id); setGroupOverview(false); }}><Plus />{t('Crear primera nota')}</button>
                  </div>
                )}
              </div>
            </motion.section>
          ) : selected ? (
            <motion.div key={selected.id} className="preview-stage preview-stage-large" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <div className="glow-orb one" />
              <div className="glow-orb two" />
              <NoteWidget note={selected} />
            </motion.div>
          ) : (
            <motion.section key={emptyMode || 'empty'} className="group-admin-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
              <div className="group-admin-hero">
                <div className="group-admin-icon" style={{ background: currentGroup?.color || 'var(--ui-button)' }}>{emptyMode === 'myday' ? '✅' : emptyMode === 'archived' ? '🗃️' : currentGroup?.icon || '🐣'}</div>
                <div>
                  <small className="group-admin-eyebrow">{emptyMode === 'myday' ? 'PLAN DEL DÍA' : emptyMode === 'archived' ? 'ARCHIVO' : currentGroup ? 'ADMINISTRACIÓN DE GRUPO' : 'PANEL KAWAII'}</small>
                  <h2>{emptyTitle}</h2>
                  <p>{emptyDescription}</p>
                </div>
              </div>

              <div className="group-admin-stats">
                <article>
                  <b>{emptyMode === 'myday' ? myDayNotesCount : emptyMode === 'archived' ? archivedNotesCount : groupScopedNotes.active.length}</b>
                  <span>{emptyMode === 'archived' ? 'Notas archivadas' : 'Notas visibles'}</span>
                </article>
                <article>
                  <b>{emptyMode === 'myday' ? dueTodayCount : groupScopedNotes.archived.length}</b>
                  <span>{emptyMode === 'myday' ? 'Recordatorios para hoy' : 'Guardadas en archivo'}</span>
                </article>
                <article>
                  <b>{emptyMode === 'myday' ? notes.filter((note) => !note.archived && note.myDay).length : pinnedInFiltered}</b>
                  <span>{emptyMode === 'myday' ? 'Añadidas manualmente' : 'Fijadas en esta vista'}</span>
                </article>
              </div>

              <div className="group-admin-actions">
                {emptyMode !== 'archived' && <button className="primary" onClick={createInCurrentGroup}><Plus />Crear nota aquí</button>}
                {emptyMode === 'archived' && <button className="primary" onClick={() => { setView('active'); setGroupFilter('desktop'); setDesktopOverview(true); setMyDayOverview(false); }}><Grid2X2 />Volver al escritorio</button>}
                {currentGroup && <button onClick={() => openGroupEdit(currentGroup)}><Pencil />Editar grupo</button>}
                {emptyMode === 'myday' && <button onClick={() => { setView('active'); setGroupFilter('desktop'); setDesktopOverview(true); setMyDayOverview(false); }}><Grid2X2 />Ir al escritorio</button>}
                <button onClick={() => openManager('notes')}><Files />Abrir gestor</button>
                <button onClick={() => openCustomization('interface')}><Palette />Personalizar</button>
              </div>

              <div className="group-admin-grid">
                <section>
                  <header><b>{emptyMode === 'myday' ? 'Qué puedes hacer' : currentGroup ? 'Resumen del grupo' : emptyMode === 'archived' ? 'Cómo funciona el archivo' : 'Siguientes pasos'}</b></header>
                  <ul>
                    {emptyMode === 'myday' ? (
                      <>
                        <li>Usa “Mover a…” sobre una nota y elige Mi Día Chibi.</li>
                        <li>Los recordatorios de hoy también aparecen automáticamente.</li>
                        <li>Abre una nota visual 9:16 para mantenerla a la vista.</li>
                      </>
                    ) : emptyMode === 'archived' ? (
                      <>
                        <li>Archiva una nota desde la ventana “Mover a…”.</li>
                        <li>Para restaurarla, vuelve a moverla al Escritorio, Mi Día o un grupo.</li>
                        <li>El gestor permite revisar todas las notas antiguas de un vistazo.</li>
                      </>
                    ) : currentGroup ? (
                      <>
                        <li>Color del grupo: <span style={{ color: currentGroup.color }}>{currentGroup.color}</span>.</li>
                        <li>Notas activas: {groupScopedNotes.active.length}. Archivadas: {groupScopedNotes.archived.length}.</li>
                        <li>Haz clic derecho en el grupo para editarlo o eliminarlo.</li>
                      </>
                    ) : (
                      <>
                        <li>Crea una nota nueva y empieza a organizar tus ideas.</li>
                        <li>Usa grupos para separar escuela, hogar, hobbies o rutinas.</li>
                        <li>Abre Herramientas para descubrir opciones guiadas y atajos.</li>
                      </>
                    )}
                  </ul>
                </section>

                <section>
                  <header><b>{emptyMode === 'search' ? 'Consejo de búsqueda' : 'Accesos rápidos'}</b></header>
                  <div className="group-admin-shortcuts">
                    <button onClick={() => focusSearch()}><Search /><span>Buscar título</span><small>Ctrl + K</small></button>
                    <button onClick={() => setFeatureHubOpen(true)}><Wrench /><span>Herramientas</span><small>Centro guiado</small></button>
                    <button onClick={() => { setView('archived'); setGroupFilter('desktop'); setDesktopOverview(false); setArchiveOverview(true); setGroupOverview(false); setMyDayOverview(false); }}><Archive /><span>Archivadas</span><small>{archivedNotesCount}</small></button>
                    <button onClick={() => { setView('myday'); setGroupFilter('desktop'); setDesktopOverview(false); setArchiveOverview(false); setGroupOverview(false); setMyDayOverview(true); }}><ListChecks /><span>Mi día</span><small>{myDayNotesCount}</small></button>
                  </div>
                </section>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <CustomizationPanel />
      <NotesManagerPanel
        open={managerOpen}
        initialTab={managerTab}
        onClose={() => setManagerOpen(false)}
        onEdit={openNote}
        onCreate={(groupId) => {
          setView('active');
          setGroupFilter(groupId || 'desktop');
          setDesktopOverview(false);
          createNote(groupId || '');
          setManagerOpen(false);
        }}
      />
      <FeatureHubPanel
        open={featureHubOpen}
        note={selected}
        onClose={() => setFeatureHubOpen(false)}
        onCreate={createInCurrentGroup}
        onFocusSearch={focusSearch}
        onDictate={dictate}
        onOpenCustomization={openCustomization}
        onOpenGroups={() => { setFeatureHubOpen(false); openGroupCreate(); }}
        onOpenTags={() => { setFeatureHubOpen(false); openManager('tags'); }}
        onOpenInfo={(tab) => { setFeatureHubOpen(false); openInfo(tab); }}
        onToggleFocus={() => setFocusMode((value) => !value)}
        onToast={showToast}
      />
      <AppInfoModal key={`${infoOpen}-${infoTab}`} open={infoOpen} initialTab={infoTab} onClose={() => setInfoOpen(false)} />
      <GroupDialog key={`${editingGroup?.id || 'new'}-${groupDialogOpen ? 'open' : 'closed'}-${groupsRevision}-${groupVisualRevision}`} open={groupDialogOpen} group={editingGroup ? (groups.find((group) => group.id === editingGroup.id) || editingGroup) : undefined} onClose={() => { setGroupDialogOpen(false); setEditingGroup(undefined); }} onSave={saveGroup} />
      <QuickTextDialog open={Boolean(renameNote)} title="Renombrar nota" label="Nombre de la nota" initialValue={renameNote?.title || ''} onClose={() => setRenameNote(undefined)} onSave={(value) => renameNote && updateNote(renameNote.id, { title: value || 'Sin título' })} />
      <ReminderDialog open={Boolean(reminderNote)} note={reminderNote} onClose={() => setReminderNote(undefined)} onSave={(value) => reminderNote && updateNote(reminderNote.id, { reminderAt: value })} />
      <MoveNoteDialog open={Boolean(moveNote)} note={moveNote} groups={groups} onClose={() => setMoveNote(undefined)} onMove={moveNoteTo} />

      <ContextMenu open={Boolean(context)} x={context?.x || 0} y={context?.y || 0} onClose={() => setContext(null)}>
        {contextGroupsHeader && (
          <>
            <header>
              <span><Eye /></span>
              <div>
                <b>{t('Grupos')}</b>
                <small>{t('Organiza y ordena los grupos de la barra lateral.')}</small>
              </div>
            </header>
            <button onClick={() => { openGroupCreate(); setContext(null); }}><FolderPlus />{t('Nuevo Grupo')}</button>
            <div className="context-menu-section">
              <span>{t('VISIBILIDAD')}</span>
              <button className={sidebarGroupsMode === 'all' ? 'selected-option' : ''} onClick={() => { setSidebarGroupsMode('all'); setSidebarGroupsExpanded(true); setContext(null); }}><Grid2X2 />{t('Mostrar Todos')}</button>
              <button className={sidebarGroupsMode === 'active' ? 'selected-option' : ''} onClick={() => { setSidebarGroupsMode('active'); setSidebarGroupsExpanded(true); setContext(null); }}><Pin />{t('Mostrar Solo Grupo Activo')}</button>
            </div>
            <div className="context-menu-section">
              <span>{t('ORDENAR')}</span>
              <button className={sidebarGroupsSort === 'az' ? 'selected-option' : ''} onClick={() => { setSidebarGroupsSort('az'); setContext(null); }}><ArrowDownAZ />{t('Nombre de A a Z')}</button>
              <button className={sidebarGroupsSort === 'za' ? 'selected-option' : ''} onClick={() => { setSidebarGroupsSort('za'); setContext(null); }}><ArrowUpAZ />{t('Nombre de Z a A')}</button>
              <button className={sidebarGroupsSort === 'created' ? 'selected-option' : ''} onClick={() => { setSidebarGroupsSort('created'); setContext(null); }}><CalendarDays />{t('Fecha de creación')}</button>
            </div>
          </>
        )}

        {contextNotesHeader && (
          <>
            <header>
              <span><Eye /></span>
              <div>
                <b>{t('Notas')}</b>
                <small>{t('Controla qué notas aparecen y en qué orden.')}</small>
              </div>
            </header>
            <button onClick={() => { createInCurrentGroup(); setContext(null); }}><Plus />{t('Nueva Nota')}</button>
            <div className="context-menu-section">
              <span>{t('VISIBILIDAD')}</span>
              <button className={sidebarNotesMode === 'all' ? 'selected-option' : ''} onClick={() => { setSidebarNotesMode('all'); setSidebarNotesExpanded(true); setContext(null); }}><Grid2X2 />{t('Mostrar Todos')}</button>
              <button className={sidebarNotesMode === 'active' ? 'selected-option' : ''} onClick={() => { setSidebarNotesMode('active'); setSidebarNotesExpanded(true); setContext(null); }}><Pin />{t('Mostrar Solo Nota Activa')}</button>
            </div>
            <div className="context-menu-section">
              <span>{t('ORDENAR')}</span>
              <button className={sidebarNotesSort === 'az' ? 'selected-option' : ''} onClick={() => { setSidebarNotesSort('az'); setContext(null); }}><ArrowDownAZ />{t('Título de A a Z')}</button>
              <button className={sidebarNotesSort === 'za' ? 'selected-option' : ''} onClick={() => { setSidebarNotesSort('za'); setContext(null); }}><ArrowUpAZ />{t('Título de Z a A')}</button>
              <button className={sidebarNotesSort === 'created' ? 'selected-option' : ''} onClick={() => { setSidebarNotesSort('created'); setContext(null); }}><CalendarDays />{t('Fecha de creación')}</button>
            </div>
          </>
        )}

        {contextNote && (
          <>
            <header>
              <span><NoteIcon value={contextNote.icon || '📝'}/></span>
              <div>
                <b>{contextNote.title}</b>
                <small>{contextNote.archived ? 'Archivada' : contextNote.myDay && contextNote.groupId === '__myday__' ? 'Mi Día Chibi' : contextNote.groupId ? groups.find((group) => group.id === contextNote.groupId)?.name || 'Grupo' : 'Escritorio'}</small>
              </div>
            </header>

            <button onClick={() => { openNote(contextNote.id); setContext(null); }}><Pencil />Abrir</button>
            <button onClick={() => { setRenameNote(contextNote); setContext(null); }}><Pencil />Renombrar</button>
            <button onClick={() => { duplicateNote(contextNote.id); setContext(null); }}><Copy />Duplicar</button>
            <button onClick={() => { updateNote(contextNote.id, { pinned: !contextNote.pinned }); setContext(null); }}><Pin />{contextNote.pinned ? 'Desfijar' : 'Fijar arriba'}</button>
            <button onClick={() => { setReminderNote(contextNote); setContext(null); }}><Bell />Recordatorio</button>
            <button onClick={() => { openManager('tags'); setContext(null); }}><Star />Administrar etiquetas</button>
            <button onClick={() => { setContext(null); void createWidget(contextNote); }}><MonitorUp />Abrir nota visual</button>
            <button className="context-move-button" onClick={() => { setMoveNote(contextNote); setContext(null); }}><FolderInput />Mover a…</button>
            {contextNote.protected ? <button disabled className="protected-note-action"><Pin />{t('Esta nota está protegida')}</button> : <button className="danger" onClick={() => { const target = contextNote; setContext(null); void requestConfirmation({title:t('Eliminar nota'),message:`${t('Vas a eliminar')} “${target.title}”.`,detail:t('Esta acción no se puede deshacer.'),confirmLabel:t('Eliminar nota'),cancelLabel:t('Cancelar'),tone:'danger'}).then(accepted=>{if(accepted)deleteNote(target.id)}); }}><Trash2 />{t('Eliminar')}</button>}
          </>
        )}

        {contextGroup && (
          <>
            <header>
              <span style={{ background: contextGroup.color }}>{contextGroup.icon}</span>
              <div>
                <b>{contextGroup.name}</b>
                <small>{countNotesInGroup(contextGroup.id)} notas activas</small>
              </div>
            </header>
            <button onClick={() => { setView('active'); setGroupFilter(contextGroup.id); setDesktopOverview(false); setArchiveOverview(false); setGroupOverview(true); setMyDayOverview(false); setContext(null); }}><Grid2X2 />Abrir panel del grupo</button>
            <button onClick={() => { const id=createNote(contextGroup.id); setView('active'); setGroupFilter(contextGroup.id); setDesktopOverview(false); setArchiveOverview(false); setGroupOverview(false); setMyDayOverview(false); selectNote(id); setContext(null); }}><FolderPlus />Nueva nota en el grupo</button>
            <button onClick={() => { openGroupEdit(contextGroup); setContext(null); }}><Pencil />Editar nombre, icono y color</button>
            <button onClick={() => { openManager('notes'); setContext(null); }}><Files />Abrir gestor del grupo</button>
            <button className="danger" onClick={() => { const target=contextGroup; setContext(null); void removeGroup(target); }}><Trash2 />Eliminar grupo</button>
          </>
        )}
      </ContextMenu>

      <AnimatePresence>
        {message && <motion.div className="app-toast" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>{message}</motion.div>}
      </AnimatePresence>
    </div>
  );
}
