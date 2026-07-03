"""Position tracking, paper settlement, risk limits, and trade logging."""

import json
import os
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import List

import config


@dataclass
class Position:
    market_slug: str
    condition_id: str
    side: str            # "UP" / "DOWN"
    token_id: str
    shares: float
    cost_usdc: float
    entry_price: float
    fair_at_entry: float
    window_open_price: float
    end_ts: float
    opened_at: float = field(default_factory=time.time)
    settled: bool = False
    won: bool = False
    pnl: float = 0.0


class Portfolio:
    def __init__(self):
        self.balance = config.PAPER_START_BALANCE
        self.positions: List[Position] = []
        self.daily_pnl = 0.0
        self.day = self._today()
        self._load()

    # -- persistence ----------------------------------------------------
    def _load(self):
        if not os.path.exists(config.STATE_FILE):
            return
        with open(config.STATE_FILE) as f:
            state = json.load(f)
        self.balance = state.get("balance", self.balance)
        self.daily_pnl = state.get("daily_pnl", 0.0)
        self.day = state.get("day", self.day)
        self.positions = [Position(**p) for p in state.get("positions", [])]

    def save(self):
        state = {
            "balance": self.balance,
            "daily_pnl": self.daily_pnl,
            "day": self.day,
            "positions": [asdict(p) for p in self.positions if not p.settled],
        }
        tmp = config.STATE_FILE + ".tmp"
        with open(tmp, "w") as f:
            json.dump(state, f, indent=2)
        os.replace(tmp, config.STATE_FILE)

    def _log(self, event: str, **payload):
        payload.update(event=event, ts=datetime.now(timezone.utc).isoformat())
        with open(config.TRADE_LOG, "a") as f:
            f.write(json.dumps(payload) + "\n")

    # -- risk gates -------------------------------------------------------
    def _today(self) -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    def _roll_day(self):
        today = self._today()
        if today != self.day:
            self.day = today
            self.daily_pnl = 0.0

    def can_open(self, condition_id: str) -> bool:
        self._roll_day()
        if self.daily_pnl <= -config.MAX_DAILY_LOSS_USDC:
            return False
        open_positions = [p for p in self.positions if not p.settled]
        if len(open_positions) >= config.MAX_OPEN_POSITIONS:
            return False
        in_market = [p for p in open_positions if p.condition_id == condition_id]
        if len(in_market) >= config.MAX_POSITIONS_PER_MARKET:
            return False
        if not config.LIVE and self.balance < config.STAKE_USDC:
            return False
        return True

    # -- lifecycle --------------------------------------------------------
    def open(self, position: Position):
        self.positions.append(position)
        if not config.LIVE:
            self.balance -= position.cost_usdc
        self._log(
            "open",
            live=config.LIVE,
            market=position.market_slug,
            side=position.side,
            price=position.entry_price,
            shares=position.shares,
            cost=position.cost_usdc,
            fair=position.fair_at_entry,
        )
        self.save()

    def settle_expired(self, final_price_fn):
        """Settle paper positions whose window has ended.

        `final_price_fn(end_ts)` must return the underlying price at window
        close. In live mode Polymarket settles on-chain; here we only mark
        the position and record model PnL for reporting.
        """
        now = time.time()
        for p in self.positions:
            if p.settled or now < p.end_ts + 5:  # small grace for the close print
                continue
            try:
                final = final_price_fn(p.end_ts)
            except Exception:
                continue  # retry next tick
            up_won = final > p.window_open_price
            p.won = (p.side == "UP") == up_won
            payout = p.shares if p.won else 0.0
            p.pnl = payout - p.cost_usdc
            p.settled = True
            if not config.LIVE:
                self.balance += payout
            self.daily_pnl += p.pnl
            self._log(
                "settle",
                live=config.LIVE,
                market=p.market_slug,
                side=p.side,
                won=p.won,
                pnl=round(p.pnl, 4),
                balance=round(self.balance, 2),
                open_price=p.window_open_price,
                final_price=final,
            )
        self.positions = [p for p in self.positions if not p.settled]
        self.save()

    def summary(self) -> str:
        open_n = len([p for p in self.positions if not p.settled])
        return (
            f"balance={self.balance:.2f} daily_pnl={self.daily_pnl:+.2f} "
            f"open_positions={open_n}"
        )
