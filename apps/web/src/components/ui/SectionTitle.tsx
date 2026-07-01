import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionTitleProps {
  children: ReactNode;
  subtitle?: string;
  className?: string;
  /** Trailing element rendered to the right (e.g. a "See all" link) */
  trailing?: ReactNode;
}

export const SectionTitle = ({
  children,
  subtitle,
  className,
  trailing,
}: SectionTitleProps) => {
  return (
    <div className={cn('flex items-end justify-between mb-4', className)}>
      <div>
        <h2 className="text-lg font-semibold text-gray-900 leading-tight">
          {children}
        </h2>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {trailing && (
        <div className="ml-4 flex-shrink-0 text-sm">{trailing}</div>
      )}
    </div>
  );
};
