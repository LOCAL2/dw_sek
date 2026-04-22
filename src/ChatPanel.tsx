import { useState, useRef, useEffect } from 'react'
import { useChat } from './useChat'

export default function ChatPanel({ caseId, onOpenSelector }: { caseId: string; onOpenSelector: () => void }) {
  const { messages, loading, send, clear } = useChat(caseId)
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return
    send(input.trim())
    setInput('')
  }

  return (
    <>
      {/* Case switcher */}
      <button className="case-switch-btn" onClick={onOpenSelector} aria-label="Switch case">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
        </svg>
      </button>

      {/* Toggle button */}
      <button className="chat-toggle" onClick={() => setOpen(o => !o)} aria-label="Toggle chat">
        {open ? '✕' : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <span>ถามเกี่ยวกับเหตุการณ์</span>
            <div className="chat-header-actions">
              {messages.length > 0 && (
                <button className="chat-clear" onClick={clear} aria-label="Clear chat">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              )}
              <span className="chat-badge">AI</span>
            </div>
          </div>

          <div className="chat-disclaimer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            ข้อมูล OCR อาจไม่ครบถ้วน คำตอบอาจคลาดเคลื่อนได้
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <p className="chat-empty">พิมพ์คำถามเกี่ยวกับเนื้อหาในภาพได้เลย เช่น "มีการโอนเงินเท่าไหร่" หรือ "สรุปเหตุการณ์ให้หน่อย"</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                <p>{m.content}</p>
              </div>
            ))}
            {loading && (
              <div className="chat-msg assistant">
                <p className="chat-typing"><span /><span /><span /></p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form className="chat-input-row" onSubmit={submit}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="พิมพ์คำถาม..."
              disabled={loading}
              autoFocus
            />
            <button type="submit" disabled={loading || !input.trim()}>ส่ง</button>
          </form>
        </div>
      )}
    </>
  )
}
