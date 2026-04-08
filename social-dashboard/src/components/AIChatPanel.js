// ─────────────────────────────────────────────────────────────────────────────
// AIChatPanel — Slide-up AI Analyst interface
// Sends questions to /api/chat and renders structured responses with
// dynamic charts, tables, or text insights
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Send, Loader2, BarChart2, Lightbulb, ChevronRight } from 'lucide-react';
import DynamicViz from './DynamicViz';

const SUGGESTED_QUESTIONS = [
  { icon: '📈', text: 'Which platform is growing fastest?' },
  { icon: '🎯', text: 'What content type gets the most engagement?' },
  { icon: '🗺️', text: 'Show me our top cities and countries' },
  { icon: '🏆', text: 'Summarize our top performing posts' },
  { icon: '📊', text: 'Compare reach across all platforms' },
  { icon: '🔮', text: 'When will YouTube hit 100K subscribers?' },
  { icon: '📅', text: 'How does Sunday content compare to weekday?' },
  { icon: '💡', text: 'What should we focus on to grow faster?' },
];

function TypingIndicator() {
  return (
    <div className="flex gap-3 ai-message">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600
                      flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles size={13} className="text-white" />
      </div>
      <div className="ai-bubble flex items-center gap-1 py-4 px-5">
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AIMessage({ msg }) {
  return (
    <div className="flex gap-3 ai-message">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600
                      flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles size={13} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        {/* Main message */}
        <div className="ai-bubble">
          <p className="text-slate-700 leading-relaxed">{msg.message}</p>

          {/* Highlights */}
          {msg.highlights?.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {msg.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center
                                  justify-center flex-shrink-0 mt-0.5 text-xs font-bold">
                    {i + 1}
                  </div>
                  {h}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Visualization */}
        {msg.visualization && msg.visualization.type && (
          <DynamicViz visualization={msg.visualization} />
        )}
      </div>
    </div>
  );
}

function UserMessage({ text }) {
  return (
    <div className="flex justify-end ai-message">
      <div className="user-bubble max-w-[85%]">{text}</div>
    </div>
  );
}

export default function AIChatPanel({ open, onClose }) {
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [history,   setHistory]   = useState([]); // API message history
  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  async function sendMessage(text) {
    if (!text.trim() || loading) return;
    const userText = text.trim();
    setInput('');
    setLoading(true);

    setMessages(prev => [...prev, { role: 'user', text: userText }]);

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: userText, history }),
      });

      const data = await res.json();

      setMessages(prev => [...prev, { role: 'ai', ...data }]);
      setHistory(prev => [
        ...prev,
        { role: 'user',      content: userText },
        { role: 'assistant', content: data.message || '' },
      ]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'ai',
        message: 'Sorry, something went wrong connecting to the AI. Please try again.',
        highlights: [],
        visualization: null,
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(input);
  }

  if (!open) return null;

  const hasMessages = messages.length > 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
         style={{ height: '420px' }}>

      {/* Backdrop blur */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none"
           style={{ top: '-60px' }} />

      {/* Panel */}
      <div className="relative bg-white border-t border-slate-200 shadow-2xl flex flex-col h-full">

        {/* Panel Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-100
                        bg-gradient-to-r from-slate-900 to-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600
                            flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">AI Social Analyst</div>
              <div className="text-slate-400 text-xs">Ask anything about your data</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">

          {/* Welcome state */}
          {!hasMessages && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={15} className="text-amber-500" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Try asking...
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q.text)}
                    className="flex items-center gap-2 text-left text-xs text-slate-600 bg-slate-50
                               hover:bg-blue-50 hover:text-blue-700 border border-slate-100
                               hover:border-blue-200 rounded-xl px-3 py-2.5 transition-all duration-150
                               font-medium group"
                  >
                    <span className="text-base flex-shrink-0">{q.icon}</span>
                    <span className="flex-1 leading-snug">{q.text}</span>
                    <ChevronRight size={12} className="text-slate-300 group-hover:text-blue-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.map((msg, i) => (
            msg.role === 'user'
              ? <UserMessage key={i} text={msg.text} />
              : <AIMessage   key={i} msg={msg} />
          ))}

          {/* Loading indicator */}
          {loading && <TypingIndicator />}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50">
          <form onSubmit={handleSubmit} className="flex gap-3 items-center">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about your analytics... e.g. 'Which platform should we invest in?'"
              className="input-base flex-1 text-sm bg-white"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl
                         bg-gradient-to-r from-blue-600 to-violet-600 text-white
                         disabled:opacity-40 disabled:cursor-not-allowed
                         hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-150"
            >
              {loading
                ? <Loader2 size={16} className="animate-spin" />
                : <Send size={15} />}
            </button>
          </form>
          <div className="text-center mt-2 text-xs text-slate-400">
            Powered by Claude AI • Analyzing 90 days of Lake Pointe social data
          </div>
        </div>
      </div>
    </div>
  );
}
