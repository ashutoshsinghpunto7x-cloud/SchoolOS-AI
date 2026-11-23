import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Send, X, ChevronDown, ArrowRight, LifeBuoy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CompanionBuddy } from './CompanionBuddy';
import { companionConfigFor } from './companionConfigs';
import { FAQ_CATEGORIES, TEACHER_FAQ, searchFaq, type FaqItem } from './teacherFaq';
import { SUPPORT_PHONE } from '@/lib/support';

const BUDDY_CONFIG = companionConfigFor('teacher')!;

// Teacher's floating assistant: type a question and get the closest FAQ
// answers (with a button that opens the right page), or browse every FAQ by
// topic. Everything is local — no server call — so it answers instantly.

type Turn = { id: number; role: 'user' | 'assistant'; text: string; items?: FaqItem[] };

const SUGGESTIONS = ['How do I mark attendance?', 'How do I enter marks?', 'How do I make a question paper?', 'Where is my timetable?'];

function FaqCard({ item, onOpen }: { item: FaqItem; onOpen: (path: string) => void }) {
  return (
    <div className="rounded-2xl bg-white border border-[#E8E2D6] p-3">
      <p className="m-0 text-[13px] font-bold text-[#1B2A4E]">{item.question}</p>
      <p className="m-0 mt-1 text-[13px] leading-relaxed text-[#55607A]">{item.answer}</p>
      {item.path && (
        <button
          type="button"
          onClick={() => onOpen(item.path!)}
          className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#1B2A4E] text-white text-[12px] font-semibold px-3 py-1.5 cursor-pointer"
        >
          Open {item.pathLabel ?? 'page'} <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export const TeacherAssistantWidget = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [showFaq, setShowFaq] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [open, turns, showFaq]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const ask = (text: string) => {
    const q = text.trim();
    if (!q) return;
    const items = searchFaq(q);
    setShowFaq(false);
    setTurns((t) => [
      ...t,
      { id: nextId.current++, role: 'user', text: q },
      {
        id: nextId.current++,
        role: 'assistant',
        text: items.length
          ? items.length === 1
            ? 'Here is what I found:'
            : 'These should help:'
          : "I couldn't find an answer to that. Try different words, browse the FAQ below, or call support.",
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
          role="dialog"
          aria-label="SchoolOS assistant"
          style={{ bottom: 168 }}
          className="fixed right-4 sm:right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] h-[540px] max-h-[calc(100vh-190px)] bg-white rounded-[24px] shadow-[0_20px_50px_rgba(27,42,78,0.28)] border border-[#E8E2D6] flex flex-col overflow-hidden font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]"
        >
          <div className="px-4 py-3.5 bg-gradient-to-r from-[#1B2A4E] to-[#254A9A] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#F5B332]" />
              <h3 className="text-[15px] font-bold m-0">SchoolOS Assistant</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div ref={scrollRef} className="p-4 flex-1 overflow-y-auto space-y-3 min-h-0 bg-[#FAF8F5]">
            {turns.length === 0 && !showFaq && (
              <div className="space-y-3">
                <p className="text-[13px] text-[#55607A] m-0">
                  Hi! Ask me how to do anything on your dashboard, or browse the FAQ.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ask(s)}
                      className="px-3 py-1.5 rounded-full text-[12px] font-medium bg-white border border-[#E8E2D6] text-[#1B2A4E] hover:bg-[#F3EEE3] cursor-pointer"
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
                  <p className="m-0 max-w-[85%] rounded-2xl rounded-br-md bg-[#1B2A4E] text-white text-[13px] px-3.5 py-2">{t.text}</p>
                </div>
              ) : (
                <div key={t.id} className="space-y-2">
                  <p className="m-0 text-[13px] text-[#55607A]">{t.text}</p>
                  {t.items?.map((item) => <FaqCard key={item.id} item={item} onOpen={go} />)}
                </div>
              ),
            )}

            {showFaq && (
              <div className="space-y-3">
                {FAQ_CATEGORIES.map((cat) => (
                  <div key={cat}>
                    <p className="m-0 mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#8A93A8]">{cat}</p>
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
                              <span className="text-[13px] font-semibold text-[#1B2A4E]">{f.question}</span>
                              <ChevronDown className={cn('w-4 h-4 shrink-0 text-[#8A93A8] transition-transform', isOpen && 'rotate-180')} />
                            </button>
                            {isOpen && (
                              <div className="px-3 pb-3">
                                <p className="m-0 text-[13px] leading-relaxed text-[#55607A]">{f.answer}</p>
                                {f.path && (
                                  <button
                                    type="button"
                                    onClick={() => go(f.path!)}
                                    className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#1B2A4E] text-white text-[12px] font-semibold px-3 py-1.5 cursor-pointer"
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
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowFaq((v) => !v)}
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold bg-[#F5B332] text-[#1B2A4E] cursor-pointer"
              >
                {showFaq ? 'Hide FAQ' : 'Browse FAQ'}
              </button>
              <a
                href={`tel:${SUPPORT_PHONE}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-white border border-[#E8E2D6] text-[#1B2A4E] no-underline"
              >
                <LifeBuoy className="w-3.5 h-3.5" /> Support {SUPPORT_PHONE}
              </a>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="p-3 bg-white border-t border-[#E8E2D6] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask how to do something…"
              aria-label="Ask the assistant"
              className="flex-1 min-w-0 bg-[#F3EEE3] rounded-full px-3.5 py-2 text-[13px] text-[#1B2A4E] outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send"
              className="w-9 h-9 rounded-full bg-[#1B2A4E] text-white flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
      <CompanionBuddy config={BUDDY_CONFIG} open={open} label="Ask the assistant" onActivate={() => setOpen((v) => !v)} />
    </>
  );
};
