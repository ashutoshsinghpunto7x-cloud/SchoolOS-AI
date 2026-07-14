import { Phone, MessageCircle, FileText, LucideIcon } from 'lucide-react';
import { StatusBadge } from '@/features/students/components/StatusBadge';
import { cn } from '@/lib/utils';
import type { Student } from '@schoolos/types';

interface CommunicationCardProps {
  student: Student;
  onCall: () => void;
  onWhatsApp: () => void;
  onNote: () => void;
}

export const CommunicationCard = ({
  student,
  onCall,
  onWhatsApp,
  onNote,
}: CommunicationCardProps) => {
  const initials = student.fullName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Student header */}
      <div className="px-6 py-5 border-b border-gray-50">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#5B21B6] flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-xl font-bold text-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                {student.fullName}
              </h2>
              <StatusBadge status={student.admissionStatus} />
            </div>
            <p className="text-sm font-semibold text-blue-600 mt-0.5">
              {student.admissionNumber}
            </p>
            <p className="text-sm font-medium text-gray-500 mt-0.5">
              Class {student.class} — Section {student.section}
            </p>
          </div>
        </div>
      </div>

      {/* Parent info */}
      <div className="px-6 py-4 grid grid-cols-2 gap-5 border-b border-gray-50 bg-gray-50/50">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
            Father
          </p>
          <p className="text-base font-semibold text-gray-800">{student.fatherName}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
            Mother
          </p>
          <p className="text-base font-semibold text-gray-800">{student.motherName}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
            Primary Phone
          </p>
          <p className="text-base font-semibold text-gray-800">{student.parentPhone}</p>
        </div>
        {student.alternatePhone && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Alternate
            </p>
            <p className="text-base font-semibold text-gray-800">{student.alternatePhone}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-6 py-5 flex flex-col sm:flex-row gap-3">
        <ActionButton icon={Phone} label="AI Call Parent" onClick={onCall} variant="green" />
        <ActionButton icon={MessageCircle} label="WhatsApp" onClick={onWhatsApp} variant="emerald" />
        <ActionButton icon={FileText} label="Add Note" onClick={onNote} variant="default" />
      </div>
    </div>
  );
};

// ── Action button ─────────────────────────────────────────────────────────────

const VARIANTS = {
  green:   'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white',
  emerald: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white',
  default: 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 border border-gray-200',
};

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant: keyof typeof VARIANTS;
}

const ActionButton = ({ icon: Icon, label, onClick, variant }: ActionButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex-1 h-12 rounded-xl flex items-center justify-center gap-2',
      'text-sm font-bold transition-colors duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      VARIANTS[variant]
    )}
  >
    <Icon className="w-4 h-4" strokeWidth={2} />
    {label}
  </button>
);
