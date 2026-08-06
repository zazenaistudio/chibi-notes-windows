import type { Note, NoteGroup } from '../types';

export const normalizeGroupId = (value: string | undefined | null) => String(value || '').trim();


export const dedupeGroupsById = (groups: NoteGroup[]) => {
  const byId = new Map<string, NoteGroup>();
  for (const group of groups) {
    const id = normalizeGroupId(group.id);
    if (!id) continue;
    const normalized: NoteGroup = {
      ...group,
      id,
      name: String(group.name || '').trim() || 'Nuevo grupo',
      icon: String(group.icon || '').trim() || '📁',
      color: String(group.color || '').trim() || '#9fdfff',
    };
    const previous = byId.get(id);
    if (!previous || String(normalized.updatedAt || '').localeCompare(String(previous.updatedAt || '')) >= 0) byId.set(id, normalized);
  }
  return [...byId.values()];
};

export const mergeGroupsByUpdatedAt = (localGroups: NoteGroup[], remoteGroups: NoteGroup[]) =>
  dedupeGroupsById([...remoteGroups, ...localGroups]);

export const isActiveNoteInGroup = (note: Note, groupId: string) => {
  const target = normalizeGroupId(groupId);
  return Boolean(target && target !== '__myday__' && !note.archived && normalizeGroupId(note.groupId) === target);
};

export const countActiveNotesForGroup = (notes: Note[], groupId: string) => notes.reduce(
  (total, note) => isActiveNoteInGroup(note, groupId) ? total + 1 : total,
  0,
);

export const buildActiveGroupCounts = (notes: Note[], groupIds: string[]) => {
  const counts = new Map<string, number>();
  for (const groupId of groupIds) counts.set(normalizeGroupId(groupId), 0);
  for (const note of notes) {
    if (note.archived) continue;
    const groupId = normalizeGroupId(note.groupId);
    if (!groupId || groupId === '__myday__' || !counts.has(groupId)) continue;
    counts.set(groupId, (counts.get(groupId) || 0) + 1);
  }
  return counts;
};


export const applyGroupPatch = (
  group: NoteGroup,
  patch: Partial<Pick<NoteGroup, 'name' | 'icon' | 'color'>>,
  updatedAt: string,
) => {
  const name = typeof patch.name === 'string' && patch.name.trim() ? patch.name.trim() : group.name;
  const icon = typeof patch.icon === 'string' && patch.icon.trim() ? patch.icon.trim() : group.icon;
  const color = typeof patch.color === 'string' && patch.color.trim() ? patch.color.trim() : group.color;
  const changed = name !== group.name || icon !== group.icon || color !== group.color;
  return { changed, group: changed ? { ...group, name, icon, color, updatedAt } : group };
};
