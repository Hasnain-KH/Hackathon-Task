import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAiChat } from '../../context/AiChatContext.jsx';
import { apiErrorMessage } from '../ui/useApiError.js';
import AiBadge from './AiBadge.jsx';
import Button from '../ui/Button.jsx';

const suggestedPrompts = {
  admin: [
    'Summarize headcount and attrition',
    'Who came late most this month?',
    'Show payroll cost by department',
  ],
  hr: [
    'How many active employees are in Engineering?',
    'Top 5 late-comers this month',
    "What's this month's attendance rate?",
  ],
  employee: [
    'How many sick leaves do I have left?',
    'What is my last payslip?',
    'Apply for leave next Monday and Tuesday',
  ],
};

function stripHtml(text) {
  return String(text || '').replace(/<[^>]*>/g, '');
}

function TypingIndicator() {
  return <div className="flex gap-1 rounded-2xl bg-slate-100 px-4 py-3" aria-label="Assistant is typing">
    {[0, 1, 2].map((dot) => <span key={dot} className="h-2 w-2 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: `${dot * 120}ms` }} />)}
  </div>;
}

export default function AiChatPanel() {
  const { user } = useAuth();
  const { open, initialPrompt, openChat, closeChat, clearInitialPrompt } = useAiChat();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const bottomRef = useRef(null);
  const prompts = useMemo(() => suggestedPrompts[user?.role] || [], [user?.role]);

  useEffect(() => {
    if (open && initialPrompt) {
      setInput(initialPrompt);
      clearInitialPrompt();
    }
  }, [open, initialPrompt, clearInitialPrompt]);

  useEffect(() => {
    if (!cooldownUntil) return undefined;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= cooldownUntil) setCooldownUntil(0);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending, open]);

  const send = async (value = input) => {
    const content = value.trim();
    if (!content || sending || cooldownUntil > Date.now()) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const response = await api.post('/ai/chat', {
        messages: next.slice(-8).map(({ role, content: messageContent }) => ({ role, content: messageContent })),
        maxHistory: 8,
      }, { timeout: 15000 });
      setMessages((current) => [...current, {
        role: 'assistant',
        content: response.data.reply || "I don't know based on the available information.",
      }]);
    } catch (requestError) {
      let friendly = apiErrorMessage(requestError, 'The assistant could not respond. Please try again.');
      if (requestError.code === 'ECONNABORTED' || requestError.code === 'ETIMEDOUT') {
        friendly = 'AI took too long. Please try again.';
      } else if (requestError.response?.status === 429) {
        const retryAfter = Number(requestError.response.headers?.['retry-after']) || 3600;
        setCooldownUntil(Date.now() + (retryAfter * 1000));
        friendly = 'AI rate limit reached. Please wait before sending another message.';
      } else if (requestError.response?.status === 503) {
        friendly = apiErrorMessage(requestError, 'AI assistant is temporarily unavailable.');
      }
      setMessages((current) => [...current, { role: 'assistant', content: friendly, isError: true }]);
    } finally {
      setSending(false);
    }
  };

  const remainingSeconds = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  return (
    <>
      {!open && <button type="button" onClick={() => openChat()} className="fixed bottom-5 right-5 z-30 rounded-full bg-brand px-5 py-3 text-sm font-bold text-white shadow-xl transition hover:bg-indigo-700" aria-label="Open HCM Assistant">
        HCM Assistant
      </button>}
      {open && <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 md:bg-transparent" onMouseDown={(event) => { if (event.target === event.currentTarget) closeChat(); }}>
        <section className="flex h-full w-full flex-col bg-white shadow-2xl md:w-[min(30rem,100vw)] md:border-l md:border-slate-200" aria-label="HCM Assistant chat">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div><h2 className="font-bold text-ink">HCM Assistant</h2><div className="mt-1"><AiBadge /></div></div>
            <button type="button" onClick={closeChat} className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100" aria-label="Close assistant">✕</button>
          </header>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {!messages.length && <div className="space-y-3">
              <p className="text-sm text-slate-600">Ask a question about your HCM workspace.</p>
              {prompts.map((prompt) => <button key={prompt} type="button" onClick={() => setInput(prompt)} className="block w-full rounded-xl border border-slate-200 p-3 text-left text-sm text-slate-700 hover:border-indigo-300 hover:bg-indigo-50">{prompt}</button>)}
            </div>}
            {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${message.role === 'user' ? 'bg-brand text-white' : message.isError ? 'border border-red-200 bg-red-50 text-red-700' : 'bg-slate-100 text-slate-800'}`}>
                {message.role === 'assistant' && !message.isError && <div className="mb-2"><AiBadge /></div>}
                <div className="prose prose-sm max-w-none break-words prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{stripHtml(message.content)}</ReactMarkdown>
                </div>
              </div>
            </div>)}
            {sending && <div className="flex justify-start"><TypingIndicator /></div>}
            <div ref={bottomRef} />
          </div>
          {remainingSeconds > 0 && <p className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">Rate limit reached. Try again in about {Math.ceil(remainingSeconds / 60)} minute(s).</p>}
          <form className="border-t border-slate-200 p-3" onSubmit={(event) => { event.preventDefault(); send(); }}>
            <div className="flex items-end gap-2">
              <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }} rows="2" maxLength="2000" placeholder="Ask HCM Assistant…" className="max-h-32 min-h-11 flex-1 resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-indigo-100" />
              <Button type="submit" disabled={sending || !input.trim() || remainingSeconds > 0}>Send</Button>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400">AI can make mistakes. Chat history clears when you refresh.</p>
          </form>
        </section>
      </div>}
    </>
  );
}
