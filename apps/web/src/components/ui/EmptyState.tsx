import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-24 px-8 text-center',
        className
      )}
    >
      <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
        <Icon className="w-10 h-10 text-gray-300" strokeWidth={1.5} />
      </div>

      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>

      {description && (
        <p className="text-base text-gray-500 max-w-sm leading-relaxed">
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            'mt-8 h-12 px-6 rounded-xl text-sm font-semibold transition-all duration-150',
            action.variant === 'secondary'
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow'
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
