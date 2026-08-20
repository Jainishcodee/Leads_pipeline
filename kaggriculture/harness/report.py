"""Turn a match (or a set of matches) into a readable diagnostic report."""
import csv
import os
import statistics

TURNS_PER_DAY = 24


def _fmt_money(v):
    return f"${v:,.0f}"


def _pct(n, d):
    return f"{(100.0 * n / d):5.1f}%" if d else "    -"


def _bar(frac, width=28):
    filled = int(round(frac * width))
    return "#" * filled + "." * (width - filled)


class MatchResult:
    def __init__(self, seed, agents, rewards, ledger, money, prices, inventory):
        self.seed = seed
        self.agents = agents
        self.rewards = rewards
        self.ledger = ledger
        self.money = money
        self.prices = prices
        self.inventory = inventory

    @property
    def winner(self):
        if self.rewards[0] == self.rewards[1]:
            return None
        return 0 if self.rewards[0] > self.rewards[1] else 1


def print_match(res, focus=0):
    L = res.ledger
    print(f"\n{'=' * 72}")
    print(f"seed={res.seed}  {res.agents[0]} (P0) vs {res.agents[1]} (P1)")
    print(f"{'=' * 72}")
    print(f"  P0 final: {_fmt_money(res.rewards[0])}    P1 final: {_fmt_money(res.rewards[1])}"
          f"    winner: {'tie' if res.winner is None else 'P' + str(res.winner)}")

    for p in (0, 1):
        print(f"\n--- Player {p} ({res.agents[p]}) ---")

        breakdown = L.action_breakdown(p)
        total = sum(breakdown.values())
        print(f"  unit-actions issued: {total}")
        for outcome in ("OK", "MOVE", "PASS", "NOOP", "MOVE_BLOCKED", "MALFORMED", "NO_UNIT"):
            n = breakdown.get(outcome, 0)
            if n:
                print(f"    {outcome:<13} {n:6d}  {_pct(n, total)}  {_bar(n / total)}")
        wasted = sum(breakdown.get(k, 0) for k in ("PASS", "NOOP", "MOVE_BLOCKED", "MALFORMED"))
        print(f"    -> wasted (no state change): {_pct(wasted, total)}"
              f"   walking: {_pct(breakdown.get('MOVE', 0), total)}")

        noops = L.op_breakdown(p, "NOOP")
        if noops:
            top = sorted(noops.items(), key=lambda kv: -kv[1])[:5]
            print("    top failing ops: " + ", ".join(f"{op}x{n}" for op, n in top))

        rev = L.revenue_by_product(p)
        if rev:
            print("  revenue:")
            for item, d in sorted(rev.items(), key=lambda kv: -kv[1]["revenue"]):
                avg = d["revenue"] / d["units"]
                print(f"    {item:<11} {d['units']:5d} units  {_fmt_money(d['revenue']):>10}"
                      f"   avg {_fmt_money(avg)}")
            print(f"    {'TOTAL':<11} {sum(d['units'] for d in rev.values()):5d} units  "
                  f"{_fmt_money(sum(d['revenue'] for d in rev.values())):>10}")
        else:
            print("  revenue: none (sold nothing)")

        spend = L.spend_by_category(p)
        if spend:
            print("  spend:")
            for key, d in sorted(spend.items(), key=lambda kv: -kv[1]["cost"]):
                print(f"    {key:<20} {d['units']:5d}x  {_fmt_money(d['cost']):>10}")

        hpd = L.hires_per_day(p, TURNS_PER_DAY)
        if hpd:
            vals = list(hpd.values())
            print(f"  hands: {sum(vals)} total over {len(hpd)} days "
                  f"(mean {statistics.mean(vals):.1f}/day, max {max(vals)})")
        else:
            print("  hands: never hired")

    print("\n  money by day (P0 / P1):")
    for day in range(0, 30, 3):
        idx = min(day * TURNS_PER_DAY, len(res.money[0]) - 1)
        print(f"    day {day:2d}  {_fmt_money(res.money[0][idx]):>10} / {_fmt_money(res.money[1][idx]):>10}")

    print("\n  market prices (base -> final, min seen):")
    for item, series in res.prices.items():
        if not series:
            continue
        print(f"    {item:<11} {series[0]:>5} -> {series[-1]:<5}  min {min(series):<5}  max {max(series)}")


def print_summary(results):
    """Aggregate by agent, not by seat -- with --swap, seat stats are $0 by construction."""
    print(f"\n{'=' * 72}")
    print(f"SUMMARY over {len(results)} match(es)")
    print(f"{'=' * 72}")

    stats = {}
    for r in results:
        for seat, name in enumerate(r.agents):
            s = stats.setdefault(name, {"wins": 0, "games": 0, "finals": [], "margins": []})
            s["games"] += 1
            s["finals"].append(r.rewards[seat])
            s["margins"].append(r.rewards[seat] - r.rewards[1 - seat])
        if r.winner is not None:
            stats[r.agents[r.winner]]["wins"] += 1

    ties = sum(1 for r in results if r.winner is None)
    print(f"  {'agent':<28} {'W-L':>9} {'winrate':>8} {'mean $':>10} "
          f"{'median $':>10} {'mean margin':>12}")
    print("  " + "-" * 82)
    for name, s in sorted(stats.items(), key=lambda kv: -statistics.mean(kv[1]["margins"])):
        drawn = sum(1 for r in results if r.winner is None and name in r.agents)
        losses = s["games"] - s["wins"] - drawn
        record = f"{s['wins']}-{losses}"
        winrate = 100.0 * s["wins"] / s["games"]
        print(f"  {name:<28} {record:>9} {winrate:>7.1f}% "
              f"{_fmt_money(statistics.mean(s['finals'])):>10} "
              f"{_fmt_money(statistics.median(s['finals'])):>10} "
              f"{_fmt_money(statistics.mean(s['margins'])):>12}")
    if ties:
        print(f"  ({ties} tie(s))")

    if len(stats) == 2:
        seat_margin = statistics.mean([r.rewards[0] - r.rewards[1] for r in results])
        print(f"\n  seat bias (mean P0-P1): {_fmt_money(seat_margin)}"
              f"{'  <- run with --swap to cancel this out' if abs(seat_margin) > 1 else ''}")


def write_csvs(res, outdir):
    os.makedirs(outdir, exist_ok=True)
    tag = f"seed{res.seed}"

    with open(os.path.join(outdir, f"money_{tag}.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["step", "day", "p0_money", "p1_money"])
        for i, (a, b) in enumerate(zip(res.money[0], res.money[1])):
            w.writerow([i, i // TURNS_PER_DAY, a, b])

    with open(os.path.join(outdir, f"prices_{tag}.csv"), "w", newline="") as f:
        items = sorted(res.prices)
        w = csv.writer(f)
        w.writerow(["step"] + [f"price_{i}" for i in items] + [f"inv_{i}" for i in items])
        n = len(next(iter(res.prices.values()), []))
        for s in range(n):
            w.writerow([s] + [res.prices[i][s] for i in items] + [res.inventory[i][s] for i in items])

    with open(os.path.join(outdir, f"trades_{tag}.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["turn", "player", "op", "item", "price"])
        w.writeheader()
        w.writerows(res.ledger.trades)

    with open(os.path.join(outdir, f"actions_{tag}.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["turn", "player", "unit", "op", "outcome"])
        w.writeheader()
        w.writerows(res.ledger.actions)

    return outdir
