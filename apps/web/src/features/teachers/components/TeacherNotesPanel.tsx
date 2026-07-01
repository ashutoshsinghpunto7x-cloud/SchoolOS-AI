import { useState } from 'react';
import { Pin, Lock, FileText, Plus, Pencil, Trash2, Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeacherNotes, useCreateTeacherNote, useUpdateTeacherNote, useDeleteTeacherNote } from '../hooks/useTeachers';
import type { TeacherNote, TeacherNoteType } from '@schoolos/types';

const TYPE_CONFIG: Record<TeacherNoteType, { label: string; icon: React.ElementType; color: string }> = {
  pinned:  { label: 'Pinned',  icon: Pin,      color: 'text-amber-500' },
  private: { label: 'Private', icon: Lock,     color: 'text-red-400' },
  general: { label: 'General', icon: FileText, color: 'text-gray-400' },
};

// ── NoteRow ───────────────────────────────────────────────────────────────────

interface NoteRowProps {
  note: TeacherNote;
  teacherId: string;
}

const NoteRow = ({ note, teacherId }: NoteRowProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const updateNote = useUpdateTeacherNote(teacherId);
  const deleteNote = useDeleteTeacherNote(teacherId);
  const cfg  = TYPE_CONFIG[note.type];
  const Icon = cfg.icon;

  const save = async () => {
    if (!draft.trim() || draft === note.content) { setEditing(false); return; }
    await updateNote.mutateAsync({ noteId: note._id, payload: { content: draft.trim() } });
    setEditing(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-2 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className={cn('w-4 h-4 flex-shrink-0', cfg.color)} strokeWidth={1.75} />
          <span className="text-xs font-semibold text-gray-500">{cfg.label}</span>
          <span className="text-xs text-gray-400">· {note.createdByName}</span>
          <span className="text-xs text-gray-400">
            · {new Date(note.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => deleteNote.mutate(note._id)} disabled={deleteNote.isPending}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
            {deleteNote.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus rows={3}
            className="w-full px-3 py-2 rounded-lg border border-blue-300 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setDraft(note.content); setEditing(false); }}
              className="h-8 px-3 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button type="button" onClick={save} disabled={updateNote.isPending}
              className="h-8 px-3 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-1 disabled:opacity-60">
              {updateNote.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{note.content}</p>
      )}
    </div>
  );
};

// ── AddNoteForm ───────────────────────────────────────────────────────────────

const AddNoteForm = ({ teacherId, onDone }: { teacherId: string; onDone: () => void }) => {
  const [content, setContent] = useState('');
  const [type, setType] = useState<TeacherNoteType>('general');
  const createNote = useCreateTeacherNote(teacherId);

  const submit = async () => {
    if (!content.trim()) return;
    await createNote.mutateAsync({ content: content.trim(), type });
    setContent('');
    setType('general');
    onDone();
  };

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col gap-3">
      <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write a note…"
        rows={3} autoFocus
        className="w-full px-3 py-2 rounded-lg border border-indigo-200 bg-white text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
      <div className="flex items-center justify-between gap-3">
        <select value={type} onChange={(e) => setType(e.target.value as TeacherNoteType)}
          className="h-9 pl-3 pr-7 rounded-lg border border-indigo-200 bg-white text-sm text-gray-700 font-medium focus:outline-none cursor-pointer appearance-none">
          <option value="general">General</option>
          <option value="pinned">Pinned</option>
          <option value="private">Private</option>
        </select>
        <div className="flex gap-2">
          <button type="button" onClick={onDone}
            className="h-9 px-4 rounded-lg text-sm font-medium text-gray-600 hover:bg-indigo-100 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={!content.trim() || createNote.isPending}
            className="h-9 px-4 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-60">
            {createNote.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Add Note
          </button>
        </div>
      </div>
    </div>
  );
};

// ── TeacherNotesPanel ─────────────────────────────────────────────────────────

export const TeacherNotesPanel = ({ teacherId }: { teacherId: string }) => {
  const [adding, setAdding] = useState(false);
  const { data: notes = [], isLoading } = useTeacherNotes(teacherId);

  const pinned  = notes.filter((n) => n.type === 'pinned');
  const general = notes.filter((n) => n.type === 'general');
  const private_ = notes.filter((n) => n.type === 'private');

  const groups = [
    { label: 'Pinned',  items: pinned },
    { label: 'General', items: general },
    { label: 'Private', items: private_ },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">
          Notes {notes.length > 0 && <span className="text-gray-400 font-medium">({notes.length})</span>}
        </h3>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)}
            className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Note
          </button>
        )}
      </div>

      {adding && <AddNoteForm teacherId={teacherId} onDone={() => setAdding(false)} />}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : notes.length === 0 && !adding ? (
        <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
          <FileText className="w-8 h-8" strokeWidth={1.5} />
          <p className="text-sm font-medium">No notes yet</p>
        </div>
      ) : (
        groups.map(({ label, items }) => (
          <div key={label} className="flex flex-col gap-2">
            {groups.length > 1 && (
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">{label}</p>
            )}
            {items.map((note) => (
              <NoteRow key={note._id} note={note} teacherId={teacherId} />
            ))}
          </div>
        ))
      )}
    </div>
  );
};
