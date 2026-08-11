"""Smoke-test agent: a single farmer farming a single tile of wheat.

This exists only to exercise the harness end-to-end (file-path agent loading,
plant/water/harvest/drop/sell round trip). It is NOT the Phase 3 baseline --
it never hires, never buys land, and uses 1 of 25 available tiles.
"""


def agent(obs):
    player = obs["player"]
    me = obs["farms"][player]
    priv = obs["private"]
    x, y = me["farmer"]
    tile = me["tiles"][y][x]
    inv = priv["inventories"][0] if priv.get("inventories") else {}

    market = []
    if priv["seeds"].get("WHEAT", 0) < 1 and me["money"] >= 10:
        market.append(["BUY_SEED", "WHEAT", 1])
    in_shed = priv["shed"].get("WHEAT", 0)
    if in_shed > 0:
        market.append(["SELL", "WHEAT", in_shed])

    op = ["PASS"]
    if inv.get("WHEAT", 0) > 0:
        op = ["DROP"]                       # farmer spawns shed-adjacent at (4,4)
    elif tile is None and priv["seeds"].get("WHEAT", 0) > 0:
        op = ["PLANT", "WHEAT"]
    elif isinstance(tile, dict) and tile.get("kind") == "WEED":
        op = ["DIG"]
    elif isinstance(tile, dict) and tile.get("kind") == "PLANT":
        if not tile["watered_today"]:
            op = ["WATER"]                  # must include the planting day itself
        elif obs["day"] - tile["planted_day"] >= 4 and tile["yield_units"] > 0:
            op = ["HARVEST"]

    return {"farmer": op, "hands": [], "market": market}
