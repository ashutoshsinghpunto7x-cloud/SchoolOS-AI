import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, X, ChevronDown, ArrowRight, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CompanionBuddy,
  SIRI_ORB_SIZE,
  SiriMiniOrb,
  useStaticOrbBottom,
} from './CompanionBuddy';
import { companionConfigFor } from './companionConfigs';
import { FAQ_CATEGORIES, TEACHER_FAQ, searchFaq, type FaqItem } from './teacherFaq';
import { SUPPORT_PHONE } from '@/lib/support';

const BUDDY_CONFIG = companionConfigFor('teacher')!;

type Turn = { id: number; role: 'user' | 'assistant'; text: string; items?: FaqItem[] };

const SUGGESTIONS = [
  'Mark attendance',
  'Enter exam marks',
  'Create question paper',
  'View my timetable',
];

function FaqCard({ item, onOpen }: { item: FaqItem; onOpen: (path: string) => void }) {
  return (
    <div className="rounded-2xl bg-white border border-[#E8E2D6] p-3">
      <p className="m-0 text-[13px] font-semibold text-[#1B2A4E]">{item.question}</p>
      <p className="m-0 mt-1 text-[12.5px] leading-relaxed text-[#55607A]">{item.answer}</p>
      {item.path && (
        <button
          type="button"
          onClick={() => onOpen(item.path!)}
          className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-[#FBF8F3] hover:bg-[#EFEAE0] border border-[#E8E2D6] text-[#1B2A4E] text-[12px] font-semibold px-3 py-1 transition-colors cursor-pointer"
        >
          Open {item.pathLabel ?? 'page'} <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export const TeacherAssistantWidget = () => {
  const navigate = useNavigate();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const orbBottom = useStaticOrbBottom(BUDDY_CONFIG);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'faq'>('chat');
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [open, turns, view]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (panelRef.current?.contains(target) || target.closest('[data-siri-orb="true"]')) return;
      setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const ask = (text: string) => {
    const q = text.trim();
    if (!q) return;
    const items = searchFaq(q);
    setView('chat');
    setTurns((t) => [
      ...t,
      { id: nextId.current++, role: 'user', text: q },
      {
        id: nextId.current++,
        role: 'assistant',
        text: items.length
          ? items.length === 1
            ? 'Here is how to do that:'
            : 'Closest guides:'
          : "Couldn't match that directly — try simpler keywords or switch to FAQ.",
        items,
      },
    ]);
    setInput('');
  };

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-labelledby={titleId}
          style={{ bottom: `calc(${orbBottom + SIRI_ORB_SIZE + 12}px + env(safe-area-inset-bottom, 0px))` }}
          className="fixed right-4 sm:right-6 z-50 w-[370px] max-w-[calc(100vw-32px)] h-[492px] max-h-[calc(100vh-120px)] p-[2px] rounded-[22px] bg-gradient-to-br from-[#1B2A4E] via-[#254A9A] to-[#D9822B] shadow-[0_14px_42px_rgba(27,42,78,0.18)] flex flex-col font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]"
        >
          <div className="flex-1 min-h-0 bg-white dark:bg-[#141722] rounded-[20px] flex flex-col overflow-hidden">
          {/* Minimalist Header */}
          <div className="px-4 py-3 bg-white dark:bg-[#141722] border-b border-[#EFEAE0] dark:border-white/10 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <SiriMiniOrb />
              <h2 id={titleId} className="text-[14px] font-semibold text-[#1B2A4E] dark:text-white tracking-tight m-0 truncate">
                Assistant
              </h2>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="inline-flex items-center p-0.5 rounded-full bg-[#FBF8F3] dark:bg-white/10 border border-[#E8E2D6] dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setView('chat')}
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-[11.5px] font-medium transition-colors cursor-pointer',
                    view === 'chat'
                      ? 'bg-[#1B2A4E] text-white'
                      : 'text-[#55607A] dark:text-white/70 hover:text-[#1B2A4E]',
                  )}
                >
                  Ask
                </button>
                <button
                  type="button"
                  onClick={() => setView('faq')}
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-[11.5px] font-medium transition-colors cursor-pointer',
                    view === 'faq'
                      ? 'bg-[#1B2A4E] text-white'
                      : 'text-[#55607A] dark:text-white/70 hover:text-[#1B2A4E]',
                  )}
                >
                  FAQ
                </button>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="h-7 w-7 rounded-full text-[#55607A] dark:text-white/70 hover:text-[#1B2A4E] dark:hover:text-white hover:bg-[#F5F1E8] dark:hover:bg-white/10 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div ref={scrollRef} className="p-4 flex-1 overflow-y-auto space-y-3 min-h-0 bg-[#FBF8F3]/60 dark:bg-[#0F121B]">
            {view === 'chat' ? (
              <>
                {turns.length === 0 && (
                  <div className="space-y-3 pt-1">
                    <p className="text-[13px] text-[#55607A] dark:text-white/70 m-0 leading-relaxed">
                      How can I help you with your classes today?
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => ask(s)}
                          className="px-3 py-1.5 rounded-full text-[12px] font-medium bg-white dark:bg-white/5 border border-[#E8E2D6] dark:border-white/10 text-[#1B2A4E] dark:text-white hover:bg-[#F5F1E8] dark:hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {turns.map((t) =>
                  t.role === 'user' ? (
                    <div key={t.id} className="flex justify-end">
                      <p className="m-0 max-w-[85%] rounded-[16px] rounded-br-[4px] bg-[#1B2A4E] text-white text-[13px] leading-relaxed px-3.5 py-2">
                        {t.text}
                      </p>
                    </div>
                  ) : (
                    <div key={t.id} className="space-y-2">
                      <p className="m-0 text-[12.5px] text-[#55607A] dark:text-white/70">{t.text}</p>
                      {t.items?.map((item) => <FaqCard key={item.id} item={item} onOpen={go} />)}
                    </div>
                  ),
                )}
              </>
            ) : (
              <div className="space-y-3">
                {FAQ_CATEGORIES.map((cat) => (
                  <div key={cat}>
                    <p className="m-0 mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#7B859D]">
                      {cat}
                    </p>
                    <div className="space-y-1.5">
                      {TEACHER_FAQ.filter((f) => f.category === cat).map((f) => {
                        const isOpen = openFaq === f.id;
                        return (
                          <div key={f.id} className="rounded-xl bg-white border border-[#E8E2D6] overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setOpenFaq(isOpen ? null : f.id)}
                              aria-expanded={isOpen}
                              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left cursor-pointer"
                            >
                              <span className="text-[13px] font-medium text-[#1B2A4E]">{f.question}</span>
                              <ChevronDown
                                className={cn(
                                  'w-4 h-4 shrink-0 text-[#8A93A8] transition-transform',
                                  isOpen && 'rotate-180',
                                )}
                              />
                            </button>
                            {isOpen && (
                              <div className="px-3 pb-3 border-t border-[#F5F1E8] pt-2">
                                <p className="m-0 text-[12.5px] leading-relaxed text-[#55607A]">{f.answer}</p>
                                {f.path && (
                                  <button
                                    type="button"
                                    onClick={() => go(f.path!)}
                                    className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#FBF8F3] hover:bg-[#EFEAE0] border border-[#E8E2D6] text-[#1B2A4E] text-[12px] font-semibold px-3 py-1 cursor-pointer"
                                  >
                                    Open {f.pathLabel ?? 'page'} <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="pt-1 flex justify-center">
                  <a
                    href={`tel:${SUPPORT_PHONE}`}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#55607A] hover:text-[#1B2A4E] no-underline"
                  >
                    <Phone className="w-3.5 h-3.5" /> Support: {SUPPORT_PHONE}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Minimalist Pill Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="p-2.5 bg-white dark:bg-[#141722] border-t border-[#EFEAE0] dark:border-white/10 shrink-0"
          >
            <div className="flex items-center gap-1.5 bg-[#FBF8F3] dark:bg-white/5 border border-[#E8E2D6] dark:border-white/10 focus-within:border-[#1B2A4E]/40 focus-within:bg-white dark:focus-within:bg-white/10 rounded-full pl-3.5 pr-1.5 py-1 transition-colors">
              <input
                type="text"
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question…"
                aria-label="Ask the assistant"
                className="flex-1 min-w-0 bg-transparent py-1 text-[13px] text-[#1B2A4E] dark:text-white placeholder:text-[#8A93A8] outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send"
                className="w-7 h-7 rounded-full bg-[#1B2A4E] text-white flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-25 transition-opacity"
              >
                <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.2} />
              </button>
            </div>
          </form>
          </div>
        </div>
      )}
      <CompanionBuddy
        config={BUDDY_CONFIG}
        open={open}
        label="SchoolOS Assistant"
        onActivate={() => setOpen((v) => !v)}
      />
    </>
  );
};
