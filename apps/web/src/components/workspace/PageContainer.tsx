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
        'w-full mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10',
        narrow ? 'max-w-3xl' : 'max-w-7xl',
        className
      )}
    >
      {children}
    </div>
  );
};
