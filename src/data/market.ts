// Simulated market-data engine. No network, no API keys — everything is
// generated deterministically-ish with a seeded PRNG so the app feels alive
// but stays reproducible across reloads.

export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number }

export type Ticker = {
  symbol: string
  name: string
  exchange: string
  price: number
  prevClose: number
  dayHigh: number
  dayLow: number
  volume: number
}

export type Level2Row = { mm: string; price: number; size: number }

// --- tiny seeded PRNG (mulberry32) -----------------------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFromString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// --- seed universe ----------------------------------------------------------
const SEED: Record<string, Omit<Ticker, 'dayHigh' | 'dayLow' | 'volume'>> = {
  NVDA: { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', price: 170.29, prevClose: 165.7 },
  TSLA: { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ', price: 253.5, prevClose: 251.05 },
  AAPL: { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', price: 227.48, prevClose: 229.1 },
  MSFT: { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', price: 431.2, prevClose: 428.4 },
  AMD: { symbol: 'AMD', name: 'Advanced Micro Devices', exchange: 'NASDAQ', price: 158.9, prevClose: 161.3 },
  SHOP: { symbol: 'SHOP', name: 'Shopify Inc.', exchange: 'NYSE', price: 112.4, prevClose: 110.2 },
  RY: { symbol: 'RY', name: 'Royal Bank of Canada', exchange: 'TSX', price: 176.55, prevClose: 175.9 },
  AMZN: { symbol: 'AMZN', name: 'Amazon.com, Inc.', exchange: 'NASDAQ', price: 201.7, prevClose: 199.8 },
}

export const SYMBOLS = Object.keys(SEED)

export function getTicker(symbol: string): Ticker {
  const base = SEED[symbol] ?? SEED.NVDA
  const rnd = mulberry32(seedFromString(symbol + 'day'))
  const spread = base.price * 0.03
  const dayHigh = base.price + rnd() * spread
  const dayLow = base.price - rnd() * spread
  const volume = Math.floor((10 + rnd() * 90) * 1e6)
  return { ...base, dayHigh, dayLow, volume }
}

export type Timeframe = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly'

// Generate an OHLC series ending near the current price with a believable trend.
export function getCandles(symbol: string, timeframe: Timeframe = 'Daily', count = 90): Candle[] {
  const base = SEED[symbol] ?? SEED.NVDA
  const rnd = mulberry32(seedFromString(symbol + timeframe))
  const stepMs =
    timeframe === 'Daily' ? 864e5 : timeframe === 'Weekly' ? 7 * 864e5 : timeframe === 'Monthly' ? 30 * 864e5 : 90 * 864e5

  // Walk backwards from current price, then reverse — keeps the last close
  // anchored to the live quote.
  const vol = base.price * 0.02
  let price = base.price
  const candles: Candle[] = []
  const now = 1_756_000_000_000 // fixed "now" so charts are stable across reloads
  for (let i = 0; i < count; i++) {
    const t = now - i * stepMs
    const drift = (rnd() - 0.48) * vol * 1.6
    const c = price
    const o = c - drift
    const h = Math.max(o, c) + rnd() * vol * 0.6
    const l = Math.min(o, c) - rnd() * vol * 0.6
    const v = Math.floor((5 + rnd() * 12) * 1e6)
    candles.push({ t, o, h, l, c, v })
    price = o - (rnd() - 0.5) * vol * 0.4
    if (price < base.price * 0.4) price = base.price * 0.4
  }
  return candles.reverse()
}

// Simple moving average helper for chart overlays.
export function sma(candles: Candle[], period: number): (number | null)[] {
  const out: (number | null)[] = []
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      out.push(null)
      continue
    }
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].c
    out.push(sum / period)
  }
  return out
}

// A live Level-2 order book. `tick` advances the simulation so callers can
// re-request every ~0.3s and see it move.
export function getLevel2(symbol: string, tick: number): { bids: Level2Row[]; asks: Level2Row[]; ratio: number } {
  const t = getTicker(symbol)
  const rnd = mulberry32(seedFromString(symbol) ^ (tick * 2654435761))
  const mms = ['ARCA', 'NSDQ', 'BATS', 'EDGX', 'IEX', 'MEMX']
  const tickSize = t.price > 100 ? 0.01 : 0.005
  const mid = t.price + (rnd() - 0.5) * tickSize * 4

  const bids: Level2Row[] = []
  const asks: Level2Row[] = []
  for (let i = 0; i < 12; i++) {
    const bp = +(mid - tickSize * (i + 1) - rnd() * tickSize).toFixed(3)
    const ap = +(mid + tickSize * (i + 1) + rnd() * tickSize).toFixed(3)
    bids.push({ mm: mms[Math.floor(rnd() * mms.length)], price: bp, size: 1 + Math.floor(rnd() * 250) })
    asks.push({ mm: mms[Math.floor(rnd() * mms.length)], price: ap, size: 1 + Math.floor(rnd() * 250) })
  }
  const bidVol = bids.reduce((s, r) => s + r.size, 0)
  const askVol = asks.reduce((s, r) => s + r.size, 0)
  const ratio = bidVol / (bidVol + askVol)
  return { bids, asks, ratio }
}

export function fmt(n: number, d = 2): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
}

export function fmtCompact(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}
