import { useState } from 'react';
import { X, MessageCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Student } from '@schoolos/types';

const buildTemplate = (student: Student): string =>
  `Hello ${student.fatherName},

Thank you for your interest in Sunrise Academy.

We are reaching out regarding the admission of ${student.fullName} in Class ${student.class}.

We would love to schedule a campus visit for you at your convenience. Our team is happy to answer any questions about our teaching approach, facilities, and fee structure.

Please feel free to call us anytime or reply to this message.

Warm Regards,
Anita Sharma
Reception · Sunrise Academy`;

interface WhatsAppModalProps {
  student: Student;
  onClose: () => void;
  onSend: (message: string) => Promise<void>;
}

export const WhatsAppModal = ({ student, onClose, onSend }: WhatsAppModalProps) => {
  const [message, setMessage] = useState(() => buildTemplate(student));
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;
    setIsLoading(true);
    try {
      await onSend(message.trim());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900">Send WhatsApp</h2>
            <p className="text-sm text-gray-500">
              To {student.fatherName} · {student.parentPhone}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Message editor */}
        <div className="px-6 py-4">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={9}
            className={cn(
              'w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50',
              'text-sm text-gray-800 leading-relaxed resize-none',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400',
              'transition-colors'
            )}
          />
          <p className="text-xs text-gray-400 mt-1.5 text-right">
            {message.length} characters
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isLoading || !message.trim()}
            className={cn(
              'flex-1 h-12 rounded-xl flex items-center justify-center gap-2',
              'text-sm font-bold text-white transition-colors',
              'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <MessageCircle className="w-4 h-4" />
                Send Message
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
