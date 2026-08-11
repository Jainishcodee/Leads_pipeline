# Kaggriculture — verified rules

Every number here was read from the installed simulator source, not from the competition docs:

- `kaggle_environments/envs/kaggriculture/kaggriculture.py` (v1.32.6)
- `kaggle_environments/envs/kaggriculture/kaggriculture.json`

**Where this disagrees with `AGENTS.md` / `README.md` shipped alongside the env, the code wins.** Corrections are listed at the bottom.

---

## 1. Frame

| Thing | Value | Source |
|---|---|---|
| Players | 2 | `agents: [2]` |
| Episode | 720 steps = 24 turns/day × 30 days | `episodeSteps`, `turnsPerDay` |
| Board | 10×10, four 5×5 quadrants; only NW unlocked | `boardSize`, `_initial_tile` |
| Starting money | $3000 | `startingMoney` |
| **Act timeout** | **1 second per turn**, 60s total overage | `actTimeout: 1`, `remainingOverageTime: 60` |
| Reward | final `money`, exactly | `s.reward = float(farms[player]["money"])` |
| Market orders/turn | 10 (extras silently dropped) | `maxMarketOrdersPerTurn` |
| Shed capacity | 100 non-seed items | `shedCapacity` |
| Weed spawn | 0.005 per empty tile per day | `weedSpawnChance` |

`actTimeout: 1` is a hard design constraint — no per-turn search, no heavy numpy per step. Budget well under 1s/turn.

## 2. Crops (`CROPS`)

| Crop | Seed | first_yield_day | max_yield_day | interval | max_yield | ongoing |
|---|---|---|---|---|---|---|
| WHEAT | $10 | 2 | 4 | 0 | 6 | no |
| CARROT | $20 | 2 | 3 | 0 | 4 | no |
| TOMATO | $50 | 8 | 8 | 1 | 4 | **yes** |
| STRAWBERRY | $100 | 10 | 10 | 2 | 4 | **yes** |
| MELON | $80 | 10 | 12 | 0 | 6 | no |

> ### ⚠ You must water a crop the same day you plant it
> `_new_plant` sets `consecutive_unwatered = 1` on the planting day. At that
> night's refresh an unwatered plant increments to 2, which is the death
> threshold — so **a crop planted and not watered before the day ends is a weed
> by morning**, having cost you the seed and the tile. Verified directly against
> the simulator. Every plant therefore costs a minimum of 3 unit-actions
> (PLANT + WATER + HARVEST), and PLANT must be issued with enough turns left in
> the day for a unit to also WATER that tile.
>
> Thereafter a plant survives on watering every *other* day (death needs 2
> consecutive misses), but one-time crops only gain yield from watering inside
> their bonus window.

**One-time crops** start at `yield_units = 1`. Watering inside the bonus window adds **+1** (or **+2** if fertilized) per day, capped at `max_yield`. Window is `(max_yield_day + 1) // 2 <= age_days <= max_yield_day`, and only one water per day counts (`watered_today`).

Achievable yields (one water/day, whole window):

| Crop | Window (age days) | Waters | Unfertilized | Fertilized |
|---|---|---|---|---|
| WHEAT | 2–4 | 3 | 1+3 = **4** | 1+6 → cap **6** |
| CARROT | 2–3 | 2 | 1+2 = **3** | 1+4 → cap **4** |
| MELON | 6–12 | 7 | 1+7 → cap **6** | cap **6** |

**Melon hits its cap of 6 with no fertilizer at all** — fertilizing melon is pure waste. It is harvestable from day 10 (`first_yield_day`), and by day 10 it has had waters on days 6–10 = 5, giving 6 units. So melon is a 10-day, $80 → 6 units cycle needing zero fertilizer.

`HARVEST` on a one-time crop **clears the tile** (replant required). Ongoing crops keep producing.

**Ongoing crops** accumulate at end-of-day: production fires when `(next_day - planted_day - first_yield_day) % interval == 0`, giving +1 (+2 if watered *and* fertilized), capped at `max_yield` held. After `max_yield` productions the plant is scheduled to die.

## 3. Animals (`ANIMALS`)

| Animal | Cost | Structure | first_yield_day | interval | max_held | Product |
|---|---|---|---|---|---|---|
| GOOSE | $300 | COOP | 4 | 1 | 4 | EGG |
| COW | $400 | PASTURE | 8 | 2 | 6 | MILK |
| SHEEP | $500 | PASTURE | 6 | 3 | 6 | WOOL |

- **`BUILD_COOP` and `BUILD_PASTURE` are free.** Only the animal costs money.
- `FEED` consumes 1 WHEAT **from the acting unit's carried inventory**, not the shed. Feeding N animals means a unit must `PICKUP WHEAT N` at the shed first.
- Two consecutive unfed days → animal escapes permanently (structure survives).
- `CARE` on a fed day banks `pending_care_bonus += 1`, paid out in full on the **next scheduled production** (still capped by `max_held`).
- `COLLECT_FERTILIZER` yields 1 fertilizer per animal per day (`fertilizer_available` resets true each night).
- Animals produce **indefinitely** while fed. `max_held` caps *uncollected* product on the tile, not lifetime output.

## 4. Market

```
price(inv) = base ± amp * f(|inv - I0|)          amp = target * base / f(T)
sign = +1 below I0 (scarcity), -1 above I0 (glut)      floor = $1
```

All products start at `I0 = 10000` inventory, i.e. exactly `base` price.

