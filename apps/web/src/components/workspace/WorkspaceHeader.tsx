import { ReactNode } from 'react';

interface WorkspaceHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export const WorkspaceHeader = ({ title, subtitle, action }: WorkspaceHeaderProps) => {
  return (
    <div className="flex items-start justify-between mb-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-base text-gray-500 mt-1.5 leading-relaxed">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="ml-6 flex-shrink-0 mt-1">{action}</div>
      )}
    </div>
  );
};
