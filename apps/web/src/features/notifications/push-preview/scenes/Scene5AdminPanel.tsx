import { useState } from 'react';
import { Users, GraduationCap, Wallet, UserRound, UsersRound, Paperclip, Calendar, Clock, Megaphone } from 'lucide-react';
import { PhoneShell, AndroidStatusBar } from '../components/PhoneShell';
import { NotificationCard, type NotificationPriority } from '../components/NotificationCard';

const RECIPIENTS = [
  { id: 'teachers', label: 'All teachers', icon: Users },
  { id: 'students', label: 'All students', icon: GraduationCap },
  { id: 'parents', label: 'Parents', icon: UsersRound },
  { id: 'accountant', label: 'Accountant', icon: Wallet },
  { id: 'custom', label: 'Custom users', icon: UserRound },
] as const;

const PRIORITIES: Array<{ id: NotificationPriority; label: string }> = [
  { id: 'normal', label: 'Normal' },
  { id: 'high', label: 'High' },
  { id: 'emergency', label: 'Emergency' },
];

const REPEATS = ['Immediately', 'Tomorrow', 'Weekly', 'Monthly'] as const;

// Scene 5 + 6 — the composer the Principal actually types into, with the
// Android preview reflecting every keystroke live rather than as a separate
// static panel.
export const Scene5AdminPanel = () => {
  const [recipient, setRecipient] = useState<(typeof RECIPIENTS)[number]['id']>('teachers');
  const [priority, setPriority] = useState<NotificationPriority>('high');
  const [title, setTitle] = useState('Message from Principal');
  const [body, setBody] = useState('Staff meeting has been rescheduled to 8:15 AM tomorrow. Attendance is compulsory.');
  const [repeat, setRepeat] = useState<(typeof REPEATS)[number]>('Immediately');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
      {/* Composer */}
      <div className="rounded-3xl bg-white border border-[#EEEBE4] shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-7">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#C2410C] mb-1">Compose</p>
        <h3 className="text-[22px] font-semibold text-[#18181B] mb-6">Send push notification</h3>

        <div className="mb-6">
          <label className="text-[13px] font-medium text-[#3f3f46] mb-2 block">Recipient</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {RECIPIENTS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setRecipient(id)}
                className={`flex items-center gap-2 h-11 px-3 rounded-xl border text-[13px] font-medium transition-colors ${
                  recipient === id
                    ? 'border-[#F97316] bg-[#FFF7ED] text-[#C2410C]'
                    : 'border-[#EEEBE4] text-[#57534E] hover:border-[#E7E5E0]'
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="text-[13px] font-medium text-[#3f3f46] mb-2 block">Priority</label>
          <div className="flex gap-2">
            {PRIORITIES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPriority(id)}
                className={`h-10 px-4 rounded-full text-[13px] font-semibold border transition-colors ${
                  priority === id
                    ? id === 'emergency'
                      ? 'bg-[#DC2626] border-[#DC2626] text-white'
                      : 'bg-[#F97316] border-[#F97316] text-white'
                    : 'border-[#EEEBE4] text-[#57534E]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-[13px] font-medium text-[#3f3f46] mb-2 block">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-[#EEEBE4] text-[14px] text-[#18181B] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15"
          />
        </div>

        <div className="mb-6">
          <label className="text-[13px] font-medium text-[#3f3f46] mb-2 block">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full px-3.5 py-3 rounded-xl border border-[#EEEBE4] text-[14px] text-[#18181B] resize-none focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15"
          />
        </div>

        <button
          type="button"
          className="flex items-center gap-2 h-10 px-4 rounded-xl border border-dashed border-[#E7E5E0] text-[13px] text-[#78716C] mb-6"
        >
          <Paperclip size={15} /> Upload attachment
        </button>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-[13px] font-medium text-[#3f3f46] mb-2 block">Schedule date</label>
            <div className="h-11 px-3.5 rounded-xl border border-[#EEEBE4] flex items-center gap-2 text-[13px] text-[#78716C]">
              <Calendar size={15} /> 23 Jul 2026
            </div>
          </div>
          <div>
            <label className="text-[13px] font-medium text-[#3f3f46] mb-2 block">Schedule time</label>
            <div className="h-11 px-3.5 rounded-xl border border-[#EEEBE4] flex items-center gap-2 text-[13px] text-[#78716C]">
              <Clock size={15} /> 7:00 AM
            </div>
          </div>
        </div>

        <div className="mb-8">
          <label className="text-[13px] font-medium text-[#3f3f46] mb-2 block">Repeat</label>
          <div className="flex gap-2 flex-wrap">
            {REPEATS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRepeat(r)}
                className={`h-9 px-3.5 rounded-full text-[12.5px] font-medium border ${
                  repeat === r ? 'bg-[#18181B] border-[#18181B] text-white' : 'border-[#EEEBE4] text-[#57534E]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button className="h-12 px-5 rounded-xl border border-[#E7E5E0] text-[#3f3f46] text-[14px] font-semibold">
            Preview notification
          </button>
          <button className="h-12 px-5 rounded-xl bg-[#18181B] text-white text-[14px] font-semibold">
            Send now
          </button>
          <button className="h-12 px-5 rounded-xl bg-[#F97316] text-white text-[14px] font-semibold">
            Schedule
          </button>
        </div>
      </div>

      {/* Live preview */}
      <div className="sticky top-6 flex flex-col items-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#a8a29e] mb-4 self-start">Live preview</p>
        <PhoneShell className="scale-[0.72] origin-top -mb-40">
          <div className="h-full bg-gradient-to-b from-[#1a1d29] to-[#0f1117]">
            <AndroidStatusBar dark />
            <div className="px-3 mt-8">
              <NotificationCard
                priority={priority}
                categoryIcon={<Megaphone size={16} strokeWidth={2.2} />}
                sender={title || 'Notification title'}
                body={body || 'Message body appears here as you type.'}
                time="now"
                expanded
              />
            </div>
          </div>
        </PhoneShell>
      </div>
    </div>
  );
};
