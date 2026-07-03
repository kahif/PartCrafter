"""Polymarket access: market discovery (Gamma API), order books and live
order placement (CLOB API).
"""

import json
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

import requests

import config

_session = requests.Session()


def _parse_iso(ts: str) -> float:
    return datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()


@dataclass
class UpDownMarket:
    condition_id: str
    question: str
    slug: str
    start_ts: float
    end_ts: float
    up_token: str
    down_token: str

    @property
    def seconds_left(self) -> float:
        return self.end_ts - time.time()


def find_current_market() -> Optional[UpDownMarket]:
    """Find the currently-open 5-minute up/down market for the underlying.

    The recurring crypto markets are the soonest-ending open markets on the
    platform, so we page through open markets ordered by end date and pick
    the first one whose question matches and whose window length equals
    WINDOW_SECONDS.
    """
    r = _session.get(
        f"{config.GAMMA_HOST}/markets",
        params={
            "closed": "false",
            "active": "true",
            "order": "endDate",
            "ascending": "true",
            "limit": 200,
        },
        timeout=10,
    )
    r.raise_for_status()
    now = time.time()

    for m in r.json():
        question = (m.get("question") or "").lower()
        if config.UNDERLYING not in question or "up or down" not in question:
            continue
        try:
            start_ts = _parse_iso(m["startDate"])
            end_ts = _parse_iso(m["endDate"])
        except (KeyError, ValueError):
            continue
        window = end_ts - start_ts
        # Tolerate small metadata jitter around the nominal window length.
        if abs(window - config.WINDOW_SECONDS) > 30:
            continue
        if not (start_ts <= now < end_ts):
            continue
        if not m.get("acceptingOrders", True):
            continue

        token_ids = m.get("clobTokenIds")
        outcomes = m.get("outcomes")
        if isinstance(token_ids, str):
            token_ids = json.loads(token_ids)
        if isinstance(outcomes, str):
            outcomes = json.loads(outcomes)
        if not token_ids or not outcomes or len(token_ids) != len(outcomes):
            continue
        by_outcome = {o.lower(): t for o, t in zip(outcomes, token_ids)}
        up = by_outcome.get("up") or by_outcome.get("yes")
        down = by_outcome.get("down") or by_outcome.get("no")
        if not up or not down:
            continue

        return UpDownMarket(
            condition_id=m.get("conditionId", ""),
            question=m["question"],
            slug=m.get("slug", ""),
            start_ts=start_ts,
            end_ts=end_ts,
            up_token=up,
            down_token=down,
        )
    return None


def order_book(token_id: str) -> dict:
    """Best bid/ask for a token from the public CLOB book endpoint."""
    r = _session.get(f"{config.CLOB_HOST}/book", params={"token_id": token_id}, timeout=10)
    r.raise_for_status()
    book = r.json()
    bids = [float(b["price"]) for b in book.get("bids", [])]
    asks = [float(a["price"]) for a in book.get("asks", [])]
    return {
        "bid": max(bids) if bids else None,
        "ask": min(asks) if asks else None,
    }


class LiveTrader:
    """Thin wrapper around py-clob-client for real order placement.

    Requires USDC.e on Polygon in the funding wallet and, for a fresh EOA
    wallet, one-time token allowances (see README).
    """

    def __init__(self):
        from py_clob_client.client import ClobClient
        from py_clob_client.clob_types import MarketOrderArgs, OrderType
        from py_clob_client.order_builder.constants import BUY

        self._MarketOrderArgs = MarketOrderArgs
        self._OrderType = OrderType
        self._BUY = BUY

        if not config.POLY_PRIVATE_KEY:
            raise RuntimeError("LIVE=1 requires POLY_PRIVATE_KEY")

        kwargs = {"key": config.POLY_PRIVATE_KEY, "chain_id": config.CHAIN_ID}
        if config.SIGNATURE_TYPE:
            kwargs["signature_type"] = config.SIGNATURE_TYPE
            kwargs["funder"] = config.FUNDER
        self.client = ClobClient(config.CLOB_HOST, **kwargs)
        self.client.set_api_creds(self.client.create_or_derive_api_creds())

    def market_buy(self, token_id: str, usdc_amount: float) -> dict:
        """Fill-or-kill market buy spending `usdc_amount` USDC."""
        args = self._MarketOrderArgs(
            token_id=token_id,
            amount=round(usdc_amount, 2),
            side=self._BUY,
        )
        order = self.client.create_market_order(args)
        return self.client.post_order(order, self._OrderType.FOK)