| Product | base | T | below_func | below_tgt | above_func | above_tgt |
|---|---|---|---|---|---|---|
| WHEAT | 25 | 400 | sqrt | 0.80 | log | 0.20 |
| CARROT | 35 | 450 | log | 0.20 | sqrt | 0.70 |
| TOMATO | 60 | 200 | linear | 0.40 | sqrt | 0.60 |
| STRAWBERRY | 120 | 100 | sqrt | 0.70 | linear | 1.60 |
| MELON | 250 | 300 | log | 0.20 | **sq** | 3.60 |
| EGG | 50 | 332 | linear | 0.40 | log | 0.20 |
| MILK | 160 | 122 | sqrt | 0.60 | linear | 1.60 |
| WOOL | 200 | 105 | log | 0.20 | **sq** | 3.20 |
| FERTILIZER | 100 | 200 | linear | 0.40 | linear | 0.40 |

`T` is documented in-source as "production capacity of one 5×5 field over a 24-day window at optimal watering". So `above_target` is calibrated as *the fraction of base price you lose by selling one field's full output*. MELON 3.60 and WOOL 3.20 mean **one field's worth of melon or wool crashes the price straight through the floor.** Run `python -m harness.market` for the exact curves.

> ⚠ **Do not read "crashes the price" as "avoid".** Measured head-to-head, melon beats
> wheat roughly 2:1 despite crashing to the $1 floor. Total extractable depth (wheat
> $351k, melon $26k) is the wrong comparison, because a season's labour only produces
> ~720 wheat or ~320 melons — nowhere near enough to reach wheat's depth. What matters
> is revenue *at achievable volume*, where melon's $250 base dominates. The curve
> shapes do still matter for sizing: melon's `sq` decay means ~15 planted tiles earns
> more than 25. See the README tuning section.

Other market facts:
- Only WHEAT and FERTILIZER can be bought back (`BUY_PRODUCT`). Everything sells.
- **Sales at $1 do not add to market inventory** — once floored, further dumping is free but worthless.
- `BUY_PRODUCT` is quoted at post-buy inventory, so a buy/sell round-trip nets exactly zero. No arbitrage.
- Orders resolve **one unit at a time, in lockstep between both players**, both seeing the same pre-commit inventory. If you and the opponent dump the same product on the same turn, you interleave and split the decline.
- Prices refresh after market processing and again after town consumption.

## 5. Town

Shops unlock at end of day when `(day+1) % 3 == 0` → days 3, 6, 9, … , **drawn with replacement** from the 8 shops, capped at **8 total instances**. Duplicates are real and each copy consumes independently.

| Shop | Demands |
|---|---|
| BAKERY | EGG, WHEAT |
| PIZZA_SHOP | MILK, TOMATO, WHEAT |
| BRUNCH_SPOT | EGG, WHEAT, STRAWBERRY |
| YARN_STORE | WOOL (2×) |
| ICE_CREAM_SHOP | STRAWBERRY, MILK, WHEAT |
| PET_CAFE | CARROT (2×) |
| SMOOTHIE_SHOP | STRAWBERRY, MILK |
| FARMERS_MARKET | WHEAT, CARROT, TOMATO, STRAWBERRY |

Single-product shops consume 2× per tick. Shop tick = every 4 steps; town center tick = every 24 steps (once/day), removing 1 of every non-fertilizer product.

**Which shops you get is random and seed-dependent** — WOOL demand only exists if YARN_STORE unlocks. A strategy that hard-commits to wool is gambling on the draw.

## 6. Turn order (`interpreter`)

1. Per player: **atomic PLANT validation** — if total PLANT requests for a crop exceed seeds held, **all** PLANT requests for that crop are dropped (not partially filled).
2. Unit actions applied in order: main farmer, then hands.
3. `_process_market` — HIRE/BUY_LAND first (player order), then SELL/BUY unit-lockstep.
4. `_town_consume`.
5. `_decay_plants`.
6. If `(step+1) % 24 == 0`: **end of day**.

**End of day**, per player, in order: refresh plants (water check → weeds; ongoing production) → refresh animals (feed check → escape; production; care bonus) → spawn weeds → **dump all carried inventories into shed** (overflow past 100 discarded) → **farmer teleports back to spawn** → **all hands are deleted** → `hires_today = 0`. Then the town may unlock a shop.

## 7. Labor

Cost of the n-th hire *that day* is `fib(n)` with `fib = 1, 1, 2, 3, 5, 8, 13, 21, 34, …`, and **the counter resets every morning**.

| Hands hired | Cumulative cost |
|---|---|
| 4 | $6 |
| 6 | $20 |
| 8 | $54 |
| 10 | $143 |
| 12 | $376 |

Hands spawn on shed-access tiles `(4,4) (5,4) (4,5) (5,5)` and are wiped nightly. Movement is 1 tile/turn, so a hand costs ~2–5 turns of walking before it does anything useful. Land: NE $1000, SW $2000, SE $4000, in that fixed order.

---

## Corrections to the official docs

The `AGENTS.md` / `README.md` shipped with the environment are wrong or stale in these places:

1. **Town demand does not scale over time.** `AGENTS.md` claims the town center scales "2× after day 10 and 4× after day 20". `_town_consume` contains no day-dependent multiplier at all — the only multiplier is 2× for single-product shops. Total demand grows *only* by unlocking more shops (capped at 8).
2. **`townCenterSellInterval` default is 24, not 12** (`kaggriculture.json`), i.e. once per day.
3. **MELON `max_yield_day` is 12, not 10.** first_yield_day is 10; those are different fields.
4. **TOMATO is `first_yield_day: 8, max_yield_day: 8, interval: 1`** — an ongoing crop producing daily from day 8, not "day 8 → day 11".
5. Shops unlock **with replacement** (duplicates possible), capped at 8 instances — the docs' table reads as 8 distinct shops.
6. `AGENTS.md` says the watering window starts at `ceil(max_yield_day / 2)`; the code uses `(max_yield_day + 1) // 2`. Identical for integers, but worth pinning.

Anything not listed above matched the docs.
