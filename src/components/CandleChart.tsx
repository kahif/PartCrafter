import { useMemo } from 'react'
import { sma, type Candle } from '../data/market'

type Props = {
  candles: Candle[]
  width?: number
  height?: number
  showMA?: boolean
  showAxis?: boolean
}

// Lightweight SVG candlestick chart with optional moving-average overlays.
export default function CandleChart({ candles, width = 340, height = 220, showMA = true, showAxis = true }: Props) {
  const pad = { top: 8, right: showAxis ? 36 : 4, bottom: showAxis ? 18 : 4, left: 4 }
  const w = width - pad.left - pad.right
  const h = height - pad.top - pad.bottom

  const { bars, ma5Path, ma20Path, ma30Path, yTicks, xTicks } = useMemo(() => {
    const highs = candles.map((c) => c.h)
    const lows = candles.map((c) => c.l)
    const max = Math.max(...highs)
    const min = Math.min(...lows)
    const range = max - min || 1
    const n = candles.length
    const bw = w / n
    const y = (v: number) => pad.top + (1 - (v - min) / range) * h
    const x = (i: number) => pad.left + i * bw + bw / 2

    const bars = candles.map((c, i) => {
      const up = c.c >= c.o
      return {
        x: x(i),
        bw,
        yHigh: y(c.h),
        yLow: y(c.l),
        yO: y(c.o),
        yC: y(c.c),
        up,
      }
    })

    const toPath = (vals: (number | null)[]) => {
      let d = ''
      vals.forEach((v, i) => {
        if (v == null) return
        d += (d ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1) + ' '
      })
      return d
    }

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
      y: pad.top + f * h,
      label: (max - f * range).toFixed(max > 1000 ? 0 : 1),
    }))
    const xTicks = [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1].map((i) => ({
      x: x(i),
      label: fmtDate(candles[i].t),
    }))

    return {
      bars,
      ma5Path: showMA ? toPath(sma(candles, 5)) : '',
      ma20Path: showMA ? toPath(sma(candles, 20)) : '',
      ma30Path: showMA ? toPath(sma(candles, 30)) : '',
      yTicks,
      xTicks,
    }
  }, [candles, w, h, pad.top, pad.left, showMA])

  return (
    <svg width={width} height={height} className="candle-chart">
      {showAxis &&
        yTicks.map((t, i) => (
          <g key={i}>
            <line x1={pad.left} y1={t.y} x2={pad.left + w} y2={t.y} className="grid-line" />
            <text x={width - 2} y={t.y + 3} className="axis-label" textAnchor="end">
              {t.label}
            </text>
          </g>
        ))}
      {bars.map((b, i) => (
        <g key={i} className={b.up ? 'up' : 'down'}>
          <line x1={b.x} y1={b.yHigh} x2={b.x} y2={b.yLow} className="wick" />
          <rect
            x={b.x - b.bw * 0.32}
            y={Math.min(b.yO, b.yC)}
            width={b.bw * 0.64}
            height={Math.max(1, Math.abs(b.yC - b.yO))}
            className="body"
          />
        </g>
      ))}
      {showMA && (
        <>
          <path d={ma5Path} className="ma ma5" />
          <path d={ma20Path} className="ma ma20" />
          <path d={ma30Path} className="ma ma30" />
        </>
      )}
      {showAxis &&
        xTicks.map((t, i) => (
          <text key={i} x={t.x} y={height - 4} className="axis-label" textAnchor="middle">
            {t.label}
          </text>
        ))}
    </svg>
  )
}

function fmtDate(t: number): string {
  const d = new Date(t)
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]
  return `${m} ${d.getUTCFullYear()}`.replace(String(d.getUTCFullYear()), `'${String(d.getUTCFullYear()).slice(2)}`)
}
