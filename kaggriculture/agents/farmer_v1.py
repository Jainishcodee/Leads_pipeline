"""Phase 3 scripted farmer: limited-acreage melon.

Strategy, measured head-to-head rather than argued from the price tables:
  - Melon, not wheat. The static analysis said wheat, on the grounds that wheat
    never floors ($351k extractable) while melon floors after 159 units. That
    reasoning was wrong: market depth is irrelevant when you cannot reach it. A
    season's labour produces only ~720 wheat or ~320 melons, and at those
    volumes melon earns ~$31k against wheat's ~$15k even after crashing its own
    price to the floor. Melon also costs less labour per tile-day (11 waters per
    10-day cycle vs wheat's ~14).
  - Cap the acreage. Melon's price curve is `sq` above I0, so supply hurts
    superlinearly: ~15 planted tiles yields ~$30.9k, 25 tiles only ~$26.6k, and
    30 tiles ~$25.9k. Planting more melon earns less money.
  - Small crew (3). Not to save the trivial hire cost, but because crew size is
    what drives acreage here -- more hands means more tiles means a worse price.
  - No land. 15 active tiles never exhausts the starting quadrant, so BUY_LAND
    never fires; the cash is better left unspent than converted into melon glut.
  - Melon is also immune to both RNG sources: continuously-occupied tiles spawn
    no weeds, and no town shop demands melon. Final money is seed-independent,
    which is worth real rating points on a skill ladder.

Dominant in the payoff matrix: vs a wheat opponent $30.9k to $12.3k, and still
ahead in the melon mirror ($14.2k vs $13.1k).

Self-contained: no imports, `agent` is the last def, submittable as-is.
"""

# Mirrors CROPS in kaggriculture.py. Only the fields the policy needs.
# "maxday" is the day we choose to harvest, not the engine's max_yield_day.
# Melon's engine max_yield_day is 12, but its yield caps at 6 by day 10 (window
# opens day 6, +1/day), so holding to 12 just burns two tile-days for nothing.
CROP = {
    "WHEAT":  {"seed": 10, "first": 2, "maxday": 4, "ongoing": False},
    "CARROT": {"seed": 20, "first": 2, "maxday": 3, "ongoing": False},
    "MELON":  {"seed": 80, "first": 10, "maxday": 10, "ongoing": False},
}
PLANT_CROP = "MELON"

# Target number of tiles planted with each crop. Every product has its own
# independent price curve, so splitting output across crops realises a much
# better average price than crushing one curve to the floor. Set a single
# entry to fall back to monoculture.
CROP_MIX = {"MELON": 15}

BOARD = 10
TURNS_PER_DAY = 24
SHED_CAP = 100
MAX_ORDERS = 10

# Task priorities, lower runs first.
P_WATER, P_HARVEST, P_PLANT, P_DIG = 0, 1, 2, 3

LAND_PRICES = [1000, 2000, 4000]
# How many extra quadrants to ever buy (0-3).
MAX_LAND = 1
# Don't spend the last dollar on land; keep a seed/hire buffer.
LAND_BUFFER = 500
# Spread sales so the price curve recovers between turns.
SELL_PER_TURN = 12
# Latest hour at which planting still leaves time to water the tile.
LAST_PLANT_HOUR = 20

# Units respawn at the four shed tiles every morning and move 1 tile/turn, so
# every tile costs a round trip. Planting more ground than the crew can water
# just converts seed money into weeds -- cap active tiles and always work the
# ones closest to the shed first.
TILES_PER_UNIT = 5
# Never send a unit across the board for one action.
MAX_TASK_DIST = 6
SHED_TILES = ((4, 4), (5, 4), (4, 5), (5, 5))
# Hands hired each morning. Cost is fib-cumulative and resets nightly:
# 6 -> $20, 8 -> $54, 10 -> $143, 12 -> $376, 14 -> $986.
CREW_SIZE = 3
CREW_PER_QUADRANT = 0


def _crew_target(unlocked_quadrants):
    return CREW_SIZE + CREW_PER_QUADRANT * (unlocked_quadrants - 1)


def _dist(ax, ay, bx, by):
    return abs(ax - bx) + abs(ay - by)


def _step_toward(ux, uy, tx, ty):
    if ux != tx:
        return ["EAST"] if tx > ux else ["WEST"]
    if uy != ty:
        return ["SOUTH"] if ty > uy else ["NORTH"]
    return ["PASS"]


def _shed_dist(x, y):
    return min(_dist(x, y, sx, sy) for sx, sy in SHED_TILES)


def _build_tasks(tiles, day, hour, to_plant):
    """One task per actionable tile. `to_plant` is the crop for each new planting."""
    tasks = []
    plantable = []
    for y in range(len(tiles)):
        row = tiles[y]
        for x in range(len(row)):
            t = row[x]
            if t == "LOCKED":
                continue
            if t is None:
                plantable.append((x, y))
                continue
            if not isinstance(t, dict):
                continue
            kind = t.get("kind")
            if kind == "WEED":
                tasks.append((P_DIG, x, y, ["DIG"]))
            elif kind == "PLANT":
                cd = CROP.get(t["crop"])
                if cd is None:
                    continue
                age = day - t["planted_day"]
                # Water first: it is time-critical (death at 2 misses) and adds
                # yield inside the bonus window. Harvest can slip a turn.
                if not t.get("watered_today") and age <= cd["maxday"]:
                    tasks.append((P_WATER, x, y, ["WATER"]))
                elif t.get("yield_units", 0) > 0 and age >= cd["maxday"]:
                    tasks.append((P_HARVEST, x, y, ["HARVEST"]))
                elif not t.get("watered_today"):
                    # Past max yield but still alive -- keep it watered until harvest.
                    tasks.append((P_WATER, x, y, ["WATER"]))

    if hour <= LAST_PLANT_HOUR and to_plant:
        # Closest ground first. `to_plant` is already capped per crop by seeds
        # held -- the engine drops ALL plant requests for a crop that exceed stock.
        plantable.sort(key=lambda p: _shed_dist(p[0], p[1]))
        for (x, y), crop in zip(plantable, to_plant):
            tasks.append((P_PLANT, x, y, ["PLANT", crop]))
    return tasks


