import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { goBackOrFallback } from '@/lib/navigation';

interface BackLinkProps {
  to: string;
  label: string;
  className?: string;
}

/** Shared "‹ Back" link used at the top of drill-down pages: returns to the
 *  exact previous screen when history exists, or falls back to `to`. */
export function BackLink({ to, label, className }: BackLinkProps) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => goBackOrFallback(navigate, to)}
      className={cn(
        'flex items-center gap-2 text-sm font-medium text-[#55607A] hover:text-[#1B2A4E] transition-colors mb-6 cursor-pointer',
        className,
      )}
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  );
}
