"""Head-to-head config tournament.

Tuning against a weak opponent optimises absolute earnings; what actually
decides the ladder is beating a strong opponent that competes for the same
market. This loads independent copies of an agent module so two configs of the
SAME file can fight each other without sharing module-level constants.

  python -m harness.duel --games 4
"""
import argparse
import importlib.util
import os
import statistics

from .run import run_match

AGENT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                          "agents", "farmer_v1.py")


def load_agent(path, alias, overrides=None):
    """Fresh module instance so per-config constants don't leak between sides."""
    spec = importlib.util.spec_from_file_location(alias, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    for k, v in (overrides or {}).items():
        if not hasattr(mod, k):
            raise AttributeError(f"{alias}: no such constant {k!r}")
        setattr(mod, k, v)
    return mod.agent


def duel(path, config_a, config_b, games=4, seed0=0, label_a="A", label_b="B"):
    """Play both configs in both seats. Returns (wins_a, wins_b, mean_margin_a)."""
    wins = [0, 0]
    margins = []
    for i in range(games):
        for flip in (False, True):
            a = load_agent(path, f"cfg_a_{i}_{flip}", config_a)
            b = load_agent(path, f"cfg_b_{i}_{flip}", config_b)
            agents = [b, a] if flip else [a, b]
            res = run_match(agents, seed=seed0 + i)
            ra, rb = (res.rewards[1], res.rewards[0]) if flip else (res.rewards[0], res.rewards[1])
            margins.append(ra - rb)
            if ra > rb:
                wins[0] += 1
            elif rb > ra:
                wins[1] += 1
    return wins[0], wins[1], statistics.mean(margins)


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--games", type=int, default=4)
    ap.add_argument("--path", default=AGENT_PATH)
    args = ap.parse_args(argv)

    baseline = {}  # file defaults
    challengers = {
        "no land":        {"MAX_LAND": 0},
        "two quadrants":  {"MAX_LAND": 2},
        "crew 6":         {"CREW_SIZE": 6},
        "crew 10":        {"CREW_SIZE": 10},
        "carrot":         {"PLANT_CROP": "CARROT"},
        "melon":          {"PLANT_CROP": "MELON"},
        "sell 4/turn":    {"SELL_PER_TURN": 4},
        "sell 30/turn":   {"SELL_PER_TURN": 30},
        "task dist 3":    {"MAX_TASK_DIST": 3},
        "task dist 99":   {"MAX_TASK_DIST": 99},
    }

    print(f"each challenger vs file defaults, {args.games} seeds x both seats "
          f"= {args.games * 2} matches\n")
    print(f"  {'challenger':<16} {'W-L':>7} {'mean margin':>13}")
    print("  " + "-" * 40)
    rows = []
    for name, cfg in challengers.items():
        w, l, margin = duel(args.path, cfg, baseline, games=args.games, label_a=name)
        rows.append((name, w, l, margin))
        flag = "  <-- beats baseline" if margin > 0 else ""
        print(f"  {name:<16} {f'{w}-{l}':>7} {margin:>13,.0f}{flag}")
    print("\nranked:")
    for name, w, l, margin in sorted(rows, key=lambda r: -r[3]):
        print(f"  {name:<16} {margin:>+13,.0f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
