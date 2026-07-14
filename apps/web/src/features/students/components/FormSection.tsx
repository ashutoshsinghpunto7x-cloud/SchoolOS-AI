import { ReactNode } from 'react';

interface FormSectionProps {
  number: number;
  title: string;
  description?: string;
  children: ReactNode;
}

export const FormSection = ({ number, title, description, children }: FormSectionProps) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="px-7 py-5 border-b border-gray-50 flex items-start gap-4">
        <div className="w-9 h-9 rounded-xl bg-[#5B21B6] flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-sm font-bold text-white">{number}</span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          {description && (
            <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
      </div>

      {/* Fields */}
      <div className="px-7 py-7">{children}</div>
    </div>
  );
};
