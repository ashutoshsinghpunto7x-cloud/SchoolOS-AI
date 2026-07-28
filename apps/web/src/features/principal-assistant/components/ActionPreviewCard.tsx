import { useState } from 'react';
import { Loader2, AlertTriangle, X, Check, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssistantMessage } from '../hooks/usePrincipalAssistant';
import type { PreviewField } from '../api/principal-assistant.api';

type ActionPreviewMessage = Extract<AssistantMessage, { type: 'action_preview' }>;

interface ActionPreviewCardProps {
  message: ActionPreviewMessage;
  onEditField: (messageId: string, key: string, value: unknown) => void;
  onApprove: (messageId: string) => void;
  onCancel: (messageId: string) => void;
}

// Generic renderer for every AI action type: the field list and its types
// come entirely from the backend's describePreview() — this component never
// needs action-specific branches as new actions are registered.
function FieldInput({ field, onChange }: { field: PreviewField; onChange: (value: unknown) => void }) {
  if (!field.editable) {
    return <div className="text-sm text-gray-700">{String(field.value)}</div>;
  }

  if (field.type === 'multiselect' && field.options) {
    const selected = Array.isArray(field.value) ? (field.value as string[]) : [];
    return (
      <div className="flex flex-wrap gap-1.5">
        {field.options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                onChange(active ? selected.filter((v) => v !== opt.value) : [...selected, opt.value])
              }
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                active
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        value={String(field.value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full text-sm rounded-lg border border-gray-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 resize-none"
      />
    );
  }

  const inputType = field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text';
  return (
    <input
      type={inputType}
      value={String(field.value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-sm rounded-lg border border-gray-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
    />
  );
}

export const ActionPreviewCard = ({ message, onEditField, onApprove, onCancel }: ActionPreviewCardProps) => {
  const [editing, setEditing] = useState(false);
  const isExecuting = message.status === 'executing';

  return (
    <div className="max-w-[92%] rounded-2xl border border-violet-100 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 bg-violet-50/70 border-b border-violet-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-violet-900">{message.preview.title}</span>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800"
        >
          <Pencil className="w-3 h-3" /> {editing ? 'Done editing' : 'Edit'}
        </button>
      </div>

      <div className="px-4 py-3 space-y-2.5">
        {message.preview.warnings?.map((w, i) => (
          <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{w}</span>
          </div>
        ))}

        {message.preview.fields.map((field) => (
          <div key={field.key} className="grid grid-cols-3 gap-3 items-start">
            <span className="text-xs font-medium text-gray-500 pt-1.5">{field.label}</span>
            <div className="col-span-2">
              {editing ? (
                <FieldInput field={field} onChange={(value) => onEditField(message.id, field.key, value)} />
              ) : (
                <div className="text-sm text-gray-800">
                  {Array.isArray(field.value) ? field.value.join(', ') : String(field.value ?? '—')}
                </div>
              )}
            </div>
          </div>
        ))}

        {message.status === 'error' && (
          <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600">{message.error}</div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onCancel(message.id)}
          disabled={isExecuting}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
        <button
          type="button"
          onClick={() => onApprove(message.id)}
          disabled={isExecuting}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-br from-violet-600 to-pink-500 shadow-sm hover:shadow disabled:opacity-60"
        >
          {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {isExecuting ? 'Saving…' : 'Save & Send'}
        </button>
      </div>
    </div>
  );
};
