// A small canned "AI broker" that answers questions about a symbol. It's a
// template engine over the simulated market data — no LLM calls. Swap this
// module for a real API client to make the chat live.

import { getTicker, getCandles, sma, fmt, type Candle } from './market'

export type Brief = {
  summary: string
  keyEvents: { text: string; sources: number }[]
  tradingData: string
}

const EVENTS: Record<string, { text: string; sources: number }[]> = {
  NVDA: [
    { text: 'NVIDIA Under Antitrust Investigation in China Over Mellanox Acquisition', sources: 3 },
    { text: "NVDA's China-Specific RTX6000D AI Chip Faces Weak Demand", sources: 3 },
    { text: 'NVIDIA Signs $6.3 Billion Computing Power Agreement with CoreWeave', sources: 2 },
    { text: 'NVIDIA Launches Rubin CPX Chip for AI Inference', sources: 1 },
  ],
  TSLA: [
    { text: 'Tesla Robotaxi Expansion Approved in Two New Metro Areas', sources: 3 },
    { text: 'Q3 Deliveries Beat Consensus on Strong Model Y Refresh Demand', sources: 2 },
    { text: 'Energy Storage Deployments Hit Record 9.4 GWh', sources: 2 },
    { text: 'NHTSA Opens Preliminary Review of FSD Winter Performance', sources: 1 },
  ],
}

function genericEvents(sym: string): { text: string; sources: number }[] {
  return [
    { text: `${sym} Reports Quarterly Results Above Street Estimates`, sources: 3 },
    { text: `Analysts Raise ${sym} Price Targets After Guidance Update`, sources: 2 },
    { text: `${sym} Announces New Buyback Authorization`, sources: 2 },
    { text: `Sector Rotation Drives Elevated ${sym} Options Volume`, sources: 1 },
  ]
}

function trend(candles: Candle[]): { dir: 'upward' | 'downward' | 'sideways'; ma5: number; ma20: number; ma30: number } {
  const last = candles[candles.length - 1].c
  const ma5 = sma(candles, 5).at(-1) ?? last
  const ma20 = sma(candles, 20).at(-1) ?? last
  const ma30 = sma(candles, 30).at(-1) ?? last
  let dir: 'upward' | 'downward' | 'sideways' = 'sideways'
  if (last < ma5! && last < ma20! && last < ma30!) dir = 'downward'
  else if (last > ma5! && last > ma20! && last > ma30!) dir = 'upward'
  return { dir, ma5: ma5!, ma20: ma20!, ma30: ma30! }
}

export function getBrief(symbol: string, period: 'Daily' | 'Weekly'): Brief {
  const t = getTicker(symbol)
  const candles = getCandles(symbol, period === 'Daily' ? 'Daily' : 'Weekly')
  const { dir } = trend(candles)
  const bandSide = dir === 'downward' ? 'below the middle band' : dir === 'upward' ? 'above the middle band' : 'near the middle band'

  return {
    summary: `${t.name} (${t.symbol}.US) has demonstrated ${
      t.price >= t.prevClose ? 'robust' : 'mixed'
    } financial and operational performance in the latest ${period.toLowerCase()} window, with price action reflecting shifting sentiment across AI, macro rates, and sector positioning ······`,
    keyEvents: EVENTS[symbol] ?? genericEvents(symbol),
    tradingData: `The Bollinger Bands show the price breaking ${bandSide}, while the price has ${
      dir === 'downward' ? 'fallen below' : dir === 'upward' ? 'risen above' : 'converged around'
    } multiple moving averages including MA5, MA20, and MA30, indicating a developing ${dir} trend.`,
  }
}

// Answer a free-form question. Very small intent router over templates.
export function ask(symbol: string, q: string): string {
  const t = getTicker(symbol)
  const candles = getCandles(symbol, 'Daily')
  const { dir, ma5, ma20 } = trend(candles)
  const chg = t.price - t.prevClose
  const chgPct = (chg / t.prevClose) * 100
  const ql = q.toLowerCase()

  if (/buy|sell|should i|invest/.test(ql)) {
    return `I can't give personalized investment advice, but here's the picture for ${t.symbol}: it's trading at $${fmt(
      t.price,
    )} (${chgPct >= 0 ? '+' : ''}${fmt(chgPct)}%), in a ${dir} short-term trend with MA5 at $${fmt(ma5)} and MA20 at $${fmt(
      ma20,
    )}. Consensus analyst rating is constructive. Always size positions to your own risk tolerance.`
  }
  if (/dividend|yield/.test(ql)) {
    return `${t.name} returns capital primarily through ${symbol === 'NVDA' ? 'buybacks and a small dividend' : 'dividends and buybacks'}. On simulated data the indicated yield is modest; check the Company tab for the exact figure.`
  }
  if (/target|analyst|rating/.test(ql)) {
    return `Street coverage on ${t.symbol} skews bullish — the consensus is a "Strong Buy" with roughly 85% Buy ratings. The target-price range clusters above the current $${fmt(
      t.price,
    )} print. See One-Screen Insights for the full breakdown.`
  }
  if (/performance|how.*doing|perform|trend/.test(ql)) {
    return `${t.name} (${t.symbol}.US) is at $${fmt(t.price)}, ${chgPct >= 0 ? 'up' : 'down'} ${fmt(
      Math.abs(chgPct),
    )}% today. Momentum is ${dir}: price is ${
      dir === 'downward' ? 'under' : dir === 'upward' ? 'over' : 'around'
    } MA5 ($${fmt(ma5)}) and MA20 ($${fmt(ma20)}). Day range $${fmt(t.dayLow)}–$${fmt(t.dayHigh)}.`
  }
  return `Here's a quick read on ${t.symbol}: $${fmt(t.price)} (${chgPct >= 0 ? '+' : ''}${fmt(
    chgPct,
  )}% today), ${dir} trend, day range $${fmt(t.dayLow)}–$${fmt(t.dayHigh)}. Ask me about performance, analyst ratings, or the daily brief for more.`
}

export const SUGGESTIONS = ["NVDA's performance", 'Analyst ratings', 'Explain the daily brief', 'Is it above MA20?']
