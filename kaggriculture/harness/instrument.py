"""Exact instrumentation of a Kaggriculture match.

Rather than guessing what happened from observation diffs, we wrap the
simulator's own internals so every committed transaction and every unit action
is recorded exactly as the engine resolved it:

  _commit_unit       -> every filled SELL / BUY_* unit, at its actual price
  _do_hire           -> hire cost actually paid
  _do_buy_land       -> land purchases
  _apply_unit_action -> per-unit op + whether it changed anything (no-op detection)
  _process_market    -> turn boundary (called exactly once per turn)

These are private functions, so this is version-coupled by construction.
`assert_patchable()` fails loudly if a future release moves them.
"""
import contextlib
import copy

from .sim import K

MOVES = ("NORTH", "SOUTH", "EAST", "WEST")
_REQUIRED = ("_commit_unit", "_do_hire", "_do_buy_land", "_apply_unit_action", "_process_market")


def assert_patchable():
    missing = [n for n in _REQUIRED if not callable(getattr(K, n, None))]
    if missing:
        raise RuntimeError(
            f"kaggriculture internals changed; harness cannot instrument {missing}. "
            f"Re-check kaggriculture.py against harness/instrument.py."
        )


class Ledger:
    def __init__(self):
        self.trades = []        # turn, player, op, item, price
        self.hires = []         # turn, player, cost
        self.land = []          # turn, player, quadrant, cost
        self.actions = []       # turn, player, unit, op, outcome

    # --- convenience rollups -------------------------------------------------
    def revenue_by_product(self, player):
        out = {}
        for t in self.trades:
            if t["player"] == player and t["op"] == "SELL":
                d = out.setdefault(t["item"], {"units": 0, "revenue": 0})
                d["units"] += 1
                d["revenue"] += t["price"]
        return out

    def spend_by_category(self, player):
        out = {}
        for t in self.trades:
            if t["player"] == player and t["op"] != "SELL":
                key = f"{t['op']}:{t['item']}"
                d = out.setdefault(key, {"units": 0, "cost": 0})
                d["units"] += 1
                d["cost"] += t["price"]
        hire = sum(h["cost"] for h in self.hires if h["player"] == player)
        if hire:
            out["HIRE"] = {"units": sum(1 for h in self.hires if h["player"] == player), "cost": hire}
        land = sum(l["cost"] for l in self.land if l["player"] == player)
        if land:
            out["BUY_LAND"] = {"units": sum(1 for l in self.land if l["player"] == player), "cost": land}
        return out

    def action_breakdown(self, player):
        out = {}
        for a in self.actions:
            if a["player"] == player:
                out[a["outcome"]] = out.get(a["outcome"], 0) + 1
        return out

    def op_breakdown(self, player, outcome=None):
        out = {}
        for a in self.actions:
            if a["player"] == player and (outcome is None or a["outcome"] == outcome):
                out[a["op"]] = out.get(a["op"], 0) + 1
        return out

    def hires_per_day(self, player, turns_per_day=24):
        days = {}
        for h in self.hires:
            if h["player"] == player:
                days[h["turn"] // turns_per_day] = days.get(h["turn"] // turns_per_day, 0) + 1
        return days


def _snapshot(farm, private, idx):
    pos = K._farmer_position(farm, idx)
    if pos is None:
        return None
    x, y = pos[0], pos[1]
    return {
        "pos": (x, y),
        "tile": copy.deepcopy(farm["tiles"][y][x]),
        "inv": dict(private["inventories"][idx]) if idx < len(private["inventories"]) else {},
        "shed": dict(private["shed"]),
        "seeds": dict(private["seeds"]),
    }


def _classify(op, before, after):
    if before is None or after is None:
        return "NO_UNIT"
    if op in MOVES:
        return "MOVE" if before["pos"] != after["pos"] else "MOVE_BLOCKED"
    if op == "PASS":
        return "PASS"
    changed = any(before[k] != after[k] for k in ("pos", "tile", "inv", "shed", "seeds"))
    return "OK" if changed else "NOOP"


@contextlib.contextmanager
def instrumented(ledger):
    """Patch the simulator for the duration of one or more matches."""
    assert_patchable()
    orig = {name: getattr(K, name) for name in _REQUIRED}
    # The engine deep-copies observation state between turns, so a farm dict's
    # identity is only stable *within* one turn. We therefore rebuild the
    # farm -> player mapping every turn rather than once per match.
    ctx = {"turn": 0, "pending": [], "farms": []}

    def player_of(farm):
        for i, f in enumerate(ctx["farms"]):
            if f is farm:
                return i
        ctx["farms"].append(farm)
        if len(ctx["farms"]) > 2:
            raise RuntimeError(
                f"instrumentation saw {len(ctx['farms'])} distinct farm objects in turn "
                f"{ctx['turn']}; the per-turn identity assumption is broken."
            )
        return len(ctx["farms"]) - 1

    def commit_unit(op, item, price, farm, private, market, shed_capacity=100):
        ok = orig["_commit_unit"](op, item, price, farm, private, market, shed_capacity)
        if ok:
            ledger.trades.append({
                "turn": ctx["turn"], "player": player_of(farm),
                "op": op, "item": item, "price": price,
            })
        return ok

    def do_hire(farm, private, board_size, mult=K.FARM_HAND_COST_MULT):
        before = farm["hires_today"]
        cost = K._hire_cost(before, mult)
        orig["_do_hire"](farm, private, board_size, mult)
        if farm["hires_today"] > before:
            ledger.hires.append({"turn": ctx["turn"], "player": player_of(farm), "cost": cost})

    def do_buy_land(farm, board_size):
        before = list(farm["unlocked_quadrants"])
        idx = len(before) - 1
        cost = K.LAND_PRICES[idx] if idx < len(K.LAND_PRICES) else 0
        orig["_do_buy_land"](farm, board_size)
        if len(farm["unlocked_quadrants"]) > len(before):
            ledger.land.append({
                "turn": ctx["turn"], "player": player_of(farm),
                "quadrant": farm["unlocked_quadrants"][-1], "cost": cost,
            })

    def apply_unit_action(farm, private, idx, action, board_size, day, turns_per_day, shed_capacity=100):
        op = action[0] if isinstance(action, list) and action else "MALFORMED"
        before = _snapshot(farm, private, idx)
        orig["_apply_unit_action"](farm, private, idx, action, board_size, day, turns_per_day, shed_capacity)
        after = _snapshot(farm, private, idx)
        ctx["pending"].append({
            "player": player_of(farm), "unit": idx,
            "op": op, "outcome": _classify(op, before, after),
        })

    def process_market(state, env):
        # Authoritative farm list for this turn; overwrites whatever
        # _apply_unit_action registered (same objects, so identity still holds).
        farms = getattr(state[0].observation, "farms", None) or []
        ctx["farms"] = list(farms)
        orig["_process_market"](state, env)
        for rec in ctx["pending"]:
            rec["turn"] = ctx["turn"]
            ledger.actions.append(rec)
        ctx["pending"].clear()
        ctx["turn"] += 1
        ctx["farms"] = []  # next turn's copies re-register in player order

    K._commit_unit = commit_unit
    K._do_hire = do_hire
    K._do_buy_land = do_buy_land
    K._apply_unit_action = apply_unit_action
    K._process_market = process_market
    try:
        yield ledger
    finally:
        for name, fn in orig.items():
            setattr(K, name, fn)
