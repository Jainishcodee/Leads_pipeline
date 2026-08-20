"""Run Kaggriculture matches locally and print diagnostics.

  python -m harness.run --agents starter random --games 5
  python -m harness.run --agents agents/wheat_loop.py starter --games 3 --csv
  python -m harness.run --agents starter starter --games 1 --replay replays/r.json
"""
import argparse
import json
import os
import sys
import time

from .instrument import Ledger, instrumented
from .report import MatchResult, print_match, print_summary, write_csvs
from .sim import final_rewards, make_env, market_series, money_series, resolve_agent

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def run_match(agents, seed=None, config=None, debug=False, replay_path=None):
    env = make_env(seed=seed, config=config, debug=debug)
    ledger = Ledger()
    resolved = [resolve_agent(a) for a in agents]
    with instrumented(ledger):
        env.run(resolved)

    prices, inventory = market_series(env)
    res = MatchResult(
        seed=seed, agents=[str(a) for a in agents], rewards=final_rewards(env),
        ledger=ledger, money=money_series(env), prices=prices, inventory=inventory,
    )
    if replay_path:
        os.makedirs(os.path.dirname(os.path.abspath(replay_path)), exist_ok=True)
        with open(replay_path, "w") as f:
            json.dump(env.toJSON(), f)
    return res


def main(argv=None):
    ap = argparse.ArgumentParser(description="Run Kaggriculture matches with diagnostics.")
    ap.add_argument("--agents", nargs=2, default=["starter", "random"],
                    help="two agents: builtin name (pass/random/starter) or path to a .py")
    ap.add_argument("--games", type=int, default=1)
    ap.add_argument("--seed", type=int, default=0, help="seed of the first game; increments per game")
    ap.add_argument("--swap", action="store_true",
                    help="also play each seed with sides swapped (doubles games, removes seat bias)")
    ap.add_argument("--quiet", action="store_true", help="summary only, no per-match detail")
    ap.add_argument("--csv", action="store_true", help="write per-step CSVs to out/")
    ap.add_argument("--replay", default=None, help="write replay JSON for the first match")
    ap.add_argument("--debug", action="store_true", help="surface agent exceptions from the env")
    args = ap.parse_args(argv)

    pairings = []
    for i in range(args.games):
        pairings.append((args.seed + i, list(args.agents)))
        if args.swap:
            pairings.append((args.seed + i, list(reversed(args.agents))))

    results = []
    t0 = time.time()
    for n, (seed, agents) in enumerate(pairings):
        started = time.time()
        res = run_match(agents, seed=seed, debug=args.debug,
                        replay_path=args.replay if n == 0 else None)
        elapsed = time.time() - started
        results.append(res)
        if not args.quiet:
            print_match(res)
            print(f"\n  [match ran in {elapsed:.1f}s]")
        else:
            print(f"  seed {seed}: {agents[0]} ${res.rewards[0]:,.0f} vs "
                  f"{agents[1]} ${res.rewards[1]:,.0f}  ({elapsed:.1f}s)")
        if args.csv:
            write_csvs(res, os.path.join(HERE, "out"))

    print_summary(results)
    print(f"\ntotal {time.time() - t0:.1f}s for {len(results)} match(es)")
    if args.csv:
        print(f"CSVs written to {os.path.join(HERE, 'out')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
