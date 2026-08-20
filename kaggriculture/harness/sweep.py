"""Grid-sweep agent tuning constants and report mean final money.

Agents loaded by file path can't be reconfigured, but `resolve_agent` passes
callables straight through -- so we import the agent module, mutate its module
constants, and hand env.run the function object.

  python -m harness.sweep --games 3
"""
import argparse
import importlib
import itertools
import statistics
import sys

from .run import run_match

# name -> values to try. Keys must be module-level constants on the agent.
GRID = {
    "TILES_PER_UNIT": [2, 3, 4, 5],
    "MAX_CREW": [6, 8, 10, 12],
}


def sweep(module_name, opponent, games, grid, seed0=0):
    mod = importlib.import_module(module_name)
    baseline = {k: getattr(mod, k) for k in grid}
    keys = list(grid)
    results = []

    for combo in itertools.product(*(grid[k] for k in keys)):
        settings = dict(zip(keys, combo))
        for k, v in settings.items():
            setattr(mod, k, v)
        finals = []
        for i in range(games):
            res = run_match([mod.agent, opponent], seed=seed0 + i)
            finals.append(res.rewards[0])
        results.append((settings, statistics.mean(finals), min(finals), max(finals)))
        label = "  ".join(f"{k}={v}" for k, v in settings.items())
        print(f"  {label:<40} mean ${statistics.mean(finals):>10,.0f}  "
              f"min ${min(finals):>9,.0f}  max ${max(finals):>9,.0f}")
        sys.stdout.flush()

    for k, v in baseline.items():
        setattr(mod, k, v)
    return sorted(results, key=lambda r: -r[1])


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--module", default="agents.farmer_v1")
    ap.add_argument("--opponent", default="agents/wheat_loop.py")
    ap.add_argument("--games", type=int, default=3)
    args = ap.parse_args(argv)

    print(f"sweeping {args.module} vs {args.opponent}, {args.games} seed(s) each")
    ranked = sweep(args.module, args.opponent, args.games, GRID)
    print("\nbest:")
    for settings, mean, lo, hi in ranked[:5]:
        label = "  ".join(f"{k}={v}" for k, v in settings.items())
        print(f"  {label:<40} mean ${mean:,.0f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
