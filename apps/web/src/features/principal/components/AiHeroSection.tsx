import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, ArrowRight, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { heroGradient } from '@/theme/brand';
import { usePrincipalAssistant } from '@/features/principal-assistant/hooks/usePrincipalAssistant';
import { ChatMessage } from '@/features/principal-assistant/components/ChatMessage';
import { extractErrorMessage } from '@/services/api';
import { cn } from '@/lib/utils';

const CHIPS = [
  "Show today's attendance",
  'Any urgent issues?',
  'Pending approvals',
  'Fee collection today',
  "Generate today's report",
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// The single hero moment of the dashboard — calm, premium, AI-first. Sized to
// match the other 288px cards by default; the suggestion chips only surface
// once the Principal actually focuses the input, so the resting state stays
// compact instead of permanently showing a wall of prompts.
export function AiHeroSection() {
  const { user } = useAuth();
  const { messages, sendMessage, isLoading, error } = usePrincipalAssistant();
  const [input, setInput] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dateStr = useMemo(
    () => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
    [],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || isLoading) return;
    sendMessage(value);
    setInput('');
    setInputFocused(false);
  };

  const started = messages.length > 0;
  const showChips = inputFocused && !started;

  return (
    <div
      id="ai-hero-section"
      className={cn(
        'relative overflow-hidden rounded-[22px] shadow-lg shadow-black/10 p-6 flex flex-col transition-[height] duration-300',
        maximized ? 'h-[460px]' : 'h-[288px]',
      )}
      style={{ background: heroGradient }}
    >
      <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-white/5 -translate-y-12 translate-x-12 pointer-events-none" />
      <div className="absolute -bottom-16 left-1/4 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative flex items-center justify-between">
        <span className="flex items-center gap-2 text-[11px] font-semibold text-white/60 uppercase tracking-wide">
          AI Assistant
          <span className="px-1.5 py-0.5 rounded-full bg-white/15 text-white/80 text-[10px] normal-case">Beta</span>
        </span>
        <div className="flex items-center gap-3">
          {started && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center gap-1 text-[11px] font-semibold text-white/50 hover:text-white/80 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> New chat
            </button>
          )}
          <button
            type="button"
            onClick={() => setMaximized((v) => !v)}
            className="flex items-center gap-1 text-[11px] font-semibold text-white/50 hover:text-white/80 transition-colors"
          >
            {maximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            {maximized ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      <div className="relative flex items-start gap-3 mt-3">
        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-[18px] h-[18px] text-white" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-base font-semibold text-white leading-tight">
            {greeting()}, {user?.firstName ?? 'Principal'} 👋
          </p>
          <p className="text-xs text-white/50 mt-0.5">{dateStr}</p>
        </div>
      </div>

      <div className="relative mt-3 flex-1 flex flex-col min-h-0">
        {started && (
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2.5 pr-1">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/15 text-white flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
                </div>
                <div className="bg-white/10 border border-white/15 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" />
                </div>
              </div>
            )}
            {error && (
              <div className="px-4 py-2.5 bg-red-500/15 border border-red-300/30 rounded-xl text-xs font-medium text-red-100">
                {extractErrorMessage(error)}
              </div>
            )}
          </div>
        )}

        {showChips && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <p className="text-xs text-white/60 mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  // onMouseDown fires before the input's onBlur, so the chip
                  // click registers before this section unmounts.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSend(chip)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 border border-white/15 text-white/80 hover:bg-white/20 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="relative mt-3 flex items-center gap-2 bg-white/10 border border-white/15 rounded-2xl px-4 py-1 focus-within:bg-white/15 transition-colors">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask me anything about your school…"
          disabled={isLoading}
          className="flex-1 h-10 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className="w-8 h-8 shrink-0 rounded-full bg-white/90 hover:bg-white flex items-center justify-center disabled:opacity-40 transition-colors"
          aria-label="Send"
        >
          <ArrowRight className="w-4 h-4 text-[#4C1D95]" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
