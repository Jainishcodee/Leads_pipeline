# Kaggriculture

Work for the [Kaggriculture](https://www.kaggle.com/competitions/kaggriculture) Kaggle
simulations competition. Self-contained Python; unrelated to the Flutter app in the
repo root.

- **[RULES.md](RULES.md)** — game mechanics verified against the simulator source,
  including six corrections to the official docs. Read this before writing agent logic.
- **`harness/`** — local match runner, exact instrumentation, and market analysis.
- **`agents/`** — agent implementations. `wheat_loop.py` is a smoke test, not a real baseline.

## Setup

```bash
python -m venv .venv

# Windows
./.venv/Scripts/python.exe -m pip install -r requirements.txt
./.venv/Scripts/python.exe -m pip install --no-deps kaggle-environments

# macOS/Linux
# .venv/bin/python -m pip install -r requirements.txt
# .venv/bin/python -m pip install --no-deps kaggle-environments
```

> **Why two steps / why `--no-deps`:** `kaggle-environments` declares `jax`,
> `open_spiel`, `transformers` and `litellm` as hard requirements for *other*
> environments. Kaggriculture imports none of them, and installing them on Windows
> fails with `WinError 206` — `orbax` nests ~180 characters deep, which blows past the
> 260-char `MAX_PATH` limit once it sits under this repo's directory. So the deps that
> are genuinely needed come from `requirements.txt` (resolved normally), and
> `kaggle-environments` itself goes in with `--no-deps`.
>
> If you ever need the full tree, enable Win32 long paths or create the venv at a short
> path such as `C:\kg`.

## Running matches

```bash
# one match, full diagnostics
python -m harness.run --agents starter random

# benchmark an agent, both seats, 10 seeds
python -m harness.run --agents agents/wheat_loop.py starter --games 10 --swap --quiet

# dump per-step CSVs to out/ and a replay JSON
python -m harness.run --agents agents/wheat_loop.py starter --csv --replay replays/r0.json
```

Built-in opponents: `pass`, `random`, `starter`. Any `.py` path with an `agent`
function also works. A match takes ~1.6s, so 100 matches is under three minutes.

Always benchmark with `--swap`. Seeds control weather/weed RNG *and* which town shops
unlock, so a single seed is not a measurement.

### What the report tells you

- **Action breakdown** — `OK` / `MOVE` / `PASS` / `NOOP`. `NOOP` means the agent issued
  an op the engine rejected outright (watering an empty tile, harvesting nothing). The
  `top failing ops` line is the fastest way to find a broken policy.
- **Revenue by product** with realised average price — shows price impact directly.
- **Spend by category**, including hire and land.
- **Hands per day** — the labor lever, which both built-in agents ignore entirely.
- **Money by day** and per-product price ranges.

These come from wrapping the simulator's own `_commit_unit` / `_apply_unit_action`
rather than diffing observations, so the numbers are exact. `harness/instrument.py`
raises immediately if a future `kaggle-environments` release moves those internals.

## Market analysis

```bash
python -m harness.market            # crops, price impact, town demand
python -m harness.market --dump     # price impact only
```

Everything is computed from the live simulator constants, so these tables cannot drift
from the engine.

## Results

Measured over 6 seeds, both seats (`--games 6 --swap`):

| Agent | Mean final money | vs `starter` |
|---|---|---|
| `random` | $0 (bankrupts itself) | — |
| `starter` | $3,477 | — |
| `wheat_loop.py` (1 tile, no hires) | $3,510 | +$33 |
| `farmer_v1` wheat config | $12,839 | +$9,345 |
| **`farmer_v1.py`** (melon, 15 tiles) | **$30,880** | **+$27,403, 8-0** |

Starting money is $3,000, so `starter` nets under $500 across a 30-day season and
passes on 93% of its turns.

### farmer_v1 tuning

Swept with `harness.sweep` (absolute earnings) then `harness.duel` (head-to-head).

- **Melon, not wheat — the static analysis was wrong.** RULES.md argues wheat because
  it never floors ($351k extractable) while melon floors after 159 units. But depth is
  unreachable: a season's labour yields only ~720 wheat or ~320 melons, and at *those*
  volumes melon earns ~$31k to wheat's ~$15k even after crashing to the $1 floor. This
  only showed up in head-to-head duels, never in the price tables.
- **Cap acreage at ~15 tiles.** Melon's curve is `sq` above I0, so supply hurts
  superlinearly: 15 tiles → $30.9k, 25 → $26.6k, 30 → $25.9k. Planting more earns less.
- **Crew of 3**, because crew size is what drives acreage — not to save hire cost.
- **Melon is dominant, not just better.** Payoff matrix (mean own final money):

  | | vs melon | vs wheat |
  |---|---|---|
  | **melon** | $14,249 | $30,880 |
  | **wheat** | $13,094 | $12,304 |

- **Zero seed variance.** Continuously-occupied tiles spawn no weeds and no town shop
  demands melon, so melon results are identical across seeds. Wheat ranges $12.1–13.2k.
- **Per-turn cost:** mean 0.2ms, p99 0.59ms against the 1s budget.

### Methodology note

Tuning against weak opponents optimises *absolute earnings*, which is the wrong
objective — the ladder rewards beating strong opponents competing for the same market.
`harness.duel` loads independent module copies so two configs of the same file can
fight. Several conclusions flipped when measured this way.

### Known inefficiencies (Phase 4 targets)

From the diagnostic report, in priority order:

1. **2.9 wheat per seed against a possible 4.0** — roughly a quarter of yield is lost
   to missed watering days.
2. **27.7% of unit-actions are PASS while plants go unwatered.** Units are idle at the
   same time work exists, which points at the `MAX_TASK_DIST` cutoff refusing
   assignments rather than at too little labor. Best single lever.
3. **46% of actions are walking.** Assignment is greedy and recomputed per turn with
   no routing or commitment.
