import { useState } from 'react'
import { SYMBOLS, getTicker, fmt } from './data/market'
import AIBroker from './screens/AIBroker'
import Insights from './screens/Insights'
import MarketMap from './screens/MarketMap'
import Level2 from './screens/Level2'

type Tab = 'ai' | 'insights' | 'chart' | 'level2'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'ai', label: 'AI Broker', icon: '✨' },
  { id: 'insights', label: 'Insights', icon: '◎' },
  { id: 'chart', label: 'Markets', icon: '📈' },
  { id: 'level2', label: 'Level 2', icon: '☷' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('ai')
  const [symbol, setSymbol] = useState('NVDA')
  const t = getTicker(symbol)
  const chg = t.price - t.prevClose
  const chgPct = (chg / t.prevClose) * 100

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">m</span> moomoo
        </div>
        <select className="sym-select" value={symbol} onChange={(e) => setSymbol(e.target.value)} aria-label="Symbol">
          {SYMBOLS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div className={chg >= 0 ? 'topbar-quote up' : 'topbar-quote down'}>
          {fmt(t.price, 2)} <small>{chg >= 0 ? '+' : ''}{fmt(chgPct)}%</small>
        </div>
      </header>

      <main className="content">
        {tab === 'ai' && <AIBroker symbol={symbol} />}
        {tab === 'insights' && <Insights symbol={symbol} />}
        {tab === 'chart' && <MarketMap symbol={symbol} />}
        {tab === 'level2' && <Level2 symbol={symbol} />}
      </main>

      <nav className="bottom-nav">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            className={tab === tb.id ? 'nav-item active' : 'nav-item'}
            onClick={() => setTab(tb.id)}
          >
            <span className="nav-icon">{tb.icon}</span>
            <span className="nav-label">{tb.label}</span>
          </button>
        ))}
      </nav>

      <div className="disclaimer">
        Simulated data · educational prototype · not a real brokerage · no real orders are placed
      </div>
    </div>
  )
}
