"""Offline sanity tests for the strategy model and paper portfolio.

Run with: python test_bot.py  (no network required)
"""

import os
import time

import config
import portfolio
from strategy import decide, fair_up_probability


def test_fair_value_model():
    sig = 0.0008 / 60 ** 0.5  # calm-market BTC vol, per sqrt(second)

    # at the window open the market is a coin flip
    assert abs(fair_up_probability(78000, 78000, sig, 300) - 0.5) < 1e-9

    # +0.10% with 60s left is ~1.25 sigma -> strongly up but not certain
    p_up = fair_up_probability(78078, 78000, sig, 60)
    assert 0.85 < p_up < 0.95

    # small move with lots of time left -> mild lean only
    assert 0.55 < fair_up_probability(78020, 78000, sig, 240) < 0.85

    # symmetric in log space
    mirror = 78000 ** 2 / 78078
    assert abs(fair_up_probability(mirror, 78000, sig, 60) - (1 - p_up)) < 1e-9

    # expired window is deterministic
    assert fair_up_probability(78100, 78000, sig, 0) == 1.0
    assert fair_up_probability(77900, 78000, sig, 0) == 0.0


def test_decision_gates():
    up_book = {"bid": 0.78, "ask": 0.82}
    dn_book = {"bid": 0.16, "ask": 0.20}

    s = decide(0.90, up_book, dn_book, "TOK_UP", "TOK_DN", 120)
    assert s and s.side == "UP" and abs(s.edge - 0.08) < 1e-9

    s2 = decide(0.10, up_book, dn_book, "u", "d", 120)
    assert s2 and s2.side == "DOWN" and abs(s2.edge - 0.70) < 1e-9

    assert decide(0.83, up_book, dn_book, "u", "d", 120) is None  # fairly priced
    assert decide(0.90, up_book, dn_book, "u", "d", 5) is None    # too near expiry
    assert decide(0.90, up_book, dn_book, "u", "d", 290) is None  # too early
    wide = {"bid": 0.60, "ask": 0.82}
    assert decide(0.90, wide, dn_book, "u", "d", 120) is None     # wide spread
    empty = {"bid": None, "ask": None}
    assert decide(0.90, empty, empty, "u", "d", 120) is None      # empty book


def test_paper_portfolio():
    for f in (config.STATE_FILE, config.TRADE_LOG):
        if os.path.exists(f):
            os.remove(f)
    pf = portfolio.Portfolio()
    pos = portfolio.Position(
        "m", "cid", "UP", "tok", shares=7.25, cost_usdc=5.0,
        entry_price=0.69, fair_at_entry=0.75, window_open_price=78000.0,
        end_ts=time.time() - 10,
    )
    assert pf.can_open("cid")
    pf.open(pos)
    assert not pf.can_open("cid")  # per-market position cap

    pf.settle_expired(lambda end_ts: 78100.0)  # closed above open -> UP wins
    assert abs(pf.balance - (config.PAPER_START_BALANCE - 5 + 7.25)) < 1e-9

    pf.daily_pnl = -config.MAX_DAILY_LOSS_USDC  # daily loss stop halts trading
    assert not pf.can_open("other")

    for f in (config.STATE_FILE, config.TRADE_LOG):
        if os.path.exists(f):
            os.remove(f)


if __name__ == "__main__":
    test_fair_value_model()
    test_decision_gates()
    test_paper_portfolio()
    print("all tests passed")
