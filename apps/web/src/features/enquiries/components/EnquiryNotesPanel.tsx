import { useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  useEnquiryNotes,
  useCreateEnquiryNote,
  useUpdateEnquiryNote,
  useDeleteEnquiryNote,
} from '../hooks/useEnquiries';
import type { EnquiryNote } from '@schoolos/types';

interface EnquiryNotesPanelProps {
  enquiryId: string;
}

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const NoteEditor = ({
  defaultValue = '',
  onSave,
  onCancel,
  isPending,
}: {
  defaultValue?: string;
  onSave: (text: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) => {
  const [text, setText] = useState(defaultValue);
  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a note…"
        rows={3}
        className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm
                   focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="h-8 px-3 rounded-lg border border-gray-200 text-sm text-gray-500
                     hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => text.trim() && onSave(text.trim())}
          disabled={isPending || !text.trim()}
          className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700
                     flex items-center gap-1.5 text-sm font-semibold text-white
                     transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Save
        </button>
      </div>
    </div>
  );
};

const NoteRow = ({ note, enquiryId, currentUserId }: { note: EnquiryNote; enquiryId: string; currentUserId: string }) => {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { mutate: update, isPending: updatePending } = useUpdateEnquiryNote(enquiryId);
  const { mutate: del, isPending: delPending } = useDeleteEnquiryNote(enquiryId);

  const isOwner = note.createdById === currentUserId;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
      {editing ? (
        <NoteEditor
          defaultValue={note.content}
          onSave={(text) => { update({ noteId: note._id, payload: { content: text } }); setEditing(false); }}
          onCancel={() => setEditing(false)}
          isPending={updatePending}
        />
      ) : (
        <>
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{note.content}</p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-400">{fmtDateTime(note.createdAt)}</span>
            {isOwner && (
              <div className="flex items-center gap-1">
                {confirmDelete ? (
                  <>
                    <span className="text-xs text-red-600 font-medium mr-1">Delete?</span>
                    <button
                      type="button"
                      onClick={() => del(note._id)}
                      disabled={delPending}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Yes
                    </button>
                    <span className="text-xs text-gray-300">/</span>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                    >
                      No
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export const EnquiryNotesPanel = ({ enquiryId }: EnquiryNotesPanelProps) => {
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const { data: notes = [], isLoading } = useEnquiryNotes(enquiryId);
  const { mutate: create, isPending: createPending } = useCreateEnquiryNote(enquiryId);

  function handleAdd(text: string) {
    create({ content: text }, { onSuccess: () => setAdding(false) });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700">
          Notes <span className="text-gray-400 font-normal">({notes.length})</span>
        </h3>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-50 hover:bg-blue-100
                       text-xs font-semibold text-blue-600 border border-blue-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Note
          </button>
        )}
      </div>

      {adding && (
        <NoteEditor
          onSave={handleAdd}
          onCancel={() => setAdding(false)}
          isPending={createPending}
        />
      )}

      {notes.length === 0 && !adding ? (
        <p className="text-sm text-gray-400 text-center py-4">No notes yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <NoteRow
              key={note._id}
              note={note}
              enquiryId={enquiryId}
              currentUserId={user?.userId ?? ''}
            />
          ))}
        </div>
      )}
    </div>
  );
};
