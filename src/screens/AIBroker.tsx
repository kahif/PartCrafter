import { useState, useRef, useEffect } from 'react'
import { ask, getBrief, SUGGESTIONS } from '../data/ai'

type Msg = { role: 'ai' | 'user'; text: string }

export default function AIBroker({ symbol }: { symbol: string }) {
  const [messages, setMessages] = useState<Msg[]>([{ role: 'ai', text: "Hi, I'm Moomoo AI." }])
  const [input, setInput] = useState('')
  const [period, setPeriod] = useState<'Daily' | 'Weekly'>('Daily')
  const brief = getBrief(symbol, period)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function send(text: string) {
    const q = text.trim()
    if (!q) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: q }])
    // simulate the assistant "typing"
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'ai', text: ask(symbol, q) }])
    }, 350)
  }

  return (
    <div className="screen ai-screen">
      <div className="ai-hero">
        <div className="ai-avatar" aria-hidden>
          🐮
        </div>
      </div>

      <div className="chat">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="suggestions">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="chip" onClick={() => send(s)}>
            {s}
          </button>
        ))}
      </div>

      <div className="brief-card">
        <div className="brief-tabs">
          <button className={period === 'Daily' ? 'brief-tab active' : 'brief-tab'} onClick={() => setPeriod('Daily')}>
            Daily Brief
          </button>
          <button className={period === 'Weekly' ? 'brief-tab active' : 'brief-tab'} onClick={() => setPeriod('Weekly')}>
            Weekly Brief
          </button>
        </div>

        <p className="brief-summary">{brief.summary}</p>

        <h4 className="brief-h">Key Event</h4>
        <ol className="key-events">
          {brief.keyEvents.map((e, i) => (
            <li key={i}>
              {e.text} <sup className="src">{e.sources}</sup>
            </li>
          ))}
        </ol>

        <h4 className="brief-h">Trading Data</h4>
        <p className="brief-summary">
          {brief.tradingData} <span className="more">&gt;</span>
        </p>
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask Moomoo AI about ${symbol}…`}
          aria-label="Ask Moomoo AI"
        />
        <button type="submit" className="send-btn" aria-label="Send">
          ➤
        </button>
      </form>
    </div>
  )
}
