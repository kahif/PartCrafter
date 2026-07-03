"""BTC price and volatility feed (Binance public REST).

Note on resolution source: Polymarket's 5-minute crypto markets resolve on a
Chainlink price feed, not Binance. The two track each other to within a few
dollars, which is far smaller than the edge threshold the strategy demands,
but it means a coin-flip window (final price within ~$5 of the open) can
resolve against the Binance-based view. The strategy's MIN_EDGE and MAX_PRICE
guards exist partly to keep the bot out of those knife-edge situations.
"""

import math
import statistics
import time

import requests

import config

_session = requests.Session()


def spot_price() -> float:
    """Latest BTC trade price."""
    r = _session.get(
        f"{config.BINANCE_HOST}/api/v3/ticker/price",
        params={"symbol": config.BINANCE_SYMBOL},
        timeout=5,
    )
    r.raise_for_status()
    return float(r.json()["price"])


def window_open_price(window_start_ms: int) -> float:
    """Price at the start of the current 5-minute window.

    Polymarket's 5-minute windows are aligned to clock 5-minute boundaries,
    which are exactly Binance 5m candle boundaries, so the candle open is the
    price at window start.
    """
    r = _session.get(
        f"{config.BINANCE_HOST}/api/v3/klines",
        params={
            "symbol": config.BINANCE_SYMBOL,
            "interval": "5m",
            "startTime": window_start_ms,
            "limit": 1,
        },
        timeout=5,
    )
    r.raise_for_status()
    candles = r.json()
    if not candles:
        raise RuntimeError("no candle returned for current window")
    return float(candles[0][1])  # open


class VolatilityEstimator:
    """Rolling estimate of short-horizon volatility from 1-minute candles.

    Returns sigma per sqrt(second) of log price, refreshed at most every
    VOL_REFRESH_SECONDS.
    """

    def __init__(self):
        self._sigma_per_sqrt_sec = None
        self._fetched_at = 0.0

    def sigma_per_sqrt_sec(self) -> float:
        now = time.time()
        if self._sigma_per_sqrt_sec is None or now - self._fetched_at > config.VOL_REFRESH_SECONDS:
            self._refresh()
            self._fetched_at = now
        return self._sigma_per_sqrt_sec

    def _refresh(self):
        r = _session.get(
            f"{config.BINANCE_HOST}/api/v3/klines",
            params={"symbol": config.BINANCE_SYMBOL, "interval": "1m", "limit": 90},
            timeout=5,
        )
        r.raise_for_status()
        closes = [float(c[4]) for c in r.json()]
        rets = [math.log(b / a) for a, b in zip(closes, closes[1:]) if a > 0]
        sigma_1m = statistics.pstdev(rets) if len(rets) >= 20 else 0.0
        sigma_1m = max(sigma_1m, config.MIN_SIGMA_1M)
        self._sigma_per_sqrt_sec = sigma_1m / math.sqrt(60.0)
