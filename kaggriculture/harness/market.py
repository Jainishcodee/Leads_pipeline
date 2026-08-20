"""Economic analysis of the Kaggriculture market, computed from the live simulator.

  python -m harness.market            # everything
  python -m harness.market --crops    # crop ROI table only
  python -m harness.market --dump     # price-impact / dump curves only

Nothing here is hardcoded: crop stats and the price function are read straight
out of kaggle_environments so the tables can never drift from the engine.
"""
import argparse

from .sim import K

CROPS, ANIMALS, PRODUCTS = K.CROPS, K.ANIMALS, K.PRODUCTS
I0 = K.MARKET_I0


def price(item, inv):
    return K.market_price(item, inv)


# --------------------------------------------------------------------------
# Crop economics
# --------------------------------------------------------------------------
def simulate_one_time(crop, harvest_day, fertilized=False):
    """Replicate the engine's watering/bonus logic exactly. Returns yield units.

    Assumes the tile is watered every single day (required on the planting day,
    and the only way to collect every bonus day)."""
    cd = CROPS[crop]
    units = 1
    window_start = (cd["max_yield_day"] + 1) // 2
    for age in range(0, harvest_day + 1):
        if window_start <= age <= cd["max_yield_day"]:
            units = min(cd["max_yield"], units + (2 if fertilized else 1))
    return units


