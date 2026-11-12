import { useEffect, useRef, useState } from 'react';
import { contact } from '../data/site.js';
import './heeva-chat.css';

const API_URL = import.meta.env.VITE_HEEVA_CHAT_URL?.replace(/\/+$/, '');
const QUICK_QUESTIONS = [
  { en: 'Find a course', fa: 'پیدا کردن دوره' },
  { en: 'The one free lesson', fa: 'یک جلسه رایگان' },
  { en: 'AI courses', fa: 'دوره‌های هوش مصنوعی' },
  { en: 'Business services', fa: 'خدمات سازمانی' },
];

const greetings = [
  {
    role: 'assistant',
    content: 'Hello! Welcome to Heeva. I can help with courses, the one free lesson, registration and Heeva for Business. فارسی هم می‌توانم پاسخ بدهم. How can I help?',
  },
];

function makeClientId() {
  try {
    const key = 'heeva-chat-session';
    let value = sessionStorage.getItem(key);
    if (!value) {
      value = crypto.randomUUID();
      sessionStorage.setItem(key, value);
    }
    return value;
  } catch {
    return `session-${Math.random().toString(36).slice(2)}`;
  }
}

export default function HeevaChat() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState(greetings);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [clientId] = useState(makeClientId);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      inputRef.current?.focus();
    }
  }, [open, messages, sending]);

  const sendMessage = async (value = text) => {
    const prompt = value.trim();
    if (!prompt || sending || prompt.length > 1200) return;
    const nextMessages = [...messages, { role: 'user', content: prompt }].slice(-11);
    setMessages(nextMessages);
    setText('');
    setError('');
    setSending(true);
    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, messages: nextMessages.filter((item) => item.role !== 'assistant' || item !== greetings[0]) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 429) throw new Error(payload.error || 'A short pause is needed. Please try again in a minute.');
        if (response.status === 503) throw new Error(payload.error || 'Our assistant is temporarily unavailable.');
        throw new Error(payload.error || 'I could not send that just now. Please try again.');
      }
      setMessages((current) => [...current, { role: 'assistant', content: payload.reply || 'Please contact our team for help.' }].slice(-12));
    } catch (err) {
      setError(err.message || 'The assistant is not connected yet.');
      setMessages((current) => [...current, {
        role: 'assistant',
        content: 'I’m sorry, I can’t reach the assistant right now. Our team can still help you directly on WhatsApp or by email.',
      }].slice(-12));
    } finally {
      setSending(false);
    }
  };

  const quickAsk = (item) => {
    const isPersian = /[\u0600-\u06FF]/.test(messages[messages.length - 1]?.content || '');
    sendMessage(isPersian ? item.fa : item.en);
  };

  const waUrl = `https://wa.me/${contact.whatsappLink}?text=${encodeURIComponent('Hello Heeva, I need help with a course enquiry.')}`;

  if (!API_URL) return null;

  return (
    <div className="heeva-chat-root">
      {open && (
        <section className="heeva-chat-panel" aria-label="Heeva AI Support" aria-live="polite">
          <header className="heeva-chat-header">
            <div className="heeva-chat-avatar" aria-hidden="true">H</div>
            <div className="heeva-chat-heading">
              <strong>Heeva Support</strong>
              <span>AI assistant · English & فارسی</span>
            </div>
            <button className="heeva-chat-close" type="button" aria-label="Close chat" onClick={() => setOpen(false)}>×</button>
          </header>
          <div className="heeva-chat-messages">
            {messages.map((message, index) => (
              <div className={`heeva-chat-message ${message.role === 'user' ? 'is-user' : 'is-assistant'}`} key={index} dir="auto">
                {message.content}
              </div>
            ))}
            {sending && <div className="heeva-chat-message is-assistant heeva-chat-typing">Heeva is typing…</div>}
            <div ref={endRef} />
          </div>
          {messages.length <= 1 && (
            <div className="heeva-chat-quick">
              {QUICK_QUESTIONS.map((item) => <button key={item.en} type="button" onClick={() => quickAsk(item)}>{item.en}</button>)}
            </div>
          )}
          {error && <div className="heeva-chat-error" role="status">{error}</div>}
          <form className="heeva-chat-form" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
            <input
              ref={inputRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={1200}
              placeholder="Write your question… / سوال خود را بنویسید"
              aria-label="Your message"
              disabled={sending}
            />
            <button type="submit" disabled={sending || !text.trim()} aria-label="Send message">↑</button>
          </form>
          <div className="heeva-chat-footer">
            <span>AI via OpenAI · Don’t share children’s details or payment information.</span>
            <span className="heeva-chat-handover">
              <a href={waUrl} target="_blank" rel="noreferrer">WhatsApp ↗</a>
              <a href={`mailto:${contact.email}`}>Email ↗</a>
            </span>
          </div>
        </section>
      )}
      <button
        className={`heeva-chat-launcher ${open ? 'is-open' : ''}`}
        type="button"
        aria-expanded={open}
        aria-label={open ? 'Close Heeva Support chat' : 'Open Heeva Support chat'}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="heeva-chat-launcher-icon" aria-hidden="true">{open ? '×' : '✳'}</span>
        <span>{open ? 'Close' : 'Heeva Support'}</span>
      </button>
    </div>
  );
}
