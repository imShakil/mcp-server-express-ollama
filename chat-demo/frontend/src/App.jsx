import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    backendUrl: import.meta.env.VITE_API_URL || '',
  });
  const [showSettings, setShowSettings] = useState(false);
  const [health, setHealth] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetch(`${settings.backendUrl}/health`)
      .then(r => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const assistantMsg = { role: 'assistant', content: '', thinking: '' };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const res = await fetch(`${settings.backendUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.chunk) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + data.chunk,
                };
                return updated;
              });
            }
            if (data.thinking) {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    thinking: (last.thinking || '') + data.thinking,
                  };
                }
                return updated;
              });
            }
          } catch { }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `Error: ${err.message}`,
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="app">
      <header>
        <div className="header-left">
          <h1>SyftCommerce</h1>
          <span className="badge">AI Shopping Assistant</span>
        </div>
        <div className="header-right">
          {health && (
            <span className="status">
              {health.provider} / {health.model}
            </span>
          )}
          <button className="btn-icon" onClick={() => setShowSettings(!showSettings)} title="Settings">
            ⚙️
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="settings-panel">
          <label>
            Backend URL
            <input
              value={settings.backendUrl}
              onChange={e => setSettings(prev => ({ ...prev, backendUrl: e.target.value }))}
            />
          </label>
        </div>
      )}

      <div className="messages">
        {messages.length === 0 && (
          <div className="empty">
            <div className="empty-icon">🛍️</div>
            <p>Ask me anything about your store!</p>
            <p className="hint">
              Try: <em>"Search for red dresses"</em>, <em>"Show my cart"</em>, <em>"Track order 123"</em>
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`msg ${msg.role}`}>
            <div className="avatar">{msg.role === 'user' ? '👤' : '🤖'}</div>
            <div className="bubble">
              {msg.role === 'assistant' ? (
                <>
                  {msg.thinking && (
                    <details className="thinking">
                      <summary>🤔 Thinking</summary>
                      <ReactMarkdown>{msg.thinking}</ReactMarkdown>
                    </details>
                  )}
                  <ReactMarkdown>{msg.content || (loading && i === messages.length - 1 ? '...' : '')}</ReactMarkdown>
                </>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="input-bar">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about products, cart, orders..."
          disabled={loading}
          rows={1}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export default App;