def _assign(tasks, units):
    """Greedy: highest-priority task claims its nearest free unit."""
    ops = [["PASS"] for _ in units]
    free = set(range(len(units)))
    # Within a priority band, serve the tile closest to the shed first so the
    # crew stays clustered instead of fanning out across the board.
    for _prio, tx, ty, op in sorted(tasks, key=lambda t: (t[0], _shed_dist(t[1], t[2]))):
        if not free:
            break
        best, best_d = None, None
        for i in free:
            d = _dist(units[i][0], units[i][1], tx, ty)
            if best_d is None or d < best_d:
                best, best_d = i, d
        if best_d is not None and best_d > MAX_TASK_DIST:
            continue  # leave the unit for nearer work
        free.discard(best)
        ux, uy = units[best]
        ops[best] = op if (ux == tx and uy == ty) else _step_toward(ux, uy, tx, ty)
    return ops


def _market_orders(me, priv, obs, want_seeds, field_saturated):
    orders = []
    money = me["money"]
    hour = obs["hour"]
    unlocked = len(me["unlocked_quadrants"])

    # 1. Labour first -- cheapest lever in the game, and hands need the day.
    if hour == 0:
        for _ in range(_crew_target(unlocked)):
            orders.append(["HIRE"])

    # 2. Land, but only once the crew has actually run out of ground. Buying
    #    early just spreads the same units over more tiles and starves the
    #    plants of water -- that cost v1 the match by $2.4k.
    if field_saturated and unlocked - 1 < min(MAX_LAND, len(LAND_PRICES)):
        price = LAND_PRICES[unlocked - 1]
        if money >= price + LAND_BUFFER:
            orders.append(["BUY_LAND"])
            money -= price

    # 3. Seeds, one order per crop that is short. Buy the cheapest first so a
    #    tight budget still gets something in the ground.
    for crop, short in sorted(want_seeds.items(), key=lambda kv: CROP[kv[0]]["seed"]):
        if short <= 0:
            continue
        seed_cost = CROP[crop]["seed"]
        n = min(short, int(money // seed_cost))
        if n > 0:
            orders.append(["BUY_SEED", crop, n])
            money -= n * seed_cost

    # 4. Sell, spread out so the price curve recovers between turns. Shed
    #    overflow past 100 is discarded at end of day, so drain it.
    shed = priv["shed"]
    total_shed = sum(shed.values())
    cap = SELL_PER_TURN if total_shed < SHED_CAP - 20 else SHED_CAP
    for item, n in sorted(shed.items(), key=lambda kv: -kv[1]):
        if n <= 0 or item not in ("WHEAT", "CARROT", "TOMATO", "STRAWBERRY",
                                  "MELON", "EGG", "MILK", "WOOL", "FERTILIZER"):
            continue
        orders.append(["SELL", item, min(n, cap)])

    return orders[:MAX_ORDERS]


def agent(obs):
    player = obs["player"]
    me = obs["farms"][player]
    priv = obs["private"]
    tiles = me["tiles"]
    day, hour = obs["day"], obs["hour"]

    units = [list(me["farmer"])] + [list(h) for h in me["hands"]]

    unlocked_count = 0
    growing = 0
    per_crop = {c: 0 for c in CROP_MIX}
    for row in tiles:
        for t in row:
            if t == "LOCKED":
                continue
            unlocked_count += 1
            if isinstance(t, dict) and t.get("kind") == "PLANT":
                growing += 1
                if t["crop"] in per_crop:
                    per_crop[t["crop"]] += 1

    # How much ground this crew can actually keep watered.
    crew = _crew_target(len(me["unlocked_quadrants"]))
    active_cap = min(unlocked_count, TILES_PER_UNIT * crew)
    active_budget = max(0, active_cap - growing)
    field_saturated = active_cap >= unlocked_count and growing >= unlocked_count - 2

    # Tiles short of target per crop; what we can plant now from seeds on hand;
    # and what still needs buying. Seeds already in stock MUST be netted off the
    # buy order -- otherwise we re-buy a full set every turn while units are
    # still walking to the tiles, which costs more than the crop earns.
    deficit = {c: max(0, target - per_crop[c]) for c, target in CROP_MIX.items()}
    seeds = priv["seeds"]
    to_plant = []
    for crop, short in sorted(deficit.items(), key=lambda kv: -kv[1]):
        n = min(short, seeds.get(crop, 0), active_budget - len(to_plant))
        to_plant.extend([crop] * max(0, n))
    buy_seeds = {c: max(0, n - seeds.get(c, 0)) for c, n in deficit.items()}

    tasks = _build_tasks(tiles, day, hour, to_plant)
    ops = _assign(tasks, units)
    orders = _market_orders(me, priv, obs, buy_seeds, field_saturated)

    return {"farmer": ops[0], "hands": ops[1:], "market": orders}
