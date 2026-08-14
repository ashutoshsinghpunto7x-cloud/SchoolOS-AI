import { useState, useRef, useEffect } from 'react';
import { X, Sparkle, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parentWorkspaceApi } from '../api/parent-workspace.mock';
import type { AIChatMessage } from '../types';

interface AIParentAssistantProps {
  open: boolean;
  onClose: () => void;
  childId: string;
  childName: string;
}

const BASE_PROMPTS = ['Attendance this month', 'Academic progress', 'Upcoming events'];

export function AIParentAssistant({ open, onClose, childId, childName }: AIParentAssistantProps) {
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMessages([
        {
          _id: 'welcome',
          role: 'assistant',
          text: `Ask me anything about ${childName.split(' ')[0]}'s school life — attendance, academics, upcoming events, or what to focus on this week.`,
        },
      ]);
    }
  }, [open, childName]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    setMessages((prev) => [...prev, { _id: `u-${Date.now()}`, role: 'user', text: trimmed }]);
    setInput('');
    setThinking(true);
    const reply = await parentWorkspaceApi.askAI(childId, trimmed);
    setMessages((prev) => [...prev, reply]);
    setThinking(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Ask SchoolOS AI"
            className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:right-6 sm:bottom-6 z-50 w-full sm:w-[420px] max-h-[85vh] sm:max-h-[600px] bg-[#0D0D0D] sm:rounded-2xl rounded-t-2xl flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkle className="w-4 h-4 text-white" strokeWidth={1.75} />
                <h2 className="text-base font-medium text-white">SchoolOS AI</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close AI assistant"
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-white" strokeWidth={1.75} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages.map((m) => (
                <div
                  key={m._id}
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'ml-auto bg-white text-[#0D0D0D]'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {thinking && (
                <div className="bg-white/10 text-white/60 rounded-xl px-3.5 py-2.5 text-sm w-fit">
                  Thinking…
                </div>
              )}
            </div>

            {messages.length <= 1 && (
              <div className="px-5 pb-3 flex flex-wrap gap-2 shrink-0">
                {[`How is ${childName.split(' ')[0]} doing?`, ...BASE_PROMPTS].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => send(p)}
                    className="text-xs text-white/80 border border-white/15 rounded-full px-3 py-1.5 hover:bg-white/10 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 px-4 py-3 border-t border-white/10 shrink-0"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask about ${childName.split(' ')[0]}…`}
                aria-label="Ask SchoolOS AI a question"
                className="flex-1 bg-white/10 text-white placeholder:text-white/40 text-base rounded-full px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-white/30"
              />
              <button
                type="submit"
                disabled={!input.trim() || thinking}
                aria-label="Send"
                className="w-9 h-9 shrink-0 rounded-full bg-white text-[#0D0D0D] flex items-center justify-center disabled:opacity-30 transition-opacity"
              >
                <ArrowUp className="w-4 h-4" strokeWidth={2} />
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
