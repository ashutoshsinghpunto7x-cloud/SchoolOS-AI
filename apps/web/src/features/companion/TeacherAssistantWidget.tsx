import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, X, ChevronDown, ArrowRight, Phone, Mic, Square, Volume2, VolumeX } from 'lucide-react';
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
import { useVoice, type VoiceLang } from '@/features/principal-assistant/hooks/useVoice';
import { PlanReplyCard } from '@/features/academic-plan/assistant/PlanReplyCard';
import {
  usePlanAssistant, spokenPlanReply, PLAN_SUGGESTIONS, type PlanReply,
} from '@/features/academic-plan/assistant/usePlanAssistant';

const BUDDY_CONFIG = companionConfigFor('teacher')!;

type Turn = { id: number; role: 'user' | 'assistant'; text: string; items?: FaqItem[]; plan?: PlanReply };

const STORAGE_SPEAK = 'teacherAssistant.speakReplies';
const STORAGE_LANG = 'teacherAssistant.voiceLang';

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — preference just won't persist */
  }
}

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

  const [speakReplies, setSpeakReplies] = useState(() => readStored(STORAGE_SPEAK) === '1');
  const [lang, setLang] = useState<VoiceLang>(() => (readStored(STORAGE_LANG) === 'hi-IN' ? 'hi-IN' : 'en-IN'));
  const voiceSentRef = useRef(false);
  const askRef = useRef<(text: string) => void>(() => {});

  const plan = usePlanAssistant();
  const planControls = { statuses: plan.statuses, apply: plan.apply, cancel: plan.cancel };

  const voice = useVoice({
    lang,
    onFinalTranscript: (text) => {
      voiceSentRef.current = true;
      askRef.current(text);
    },
  });

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [open, turns, view, plan.busy]);

  useEffect(() => {
    if (!open) {
      voice.stopListening();
      voice.cancelSpeech();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  const addTurn = useCallback((turn: Omit<Turn, 'id'>) => {
    const id = nextId.current++;
    setTurns((t) => [...t, { ...turn, id }]);
  }, []);

  const addPlanReply = (reply: PlanReply, spoken: boolean) => {
    addTurn({ role: 'assistant', text: reply.text, plan: reply });
    if (spoken || speakReplies) voice.speak(spokenPlanReply(reply));
  };

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || plan.busy) return;
    const spoken = voiceSentRef.current;
    voiceSentRef.current = false;
    setView('chat');
    setInput('');
    addTurn({ role: 'user', text: q });

    // On the Academic Plan screens, planner requests are handled first.
    if (plan.active) {
      const reply = await plan.handle(q);
      if (reply) {
        addPlanReply(reply, spoken);
        return;
      }
    }

    const items = searchFaq(q);
    const answer = items.length
      ? items.length === 1
        ? 'Here is how to do that:'
        : 'Closest guides:'
      : "Couldn't match that directly — try simpler keywords or switch to FAQ.";
    addTurn({ role: 'assistant', text: answer, items });
    if (spoken || speakReplies) voice.speak(items.length === 1 ? items[0].answer : answer);
  };
  askRef.current = ask;

  const toggleSpeak = () => {
    const next = !speakReplies;
    setSpeakReplies(next);
    writeStored(STORAGE_SPEAK, next ? '1' : '0');
    if (!next) voice.cancelSpeech();
  };
  const toggleLang = () => {
    const next: VoiceLang = lang === 'en-IN' ? 'hi-IN' : 'en-IN';
    setLang(next);
    writeStored(STORAGE_LANG, next);
  };

  const headerBtn =
    'h-7 min-w-7 px-2 rounded-full text-[#55607A] dark:text-white/70 hover:text-[#1B2A4E] hover:bg-[#F5F1E8] dark:hover:bg-white/10 flex items-center justify-center cursor-pointer text-[11px] font-semibold transition-colors';

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
          className={cn(
            // Phone: compact sheet (short while empty, ~55% of the screen once chatting or in FAQ).
            'fixed right-3 sm:right-6 z-50 w-[370px] max-w-[calc(100vw-24px)] sm:max-w-[calc(100vw-32px)] sm:h-[492px] max-h-[calc(100dvh-120px)] p-[2px] rounded-[22px] bg-gradient-to-br from-[#1B2A4E] via-[#254A9A] to-[#D9822B] shadow-[0_14px_42px_rgba(27,42,78,0.18)] flex flex-col font-[\'DM_Sans\',\'Plus_Jakarta_Sans\',sans-serif]',
            view === 'chat' && turns.length === 0 ? 'h-auto' : 'h-[min(55dvh,420px)]',
          )}
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

              {voice.supported && (
                <button type="button" onClick={toggleLang} className={headerBtn} aria-label="Switch voice language">
                  {lang === 'en-IN' ? 'EN' : 'हिं'}
                </button>
              )}
              {voice.ttsSupported && (
                <button
                  type="button"
                  onClick={toggleSpeak}
                  className={headerBtn}
                  aria-pressed={speakReplies}
                  aria-label="Spoken replies"
                >
                  {speakReplies ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
              )}

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
                      {plan.active
                        ? "Tell me what to change in your plan, by voice or text. I'll ask before saving."
                        : 'How can I help you with your classes today?'}
                    </p>
                    <div className="flex gap-1.5 overflow-x-auto sm:flex-wrap sm:overflow-visible -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 [scrollbar-width:none]">
                      {(plan.active ? PLAN_SUGGESTIONS : SUGGESTIONS).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => ask(s)}
                          className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-[12px] font-medium bg-white dark:bg-white/5 border border-[#E8E2D6] dark:border-white/10 text-[#1B2A4E] dark:text-white hover:bg-[#F5F1E8] dark:hover:bg-white/10 transition-colors cursor-pointer"
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
                  ) : t.plan ? (
                    <PlanReplyCard
                      key={t.id}
                      reply={t.plan}
                      controls={planControls}
                      onFollowUp={(reply) => addPlanReply(reply, false)}
                      onOption={ask}
                    />
                  ) : (
                    <div key={t.id} className="space-y-2">
                      <p className="m-0 text-[12.5px] text-[#55607A] dark:text-white/70">{t.text}</p>
                      {t.items?.map((item) => <FaqCard key={item.id} item={item} onOpen={go} />)}
                    </div>
                  ),
                )}
                {plan.busy && (
                  <div className="inline-flex items-center gap-1.5 rounded-2xl bg-white border border-[#E8E2D6] px-3.5 py-2 text-[12px] text-[#55607A]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1B2A4E]/60 animate-pulse" />
                    Thinking…
                  </div>
                )}
                {voice.voiceError && <p className="m-0 text-[12px] text-red-600">{voice.voiceError}</p>}
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
                value={voice.listening ? voice.interim : input}
                onChange={(e) => setInput(e.target.value)}
                readOnly={voice.listening}
                placeholder={voice.listening ? 'Listening…' : plan.active ? 'Change your plan…' : 'Ask a question…'}
                aria-label="Ask the assistant"
                className="flex-1 min-w-0 bg-transparent py-1 text-[13px] text-[#1B2A4E] dark:text-white placeholder:text-[#8A93A8] outline-none"
              />
              {voice.supported && (
                <button
                  type="button"
                  onClick={() => (voice.listening ? voice.stopListening() : voice.startListening())}
                  disabled={plan.busy}
                  aria-label="Voice input"
                  aria-pressed={voice.listening}
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 transition-colors',
                    voice.listening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'text-[#55607A] dark:text-white/70 hover:text-[#1B2A4E] hover:bg-[#EFEAE0] dark:hover:bg-white/10',
                  )}
                >
                  {voice.listening ? <Square className="w-3 h-3 fill-current" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              )}
              <button
                type="submit"
                disabled={!input.trim() || plan.busy || voice.listening}
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
        thinking={plan.busy}
        label="SchoolOS Assistant"
        onActivate={() => setOpen((v) => !v)}
      />
    </>
  );
};
