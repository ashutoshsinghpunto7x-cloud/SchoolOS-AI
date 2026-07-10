import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface BackLinkProps {
  to: string;
  label: string;
  className?: string;
}

/** Shared "‹ Back to X" link used at the top of drill-down pages whose role's
 *  sidebar isn't permanently docked (principal's is an overlay), so there's
 *  otherwise no way back except reopening the hamburger menu. */
export function BackLink({ to, label, className }: BackLinkProps) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className={cn(
        'flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6',
        className,
      )}
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  );
}
