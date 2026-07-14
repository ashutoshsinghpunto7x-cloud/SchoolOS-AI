import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  /** Controlled value. When provided, the input becomes interactive. */
  value?: string;
  onChange?: (value: string) => void;
  /** Called when the user presses Enter or clicks the search icon. */
  onSearch?: (value: string) => void;
}

export const SearchBar = ({
  placeholder = 'Search...',
  className,
  value,
  onChange,
  onSearch,
}: SearchBarProps) => {
  const isControlled = value !== undefined && onChange !== undefined;

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => onSearch && onSearch(value ?? '')}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-[#5B21B6] transition-colors"
        aria-label="Search"
        tabIndex={-1}
      >
        <Search className="w-5 h-5" strokeWidth={1.75} />
      </button>
      <input
        type="text"
        placeholder={placeholder}
        value={isControlled ? value : undefined}
        onChange={isControlled ? (e) => onChange(e.target.value) : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onSearch) onSearch(value ?? '');
        }}
        readOnly={!isControlled}
        className={cn(
          'w-full h-14 pl-12 pr-10',
          'bg-white rounded-2xl',
          'border border-gray-200',
          'text-gray-900 text-base placeholder:text-gray-400',
          'shadow-sm',
          'transition-all duration-200',
          'hover:border-gray-300 hover:shadow-md',
          'focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 focus:border-[#A855F7] focus:shadow-md',
        )}
      />
      {/* Clear button — shown only when there is a value */}
      {isControlled && value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
