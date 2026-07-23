import { ChevronLeft, Check, Reply, Archive } from 'lucide-react';
import { PhoneShell, AndroidStatusBar } from '../components/PhoneShell';

// Scene 4 — tapping the notification skips the home screen entirely and
// deep-links straight into the message it refers to.
export const Scene4MessageDetail = () => {
  return (
    <PhoneShell>
      <div className="h-full bg-[#FAFAF8] flex flex-col">
        <AndroidStatusBar />

        <div className="flex items-center gap-3 px-4 pt-3 pb-3 border-b border-[#EEEBE4]">
          <ChevronLeft size={20} className="text-[#18181B]" />
          <div>
            <p className="text-[15px] font-semibold text-[#18181B] leading-none">Principal</p>
            <span className="inline-flex items-center mt-1 px-2 py-[2px] rounded-full text-[9px] font-semibold uppercase tracking-wide bg-[#FFEDD5] text-[#C2410C]">
              High priority
            </span>
          </div>
        </div>

        <div className="flex-1 px-4 pt-4">
          <div className="rounded-2xl bg-white border border-[#EEEBE4] shadow-[0_2px_10px_rgba(0,0,0,0.04)] p-4">
            <p className="text-[13px] text-[#3f3f46] leading-relaxed">
              Staff meeting has been rescheduled to 8:15 AM tomorrow.
              <br /><br />
              Please ensure attendance.
              <br /><br />
              Regards,<br />Principal
            </p>
          </div>
          <p className="text-[11px] text-[#a8a29e] mt-2 px-1">Delivered at 7:42 AM</p>
        </div>

        <div className="px-4 pb-6 pt-2 flex flex-col gap-2">
          <button className="h-11 rounded-full bg-[#F97316] text-white text-[13px] font-semibold flex items-center justify-center gap-2">
            <Check size={16} strokeWidth={2.4} /> Mark as read
          </button>
          <div className="flex gap-2">
            <button className="flex-1 h-11 rounded-full border border-[#E7E5E0] text-[#3f3f46] text-[13px] font-medium flex items-center justify-center gap-2">
              <Reply size={15} /> Reply
            </button>
            <button className="flex-1 h-11 rounded-full border border-[#E7E5E0] text-[#3f3f46] text-[13px] font-medium flex items-center justify-center gap-2">
              <Archive size={15} /> Archive
            </button>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
};
