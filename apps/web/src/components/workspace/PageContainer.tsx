import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  /** Narrower layout for forms and focused content */
  narrow?: boolean;
}

export const PageContainer = ({ children, className, narrow = false }: PageContainerProps) => {
  return (
    <div
      className={cn(
        'w-full mx-auto px-8 py-10',
        narrow ? 'max-w-3xl' : 'max-w-7xl',
        className
      )}
    >
      {children}
    </div>
  );
};
