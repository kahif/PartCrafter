"""Fair-value model and trade decision for 5-minute up/down markets.

Model: over the remaining seconds of the window, the log price is treated as
driftless Brownian motion with volatility estimated from recent 1-minute
returns. The market resolves UP if the final price is above the window open,
so

    P(up) = Phi( ln(spot / open) / (sigma * sqrt(seconds_left)) )

Early in the window (spot ~ open, lots of time left) this sits near 0.5; as
the window ages, a move away from the open becomes harder to undo and the
probability polarises. The bot buys the side whose model probability exceeds
what the order book charges for it by MIN_EDGE.
"""

import math
from dataclasses import dataclass
from typing import Optional

import config


def norm_cdf(x: float) -> float:
    return 0.5 * math.erfc(-x / math.sqrt(2.0))


def fair_up_probability(
    spot: float,
    window_open: float,
    sigma_per_sqrt_sec: float,
    seconds_left: float,
) -> float:
    if seconds_left <= 0:
        return 1.0 if spot > window_open else 0.0
    if spot <= 0 or window_open <= 0:
        return 0.5
    denom = sigma_per_sqrt_sec * math.sqrt(seconds_left)
    if denom < 1e-12:
        return 1.0 if spot > window_open else 0.0
    return norm_cdf(math.log(spot / window_open) / denom)


@dataclass
class Signal:
    side: str          # "UP" or "DOWN"
    token_id: str
    price: float       # ask we would pay per share
    fair: float        # model probability of this side winning
    edge: float        # fair - price


def decide(
    fair_up: float,
    up_book: dict,
    down_book: dict,
    up_token: str,
    down_token: str,
    seconds_left: float,
) -> Optional[Signal]:
    """Return a Signal if either side offers enough edge, else None."""
    if not (config.MIN_SECONDS_LEFT <= seconds_left <= config.MAX_SECONDS_LEFT):
        return None

    candidates = []
    for side, book, token, fair in (
        ("UP", up_book, up_token, fair_up),
        ("DOWN", down_book, down_token, 1.0 - fair_up),
    ):
        ask, bid = book.get("ask"), book.get("bid")
        if ask is None or bid is None:
            continue
        if ask - bid > config.MAX_SPREAD or ask > config.MAX_PRICE:
            continue
        edge = fair - ask
        if edge >= config.MIN_EDGE:
            candidates.append(Signal(side, token, ask, fair, edge))

    if not candidates:
        return None
    return max(candidates, key=lambda s: s.edge)
