import { useMemo } from 'react'
import { getTicker, getCandles, fmt, fmtCompact } from '../data/market'
import CandleChart from '../components/CandleChart'

// Deterministic consensus breakdown derived from the symbol.
function consensus(symbol: string) {
  const t = getTicker(symbol)
  const bull = t.price >= t.prevClose
  const buy = bull ? 85 : 62
  const hold = bull ? 12 : 26
  const sell = 100 - buy - hold
  const label = buy >= 80 ? 'Strong Buy' : buy >= 60 ? 'Buy' : buy >= 45 ? 'Hold' : 'Sell'
  return { buy, hold, sell, label, analysts: 20 }
}

export default function Insights({ symbol }: { symbol: string }) {
  const t = getTicker(symbol)
  const c = consensus(symbol)
  const candles = useMemo(() => getCandles(symbol, 'Daily', 60), [symbol])
  const chg = t.price - t.prevClose
  const chgPct = (chg / t.prevClose) * 100

  // Short-sale bars — 30 sessions of short volume with a price line overlay.
  const shortBars = useMemo(() => candles.slice(-30).map((cd) => ({
    short: cd.v * (0.35 + ((cd.t / 8.64e7) % 30) / 60),
    total: cd.v,
    price: cd.c,
  })), [candles])
  const maxVol = Math.max(...shortBars.map((b) => b.total))
  const prices = shortBars.map((b) => b.price)
  const pMax = Math.max(...prices)
  const pMin = Math.min(...prices)

  return (
    <div className="screen insights-screen">
      <section className="card">
        <h3 className="card-title">Consensus Rating</h3>
        <p className="card-sub">Updated 01/09/2026 base on {c.analysts} Analysts</p>
        <div className="consensus-row">
          <div className={`consensus-badge ${c.label.replace(' ', '-').toLowerCase()}`}>
            <span>{c.label}</span>
          </div>
          <div className="consensus-bars">
            <RatingBar label="Buy" pct={c.buy} className="buy" />
            <RatingBar label="Hold" pct={c.hold} className="hold" />
            <RatingBar label="Sell" pct={c.sell} className="sell" />
          </div>
        </div>
      </section>

      <section className="card">
        <h3 className="card-title">Short Sale Analysis</h3>
        <p className="card-sub">Daily Short Volume</p>
        <svg width={340} height={170} className="short-chart">
          {shortBars.map((b, i) => {
            const bw = 340 / shortBars.length
            const x = i * bw
            const totalH = (b.total / maxVol) * 120
            const shortH = (b.short / maxVol) * 120
            return (
              <g key={i}>
                <rect x={x + bw * 0.15} y={140 - totalH} width={bw * 0.7} height={totalH} className="bar-total" />
                <rect x={x + bw * 0.15} y={140 - shortH} width={bw * 0.7} height={shortH} className="bar-short" />
              </g>
            )
          })}
          <polyline
            className="price-line"
            points={shortBars
              .map((b, i) => {
                const bw = 340 / shortBars.length
                const x = i * bw + bw / 2
                const y = 20 + (1 - (b.price - pMin) / (pMax - pMin || 1)) * 110
                return `${x},${y}`
              })
              .join(' ')}
          />
          <text x={2} y={26} className="axis-label">{fmtCompact(maxVol)}</text>
          <text x={2} y={140} className="axis-label">0</text>
          <text x={338} y={26} className="axis-label" textAnchor="end">{fmt(pMax, 1)}</text>
          <text x={338} y={140} className="axis-label" textAnchor="end">{fmt(pMin, 1)}</text>
        </svg>
      </section>

      <section className="card">
        <div className="mini-quote">
          <span className="mini-sym">{symbol}</span>
          <span className={chg >= 0 ? 'mini-price up' : 'mini-price down'}>
            {fmt(t.price, 3)} <small>{chg >= 0 ? '+' : ''}{fmt(chgPct)}%</small>
          </span>
        </div>
        <CandleChart candles={candles} width={340} height={190} />
      </section>
    </div>
  )
}

function RatingBar({ label, pct, className }: { label: string; pct: number; className: string }) {
  return (
    <div className="rating-bar">
      <span className={`rating-label ${className}`}>{label}</span>
      <div className="rating-track">
        <div className={`rating-fill ${className}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="rating-pct">{pct}%</span>
    </div>
  )
}
