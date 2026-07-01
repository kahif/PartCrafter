import { useEffect, useState } from 'react'
import { getTicker, getLevel2, fmt } from '../data/market'

// Real-time-ish Level 2 order book. Refreshes every 300ms to mirror moomoo's
// "refresh every 0.3s" claim.
export default function Level2({ symbol }: { symbol: string }) {
  const [tick, setTick] = useState(0)
  const t = getTicker(symbol)

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 300)
    return () => clearInterval(id)
  }, [])

  const book = getLevel2(symbol, tick)
  const chg = t.price - t.prevClose
  const chgPct = (chg / t.prevClose) * 100
  const bidPct = Math.round(book.ratio * 100)

  const maxSize = Math.max(...book.bids.map((b) => b.size), ...book.asks.map((a) => a.size))

  // cumulative depth for the order-book area chart
  const depth = (() => {
    let cb = 0
    const bidCum = [...book.bids].map((b) => ({ price: b.price, cum: (cb += b.size) }))
    let ca = 0
    const askCum = [...book.asks].map((a) => ({ price: a.price, cum: (ca += a.size) }))
    return { bidCum: bidCum.reverse(), askCum, max: Math.max(cb, ca) }
  })()

  return (
    <div className="screen l2-screen">
      <div className="l2-head">
        <div className="l2-topline">
          <div>
            <div className="l2-sym">{symbol}</div>
            <div className={chg >= 0 ? 'l2-price up' : 'l2-price down'}>{fmt(t.price, 3)}</div>
            <div className={chg >= 0 ? 'l2-chg up' : 'l2-chg down'}>
              {chg >= 0 ? '+' : ''}
              {fmt(chg, 3)} &nbsp; {chg >= 0 ? '+' : ''}
              {fmt(chgPct)}%
            </div>
          </div>
          <div className="l2-stats">
            <Row k="High" v={fmt(t.dayHigh, 3)} />
            <Row k="Low" v={fmt(t.dayLow, 3)} />
            <Row k="Vol" v={(t.volume / 1e6).toFixed(2) + 'M'} />
          </div>
        </div>
        <div className="l2-tabs">
          <span className="l2-tab active">Chart</span>
          <span className="l2-tab">Options</span>
          <span className="l2-tab">News</span>
          <span className="l2-tab">Company</span>
          <div className="badge-orange l2-badge">
            <b>60</b>
            <span>Quotes</span>
          </div>
        </div>
      </div>

      <div className="bid-ratio">
        <div className="bid-ratio-label">
          Bid <b>{bidPct}%</b>
        </div>
        <div className="bid-ratio-track">
          <div className="bid-ratio-fill" style={{ width: `${bidPct}%` }} />
          <div className="ask-ratio-fill" style={{ width: `${100 - bidPct}%` }} />
        </div>
      </div>

      <div className="l2-refresh">Order Book · refresh every 0.3s</div>

      <svg width={340} height={90} className="depth-chart">
        <polyline
          className="depth-bid"
          points={depth.bidCum.map((d, i) => `${(i / (depth.bidCum.length - 1)) * 165},${80 - (d.cum / depth.max) * 70}`).join(' ')}
        />
        <polyline
          className="depth-ask"
          points={depth.askCum.map((d, i) => `${175 + (i / (depth.askCum.length - 1)) * 165},${80 - (d.cum / depth.max) * 70}`).join(' ')}
        />
      </svg>

      <div className="l2-ladder">
        <div className="ladder-col bids">
          {book.bids.map((b, i) => (
            <div key={i} className="ladder-row bid">
              <div className="ladder-bg bid" style={{ width: `${(b.size / maxSize) * 100}%` }} />
              <span className="mm">{b.mm}</span>
              <span className="lp up">{fmt(b.price, b.price > 100 ? 2 : 3)}</span>
              <span className="sz">{b.size}</span>
            </div>
          ))}
        </div>
        <div className="ladder-col asks">
          {book.asks.map((a, i) => (
            <div key={i} className="ladder-row ask">
              <div className="ladder-bg ask" style={{ width: `${(a.size / maxSize) * 100}%` }} />
              <span className="mm">{a.mm}</span>
              <span className="lp down">{fmt(a.price, a.price > 100 ? 2 : 3)}</span>
              <span className="sz">{a.size}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="stat-row">
      <span className="stat-k">{k}</span>
      <span className="stat-v">{v}</span>
    </div>
  )
}
