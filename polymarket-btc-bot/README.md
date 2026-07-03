# Polymarket BTC 5-Minute Up/Down Bot

A trading bot for Polymarket's recurring **"Bitcoin Up or Down"** 5-minute
markets. Every 5 minutes Polymarket opens a binary market: **Up** pays $1 per
share if BTC finishes the window above its opening price, **Down** pays $1 if
it doesn't. This bot:

1. **Discovers** the currently open 5-minute window via Polymarket's Gamma API.
2. **Models** the probability that BTC finishes up, using the live Binance
   price, the window's opening price, and volatility estimated from recent
   1-minute candles (driftless Brownian-motion model).
3. **Compares** that probability to what the order book charges for Up and
   Down shares, and **buys** whichever side is underpriced by at least
   `MIN_EDGE` (default 6¢ per share).
4. **Holds to resolution** and tracks P&L, with risk limits (per-trade stake,
   max open positions, daily loss stop).

It runs in **paper-trading mode by default** — no wallet, no money, it just
simulates fills at the real order-book ask and settles against the real
price. Live mode uses the official Polymarket CLOB API via `py-clob-client`.

## ⚠️ Read this before anything else

- **This is not a money printer.** The viral "$1 → $400,000" stories are
  marketing/engagement bait. 5-minute up/down markets are close to coin
  flips, the order books are competitive (other bots trade them), and every
  trade pays the spread. **Expect to lose money**; treat live mode as
  gambling with strict limits.
- The model's edge signal fires when the market's price lags a fast BTC move.
  Whether that edge is real after spread and adverse selection is exactly
  what paper mode is for — **run paper mode for at least several days** and
  only consider live trading if the paper P&L is convincingly positive over
  hundreds of trades.
- Polymarket resolves these markets on a **Chainlink** price feed while the
  bot models with **Binance** prices. They track closely, but knife-edge
  windows can settle "wrong" relative to the bot's view.
- Live mode signs orders with your **private key**. Use a dedicated wallet
  funded with only what you can afford to lose. Never share or commit `.env`.
- Check that automated trading on Polymarket is legal where you live
  (e.g. US access is restricted).

## Setup

```bash
cd polymarket-btc-bot
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # tweak settings if you like
python bot.py               # starts in paper mode
```

You'll see a status line every couple of seconds:

```
14:32:07 INFO t-143s spot=78041.20 open=78012.55 fair_up=0.741 | UP 0.66/0.69 DOWN 0.31/0.34 | balance=200.00 daily_pnl=+0.00 open_positions=0
14:32:09 INFO BUY UP @ 0.690 (fair=0.744 edge=0.054) shares=7.25 cost=5.00
```

Trades and settlements are appended to `trades.jsonl`; open positions and
balance persist in `state.json` across restarts.

## Going live (only after profitable paper results)

1. Create a dedicated wallet, deposit a small amount of **USDC.e on Polygon**
   into Polymarket, and make at least one manual trade on polymarket.com
   first (this sets up the account and token allowances).
2. In `.env` set:
   - `LIVE=1`
   - `POLY_PRIVATE_KEY=0x...` — the key that controls the account.
     If you log into Polymarket with **email**, export the key from
     Settings and set `SIGNATURE_TYPE=1` plus `FUNDER=<your deposit
     address>`. For a plain wallet you trade from directly, use
     `SIGNATURE_TYPE=0` and leave `FUNDER` empty.
3. Keep `STAKE_USDC` and `MAX_DAILY_LOSS_USDC` small.
4. `python bot.py` — live orders are fill-or-kill market buys, so the bot
   never leaves resting orders behind.

## How the strategy works

For remaining time τ in the window, with spot `S`, window open `S₀`, and
volatility `σ` (per √second, from the last ~90 one-minute returns):

```
P(up) = Φ( ln(S / S₀) / (σ·√τ) )
```

Early in a window this is ~0.5; once BTC has moved, the probability
polarises as time runs out. The bot buys Up when `P(up) − ask(Up) ≥ MIN_EDGE`
(and symmetrically for Down), skipping wide-spread books, prices above
`MAX_PRICE`, and the first/last seconds of the window
(`MAX_SECONDS_LEFT` / `MIN_SECONDS_LEFT`).

## Files

| File | Purpose |
|---|---|
| `bot.py` | main loop: discover market → price model → trade → settle |
| `strategy.py` | fair-value model and trade decision |
| `feeds.py` | Binance spot price, window open price, volatility estimate |
| `polymarket.py` | Gamma market discovery, CLOB order books, live orders |
| `portfolio.py` | positions, paper settlement, risk limits, trade log |
| `config.py` | all tunables (env-overridable) |

## Tuning ideas

- Raise `MIN_EDGE` to trade less but with more conviction.
- Lower `MAX_SECONDS_LEFT` to only trade the back half of windows, where the
  model is most informative.
- Add early exit (sell when the book converges to fair) instead of holding
  to resolution — reduces variance, adds spread cost.
- Swap the Binance feed for the Chainlink stream Polymarket settles on to
  remove settlement-source mismatch.
