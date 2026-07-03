"""Polymarket BTC 5-minute up/down trading bot.

Run `python bot.py` for paper trading (default) or set LIVE=1 in .env for
real orders. See README.md — especially the risk section — before going live.
"""

import logging
import time

import requests

import config
import feeds
import polymarket
import strategy
from portfolio import Portfolio, Position

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("bot")

_binance = requests.Session()


def final_price_at(end_ts: float) -> float:
    """Close of the 5m candle that ends at end_ts (used to settle paper trades)."""
    start_ms = int((end_ts - config.WINDOW_SECONDS) * 1000)
    r = _binance.get(
        f"{config.BINANCE_HOST}/api/v3/klines",
        params={
            "symbol": config.BINANCE_SYMBOL,
            "interval": "5m",
            "startTime": start_ms,
            "limit": 1,
        },
        timeout=5,
    )
    r.raise_for_status()
    candles = r.json()
    if not candles or candles[0][6] > time.time() * 1000:
        raise RuntimeError("window candle not closed yet")
    return float(candles[0][4])


def main():
    mode = "LIVE" if config.LIVE else "PAPER"
    log.info("starting in %s mode | stake=%.2f USDC | min_edge=%.2f",
             mode, config.STAKE_USDC, config.MIN_EDGE)
    if config.LIVE:
        log.warning("LIVE trading enabled — real money at risk")
        trader = polymarket.LiveTrader()
    else:
        trader = None

    portfolio = Portfolio()
    vol = feeds.VolatilityEstimator()
    market_ref = [None]  # current market, carried across ticks

    while True:
        try:
            tick(portfolio, vol, trader, market_ref)
        except KeyboardInterrupt:
            log.info("stopped by user | %s", portfolio.summary())
            return
        except Exception as e:
            log.warning("tick failed: %s", e)
        time.sleep(config.POLL_SECONDS)


def tick(portfolio: Portfolio, vol: feeds.VolatilityEstimator, trader, market_ref):
    # settle anything whose window ended
    portfolio.settle_expired(final_price_at)

    # refresh the active market when the old window closes
    market = market_ref[0]
    if market is None or market.seconds_left <= 0:
        market = polymarket.find_current_market()
        market_ref[0] = market
        if market is None:
            log.info("no open %ss %s up/down market found; retrying",
                     config.WINDOW_SECONDS, config.UNDERLYING)
            return
        log.info("market: %s (ends in %.0fs)", market.question, market.seconds_left)

    seconds_left = market.seconds_left
    if seconds_left <= 0:
        return

    spot = feeds.spot_price()
    window_open = feeds.window_open_price(int(market.start_ts * 1000))
    fair_up = strategy.fair_up_probability(
        spot, window_open, vol.sigma_per_sqrt_sec(), seconds_left
    )

    up_book = polymarket.order_book(market.up_token)
    down_book = polymarket.order_book(market.down_token)

    log.info(
        "t-%3.0fs spot=%.2f open=%.2f fair_up=%.3f | UP %s/%s DOWN %s/%s | %s",
        seconds_left, spot, window_open, fair_up,
        up_book["bid"], up_book["ask"], down_book["bid"], down_book["ask"],
        portfolio.summary(),
    )

    signal = strategy.decide(
        fair_up, up_book, down_book, market.up_token, market.down_token, seconds_left
    )
    if signal is None or not portfolio.can_open(market.condition_id):
        return

    shares = config.STAKE_USDC / signal.price
    if config.LIVE:
        resp = trader.market_buy(signal.token_id, config.STAKE_USDC)
        log.info("LIVE order response: %s", resp)
        if not resp.get("success", False):
            return
    log.info(
        "BUY %s @ %.3f (fair=%.3f edge=%.3f) shares=%.2f cost=%.2f",
        signal.side, signal.price, signal.fair, signal.edge, shares, config.STAKE_USDC,
    )
    portfolio.open(Position(
        market_slug=market.slug,
        condition_id=market.condition_id,
        side=signal.side,
        token_id=signal.token_id,
        shares=shares,
        cost_usdc=config.STAKE_USDC,
        entry_price=signal.price,
        fair_at_entry=signal.fair,
        window_open_price=window_open,
        end_ts=market.end_ts,
    ))


if __name__ == "__main__":
    main()
