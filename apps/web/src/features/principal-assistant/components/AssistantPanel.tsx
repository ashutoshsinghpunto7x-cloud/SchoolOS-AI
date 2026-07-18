import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrincipalAssistant } from '../hooks/usePrincipalAssistant';
import { ChatMessage } from './ChatMessage';
import { SuggestedPrompts } from './SuggestedPrompts';
import { extractErrorMessage } from '@/services/api';

export const AssistantPanel = () => {
  const { messages, sendMessage, isLoading, error } = usePrincipalAssistant();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col overflow-hidden h-[520px]">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 text-white flex items-center justify-center shadow-sm">
          <Sparkles className="w-[18px] h-[18px]" strokeWidth={1.5} />
        </div>
        <div>
          <div className="text-sm font-bold text-gray-900">AI Assistant</div>
          <div className="text-xs text-gray-400">Ask about attendance or fees</div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-6">
            <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-gray-300" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Good day! Ask me about attendance or fees.</p>
              <p className="text-xs text-gray-400 mt-1">Try one of the prompts below to get started.</p>
            </div>
            <SuggestedPrompts onSelect={sendMessage} disabled={isLoading} />
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-pink-500 text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" />
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-xs font-medium text-red-600">
            {extractErrorMessage(error)}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-3">
        {messages.length > 0 && (
          <div className="mb-2.5">
            <SuggestedPrompts onSelect={sendMessage} disabled={isLoading} />
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Ask about attendance or fees…"
            disabled={isLoading}
            className="flex-1 h-10 px-3.5 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 disabled:bg-gray-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={cn(
              'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
              isLoading || !input.trim()
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-br from-violet-600 to-pink-500 text-white shadow-sm hover:shadow'
            )}
            aria-label="Send"
          >
            <Send className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
};
