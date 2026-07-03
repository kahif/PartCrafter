"""Configuration for the Polymarket BTC 5-minute up/down bot.

Every setting can be overridden with an environment variable (a `.env` file
in this directory is loaded automatically). See `.env.example`.
"""

import os

from dotenv import load_dotenv

load_dotenv()


def _f(name: str, default: float) -> float:
    return float(os.getenv(name, default))


def _i(name: str, default: int) -> int:
    return int(os.getenv(name, default))


def _b(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


# --- Mode -------------------------------------------------------------
# Paper trading is the default. Set LIVE=1 only after you have run the bot
# in paper mode, understand the strategy, and accept that you can lose
# everything you stake.
LIVE = _b("LIVE", False)

# --- Market selection --------------------------------------------------
# Polymarket recurring crypto series. The bot discovers the currently open
# 5-minute window automatically via the Gamma API.
UNDERLYING = os.getenv("UNDERLYING", "bitcoin")      # matched in the market question
WINDOW_SECONDS = _i("WINDOW_SECONDS", 300)            # 5-minute markets
BINANCE_SYMBOL = os.getenv("BINANCE_SYMBOL", "BTCUSDT")

GAMMA_HOST = os.getenv("GAMMA_HOST", "https://gamma-api.polymarket.com")
CLOB_HOST = os.getenv("CLOB_HOST", "https://clob.polymarket.com")
BINANCE_HOST = os.getenv("BINANCE_HOST", "https://api.binance.com")

# --- Strategy ----------------------------------------------------------
# Buy a side when our model's probability exceeds the market's ask price
# by at least MIN_EDGE (in probability points, 0.05 = 5 cents per share).
MIN_EDGE = _f("MIN_EDGE", 0.06)
# Ignore books whose bid/ask spread is wider than this.
MAX_SPREAD = _f("MAX_SPREAD", 0.10)
# Never pay more than this per share (avoids buying near-certainties where
# fees/slippage eat the payoff).
MAX_PRICE = _f("MAX_PRICE", 0.90)
# Only trade inside this window of remaining seconds. Too early -> the model
# has no information; too late -> you can't get filled before resolution.
MIN_SECONDS_LEFT = _i("MIN_SECONDS_LEFT", 20)
MAX_SECONDS_LEFT = _i("MAX_SECONDS_LEFT", 240)
# Floor for the volatility estimate (per-minute log-return std). Protects the
# model from dividing by ~0 in dead-quiet minutes.
MIN_SIGMA_1M = _f("MIN_SIGMA_1M", 0.0003)

# --- Risk --------------------------------------------------------------
STAKE_USDC = _f("STAKE_USDC", 5.0)          # spent per trade
MAX_POSITIONS_PER_MARKET = _i("MAX_POSITIONS_PER_MARKET", 1)
MAX_OPEN_POSITIONS = _i("MAX_OPEN_POSITIONS", 3)
MAX_DAILY_LOSS_USDC = _f("MAX_DAILY_LOSS_USDC", 25.0)   # stop trading for the day
PAPER_START_BALANCE = _f("PAPER_START_BALANCE", 200.0)

# --- Timing ------------------------------------------------------------
POLL_SECONDS = _f("POLL_SECONDS", 2.0)
VOL_REFRESH_SECONDS = _i("VOL_REFRESH_SECONDS", 60)

# --- Live-trading credentials (only needed when LIVE=1) ----------------
# Private key of the wallet that signs orders. NEVER commit this.
POLY_PRIVATE_KEY = os.getenv("POLY_PRIVATE_KEY", "")
# 0 = plain EOA wallet, 1 = Polymarket email/Magic login, 2 = browser-wallet
# proxy. If you log into polymarket.com with email, use 1 and set FUNDER to
# the deposit address shown in your Polymarket profile.
SIGNATURE_TYPE = _i("SIGNATURE_TYPE", 0)
FUNDER = os.getenv("FUNDER", "")
CHAIN_ID = 137  # Polygon

# --- Files -------------------------------------------------------------
STATE_FILE = os.getenv("STATE_FILE", "state.json")
TRADE_LOG = os.getenv("TRADE_LOG", "trades.jsonl")
