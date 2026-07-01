import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  className?: string;
}

export const SectionHeader = ({
  title,
  subtitle,
  trailing,
  className,
}: SectionHeaderProps) => {
  return (
    <div className={cn('flex items-end justify-between', className)}>
      <div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-0.5 font-normal">{subtitle}</p>
        )}
      </div>
      {trailing && <div className="ml-4 flex-shrink-0">{trailing}</div>}
    </div>
  );
};
