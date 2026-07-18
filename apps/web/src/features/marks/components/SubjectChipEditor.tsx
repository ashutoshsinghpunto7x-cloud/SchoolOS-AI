import { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// A variant of students/TagEditor that preserves exact casing — subjects are
// matched case-sensitively against Timetable.entries[].subjectName elsewhere
// (marks.service's teacher-scope guard, the teacher's exam picker), so
// TagEditor's forced lowercasing would silently break that match (e.g.
// "Maths" saved here would never match a timetable entry's "Maths").
interface SubjectChipEditorProps {
  values: string[];
  onChange: (values: string[]) => void;
  maxItems?: number;
  placeholder?: string;
}

export const SubjectChipEditor = ({ values, onChange, maxItems = 20, placeholder = 'Add subject…' }: SubjectChipEditorProps) => {
  const [input, setInput] = useState('');

  const add = () => {
    const value = input.trim();
    if (!value || values.some((v) => v.toLowerCase() === value.toLowerCase()) || values.length >= maxItems) return;
    onChange([...values, value]);
    setInput('');
  };

  const remove = (value: string) => onChange(values.filter((v) => v !== value));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    } else if (e.key === 'Backspace' && !input && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {values.map((value) => (
        <span
          key={value}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold"
        >
          {value}
          <button type="button" onClick={() => remove(value)} className="hover:text-blue-900 focus:outline-none" aria-label={`Remove ${value}`}>
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      {values.length < maxItems && (
        <div className="flex items-center gap-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={add}
            placeholder={placeholder}
            className={cn(
              'h-8 px-3 rounded-full border border-dashed border-gray-300 text-xs text-gray-700',
              'placeholder:text-gray-400 bg-white focus:outline-none focus:border-[#A855F7] w-32',
            )}
            maxLength={40}
          />
          <button
            type="button"
            onClick={add}
            className="h-8 w-8 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Add subject"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
