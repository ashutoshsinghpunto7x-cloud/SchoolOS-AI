import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface WorkspaceSectionProps {
  children: ReactNode;
  className?: string;
}

export const WorkspaceSection = ({ children, className }: WorkspaceSectionProps) => {
  return (
    <section className={cn('flex flex-col gap-4', className)}>
      {children}
    </section>
  );
};
