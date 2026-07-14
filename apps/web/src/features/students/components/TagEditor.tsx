import { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  className?: string;
}

export const TagEditor = ({ tags, onChange, maxTags = 20, className }: TagEditorProps) => {
  const [input, setInput] = useState('');

  const addTag = () => {
    const value = input.trim().toLowerCase();
    if (!value || tags.includes(value) || tags.length >= maxTags) return;
    onChange([...tags, value]);
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className={cn('flex flex-wrap gap-2 items-center', className)}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="hover:text-blue-900 focus:outline-none"
            aria-label={`Remove ${tag}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      {tags.length < maxTags && (
        <div className="flex items-center gap-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={addTag}
            placeholder="Add tag…"
            className="h-8 px-3 rounded-full border border-dashed border-gray-300 text-xs text-gray-700 placeholder:text-gray-400 bg-white focus:outline-none focus:border-[#A855F7] w-28"
            maxLength={30}
          />
          <button
            type="button"
            onClick={addTag}
            className="h-8 w-8 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Add tag"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
