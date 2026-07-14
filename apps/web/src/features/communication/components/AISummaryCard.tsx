import { Sparkles, Lightbulb, Phone, MessageCircle } from 'lucide-react';
import { useAiStatus } from '@/features/ai/hooks/useAiConversation';
import type { Student } from '@schoolos/types';

// ── No student selected ───────────────────────────────────────────────────────

const EmptyAIPanel = () => (
  <div className="flex flex-col h-full px-5 py-6">
    <div className="flex items-center gap-2.5 mb-6">
      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-5 h-5 text-blue-600" strokeWidth={1.75} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-900">AI Assistant</h3>
        <p className="text-xs text-gray-400">Ready to help</p>
      </div>
    </div>

    <div className="flex flex-col items-center text-center py-10">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
        <Sparkles className="w-7 h-7 text-gray-300" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-semibold text-gray-600">Select a student</p>
      <p className="text-sm text-gray-400 mt-1 leading-relaxed">
        AI insights and suggestions will appear here.
      </p>
    </div>
  </div>
);

// ── Student selected ──────────────────────────────────────────────────────────

interface ActiveAIPanelProps {
  student: Student;
  onCall: () => void;
  onWhatsApp: () => void;
}

const ModeChip = () => {
  const { data: status } = useAiStatus();
  if (!status) return null;

  const modeLabel =
    status.mode === 'direct-vapi' ? 'Vapi Direct'
    : status.mode === 'n8n' ? 'n8n'
    : 'Mock';

  const modeColor =
    status.mode === 'direct-vapi' ? 'bg-green-50 text-green-700 border-green-200'
    : status.mode === 'n8n' ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-gray-50 text-gray-500 border-gray-200';

  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${modeColor}`}>
      {modeLabel}
    </span>
  );
};

const ActiveAIPanel = ({ student, onCall, onWhatsApp }: ActiveAIPanelProps) => {
  const suggestions = [
    `When is ${student.fatherName} available for a visit?`,
    `What is the fee structure for Class ${student.class}?`,
    `Draft a follow-up message for ${student.fullName}`,
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-5 border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-blue-600" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">AI Assistant</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs text-gray-400">Focused on {student.fullName}</p>
              <ModeChip />
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
        {/* Context */}
        <div className="bg-blue-50 rounded-xl px-4 py-3">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1.5">
            Student Context
          </p>
          <p className="text-sm font-semibold text-gray-900">{student.fullName}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Class {student.class} · {student.fatherName} · {student.parentPhone}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 capitalize">
            Status:{' '}
            <span className="font-medium text-gray-700">{student.admissionStatus}</span>
          </p>
        </div>

        {/* Quick suggestions */}
        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <Lightbulb className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Quick Asks
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="text-left px-3.5 py-2.5 rounded-xl text-sm text-gray-700
                           bg-gray-50 hover:bg-blue-50 hover:text-blue-700
                           border border-gray-100 hover:border-blue-200
                           transition-colors duration-150 font-medium"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
            Quick Actions
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={onCall}
              type="button"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl
                         bg-green-50 hover:bg-green-100 border border-green-100
                         text-sm font-semibold text-green-700 transition-colors"
            >
              <Phone className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
              AI Call {student.fatherName}
            </button>
            <button
              onClick={onWhatsApp}
              type="button"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl
                         bg-emerald-50 hover:bg-emerald-100 border border-emerald-100
                         text-sm font-semibold text-emerald-700 transition-colors"
            >
              <MessageCircle className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
              WhatsApp {student.fatherName}
            </button>
          </div>
        </div>
      </div>

      {/* Ask AI */}
      <div className="flex-shrink-0 px-4 pb-5 pt-3 border-t border-gray-50">
        <button
          type="button"
          className="w-full h-12 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-white
                     text-sm font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <Sparkles className="w-4 h-4" strokeWidth={2} />
          Ask AI
        </button>
      </div>
    </div>
  );
};

// ── AISummaryCard ─────────────────────────────────────────────────────────────

interface AISummaryCardProps {
  student: Student | null;
  onCall: () => void;
  onWhatsApp: () => void;
}

export const AISummaryCard = ({ student, onCall, onWhatsApp }: AISummaryCardProps) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full flex flex-col overflow-hidden">
      {student ? (
        <ActiveAIPanel student={student} onCall={onCall} onWhatsApp={onWhatsApp} />
      ) : (
        <EmptyAIPanel />
      )}
    </div>
  );
};
