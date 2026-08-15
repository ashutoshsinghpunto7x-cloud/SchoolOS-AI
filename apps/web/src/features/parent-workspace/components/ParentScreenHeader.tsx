import type { ReactNode } from 'react';
import type { ChildSummary } from '../types';
import { ChildSwitcher } from './ChildSwitcher';

interface ParentScreenHeaderProps {
  title: string;
  subtitle?: string;
  children?: ChildSummary[];
  activeChild?: ChildSummary;
  onSelectChild?: (id: string) => void;
  action?: ReactNode;
}

/** Shared top bar for the non-Home parent screens (Academics, Attendance,
 *  Fees, More) — mirrors ParentHeader's typography so switching tabs never
 *  feels like a different app. */
export function ParentScreenHeader({
  title,
  subtitle,
  children,
  activeChild,
  onSelectChild,
  action,
}: ParentScreenHeaderProps) {
  return (
    <header className="border-b border-gray-100 bg-white/95 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold tracking-tight text-gray-900">SchoolOS</span>
          <span className="hidden sm:inline text-sm text-gray-500">Parent Workspace</span>
        </div>
        {action}
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-5 sm:pb-6 pt-1 flex items-start justify-between gap-4">
        <div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{title}</p>
          {subtitle && <p className="text-base text-gray-500 mt-1">{subtitle}</p>}
        </div>

        {children && activeChild && onSelectChild && (
          <div className="shrink-0 pt-1">
            <ChildSwitcher children={children} activeChild={activeChild} onSelect={onSelectChild} />
          </div>
        )}
      </div>
    </header>
  );
}
