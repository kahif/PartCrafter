import { useMemo, useState } from 'react'
import { getTicker, getCandles, fmt, type Timeframe } from '../data/market'
import CandleChart from '../components/CandleChart'

const TIMEFRAMES: Timeframe[] = ['Daily', 'Weekly', 'Monthly', 'Quarterly']

const PATTERNS = [
  { name: 'Double Bottom', path: 'M2 6 L8 26 L14 10 L20 26 L26 4' },
  { name: 'Triple Bottom', path: 'M2 8 L7 24 L11 12 L15 24 L19 12 L23 24 L27 4' },
  { name: 'Head and Shoulders Bottom', path: 'M2 10 L6 20 L10 14 L14 26 L18 14 L22 20 L26 8' },
  { name: 'Arc Bottom', path: 'M2 8 C8 30 20 30 27 8' },
]

const TOOLS = ['⊹', '⏺', '☰', '🔓', '🗑', '⚙', '⤢']

export default function MarketMap({ symbol }: { symbol: string }) {
  const [tf, setTf] = useState<Timeframe>('Daily')
  const t = getTicker(symbol)
  const candles = useMemo(() => getCandles(symbol, tf, tf === 'Daily' ? 90 : 60), [symbol, tf])
  const chg = t.price - t.prevClose
  const chgPct = (chg / t.prevClose) * 100

  return (
    <div className="screen map-screen">
      <div className="map-head">
        <div>
          <div className="map-sym">{symbol}</div>
          <div className={chg >= 0 ? 'map-price up' : 'map-price down'}>
            {fmt(t.price, 3)} {chg >= 0 ? '▲' : '▼'}
            <div className="map-chg">
              {chg >= 0 ? '+' : ''}
              {fmt(chg, 3)} &nbsp; {chg >= 0 ? '+' : ''}
              {fmt(chgPct)}%
            </div>
          </div>
        </div>
        <div className="badge-orange">
          <b>40+</b>
          <span>Charting Tools</span>
        </div>
      </div>

      <div className="chart-toolbar">
        {TOOLS.map((t2, i) => (
          <button key={i} className="tool-btn" aria-label={`tool ${i}`}>
            {t2}
          </button>
        ))}
      </div>

      <div className="chart-wrap">
        <CandleChart candles={candles} width={340} height={230} />
      </div>

      <div className="tf-tabs">
        {TIMEFRAMES.map((f) => (
          <button key={f} className={tf === f ? 'tf-tab active' : 'tf-tab'} onClick={() => setTf(f)}>
            {f}
          </button>
        ))}
        <div className="badge-orange-soft">
          <b>20+</b>
          <span>Pattern Types</span>
        </div>
      </div>

      <h3 className="section-title">Pattern Finder</h3>
      <div className="pattern-grid">
        {PATTERNS.map((p) => (
          <div key={p.name} className="pattern-card">
            <svg viewBox="0 0 29 32" className="pattern-svg" preserveAspectRatio="none">
              <path d={p.path} className="pattern-line" />
            </svg>
            <span className="pattern-name">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