def crop_rows():
    rows = []
    for crop, cd in CROPS.items():
        base = K.MARKET_PARAMS[crop]["base"]
        if not cd["ongoing"]:
            for h in range(cd["first_yield_day"], cd["max_yield_day"] + 1):
                for fert in (False, True):
                    units = simulate_one_time(crop, h, fert)
                    # PLANT + one WATER per day alive + HARVEST (+ FERTILIZE)
                    actions = 1 + (h + 1) + 1 + (1 if fert else 0)
                    fert_cost = K.MARKET_PARAMS["FERTILIZER"]["base"] if fert else 0
                    revenue = units * base
                    profit = revenue - cd["seed"] - fert_cost
                    days = max(1, h)
                    rows.append({
                        "crop": crop, "mode": f"harvest d{h}" + ("+fert" if fert else ""),
                        "days": days, "units": units, "revenue": revenue,
                        "profit": profit, "per_tile_day": profit / days,
                        "actions": actions, "per_action": profit / actions,
                    })
        else:
            n = cd["max_yield"]
            lifetime = cd["first_yield_day"] + (n - 1) * cd["interval"]
            units = n
            # water every other day to survive + one HARVEST per production
            actions = 1 + (lifetime // 2 + 1) + n
            revenue = units * base
            profit = revenue - cd["seed"]
            rows.append({
                "crop": crop, "mode": f"ongoing, full {n} yields",
                "days": lifetime, "units": units, "revenue": revenue,
                "profit": profit, "per_tile_day": profit / lifetime,
                "actions": actions, "per_action": profit / actions,
            })
    return rows


def print_crops():
    print("\nCROP ECONOMICS (at base price, ignoring price impact)")
    print("  per_tile_day = profit / days occupying the tile; per_action = profit / unit-actions")
    print(f"  {'crop':<11} {'mode':<22} {'days':>4} {'units':>5} {'profit':>8} "
          f"{'$/tile-day':>10} {'acts':>5} {'$/action':>9}")
    print("  " + "-" * 84)
    for r in sorted(crop_rows(), key=lambda r: -r["per_tile_day"]):
        print(f"  {r['crop']:<11} {r['mode']:<22} {r['days']:>4} {r['units']:>5} "
              f"{r['profit']:>8.0f} {r['per_tile_day']:>10.1f} {r['actions']:>5} "
              f"{r['per_action']:>9.1f}")

    print("\nANIMAL ECONOMICS (steady state, at base price)")
    print(f"  {'animal':<8} {'cost':>5} {'product':<6} {'base':>5} {'/day':>7} "
          f"{'wheat cost/day':>15} {'net/day':>8} {'payback(d)':>11}")
    print("  " + "-" * 74)
    wheat_price = K.MARKET_PARAMS["WHEAT"]["base"]
    for a, ad in ANIMALS.items():
        base = K.MARKET_PARAMS[ad["product"]]["base"]
        per_day = 1.0 / ad["interval"]
        gross = per_day * base
        net = gross - wheat_price  # 1 wheat/day, valued at what you could sell it for
        payback = ad["cost"] / net if net > 0 else float("inf")
        print(f"  {a:<8} {ad['cost']:>5} {ad['product']:<6} {base:>5} {gross:>7.1f} "
              f"{wheat_price:>15} {net:>8.1f} {payback:>11.1f}")
    print("  (CARE adds +1 per production if fed+cared every day, roughly doubling output)")


# --------------------------------------------------------------------------
# Price impact
# --------------------------------------------------------------------------
def dump_curve(item, n_units, start_inv=I0):
    """Sell n_units one at a time, exactly as _process_market commits them."""
    inv = start_inv
    total = 0
    marginal = []
    for _ in range(n_units):
        p = price(item, inv)
        total += p
        marginal.append(p)
        if p > 1:  # sales at the floor do not add supply
            inv += 1
    return total, marginal, inv


def print_dump():
    sizes = [10, 25, 50, 100, 200, 400]
    print("\nPRICE IMPACT - revenue from dumping N units into an untouched market")
    print("  'avg' is realised $/unit; 'last' is the price of the N-th unit.")
    header = "  " + f"{'product':<11} {'base':>5}" + "".join(f"{('N=' + str(n)):>22}" for n in sizes)
    print(header)
    print("  " + "-" * (18 + 22 * len(sizes)))
    for item in PRODUCTS:
        base = K.MARKET_PARAMS[item]["base"]
        cells = []
        for n in sizes:
            total, marg, _ = dump_curve(item, n)
            cells.append(f"{total:>9,.0f} avg{total / n:>5.0f} last{marg[-1]:>4}")
        print(f"  {item:<11} {base:>5}" + "".join(f"{c:>22}" for c in cells))

    print("\n  Units until the price halves / hits the $1 floor:")
    print(f"  {'product':<11} {'base':>5} {'half at N':>10} {'floor at N':>11} "
          f"{'rev @ floor':>12} {'T (1 field)':>12}")
    print("  " + "-" * 66)
    for item in PRODUCTS:
        base = K.MARKET_PARAMS[item]["base"]
        T = K.MARKET_PARAMS[item]["T"]
        inv, half_at, floor_at, total = I0, None, None, 0
        for n in range(1, 20001):
            p = price(item, inv)
            total += p
            if half_at is None and p <= base / 2:
                half_at = n
            if p <= 1:
                floor_at = n
                break
            inv += 1
        print(f"  {item:<11} {base:>5} {str(half_at):>10} {str(floor_at):>11} "
              f"{total:>12,.0f} {T:>12}")

    print("\n  Scarcity side - price if the town has eaten N units below I0:")
    print(f"  {'product':<11} " + "".join(f"{('-' + str(n)):>8}" for n in (10, 50, 100, 250, 500)))
    print("  " + "-" * 55)
    for item in PRODUCTS:
        cells = "".join(f"{price(item, I0 - n):>8}" for n in (10, 50, 100, 250, 500))
        print(f"  {item:<11} " + cells)


def print_town():
    print("\nTOWN DEMAND - units removed from the market per day (24 steps)")
    print("  town center: 1 of every non-fertilizer product per day")
    print("  each shop instance: 1 of each of its products every 4 steps = 6/day (2x if single-product)")
    print(f"  {'shop':<16} {'products':<45} {'units/day each'}")
    print("  " + "-" * 78)
    for shop, items in sorted(K.SHOPS.items()):
        mult = 2 if len(items) == 1 else 1
        per_day = 6 * mult
        print(f"  {shop:<16} {', '.join(items):<45} {per_day} per product")
    print(f"\n  Shops unlock on days 3,6,9,... drawn WITH REPLACEMENT, capped at "
          f"{K.MAX_SHOP_INSTANCES} instances.")
    print("  Max total shop demand late season is therefore 8 instances, composition random per seed.")


def main(argv=None):
    ap = argparse.ArgumentParser(description="Kaggriculture market/crop economics.")
    ap.add_argument("--crops", action="store_true")
    ap.add_argument("--dump", action="store_true")
    ap.add_argument("--town", action="store_true")
    args = ap.parse_args(argv)
    show_all = not (args.crops or args.dump or args.town)
    if args.crops or show_all:
        print_crops()
    if args.dump or show_all:
        print_dump()
    if args.town or show_all:
        print_town()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
