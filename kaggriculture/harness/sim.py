"""Quiet env construction + match running.

`import kaggle_environments` eagerly imports every registered environment,
including open_spiel, which spews several hundred lines of unknown-game
warnings. Those come from C++ writing straight to fd 1/2, so
contextlib.redirect_stdout does nothing - we have to dup2 the file
descriptors themselves for the duration of the import.
"""
import contextlib
import os
import sys


@contextlib.contextmanager
def _silence_fds():
    sys.stdout.flush()
    sys.stderr.flush()
    devnull = os.open(os.devnull, os.O_WRONLY)
    saved = (os.dup(1), os.dup(2))
    try:
        os.dup2(devnull, 1)
        os.dup2(devnull, 2)
        yield
    finally:
        sys.stdout.flush()
        sys.stderr.flush()
        os.dup2(saved[0], 1)
        os.dup2(saved[1], 2)
        for fd in (devnull, *saved):
            os.close(fd)


with _silence_fds():
    import kaggle_environments
    from kaggle_environments import make
    from kaggle_environments.envs.kaggriculture import kaggriculture as K

ENV_NAME = "kaggriculture"


def g(obj, key, default=None):
    """kaggle_environments hands back Struct (dict subclass) or plain dicts."""
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def make_env(seed=None, config=None, debug=False):
    cfg = dict(config or {})
    if seed is not None:
        cfg["seed"] = int(seed)
    return make(ENV_NAME, configuration=cfg, debug=debug)


def resolve_agent(spec):
    """'random' / 'starter' / 'pass' stay strings; paths are made absolute."""
    if callable(spec):
        return spec
    if isinstance(spec, str) and spec.endswith(".py"):
        return os.path.abspath(spec)
    return spec


def money_series(env):
    """[[p0_money_per_step], [p1_money_per_step]] straight off the replay."""
    out = [[], []]
    for step in env.steps:
        farms = g(g(step[0], "observation", {}), "farms", None)
        if not farms:
            continue
        for i in range(2):
            out[i].append(float(g(farms[i], "money", 0.0)))
    return out


def market_series(env):
    """{product: [price_per_step]} and {product: [inventory_per_step]}."""
    prices, inventory = {}, {}
    for step in env.steps:
        market = g(g(step[0], "observation", {}), "market", None)
        if not market:
            continue
        for item, val in (g(market, "prices", {}) or {}).items():
            prices.setdefault(item, []).append(val)
        for item, val in (g(market, "inventory", {}) or {}).items():
            inventory.setdefault(item, []).append(val)
    return prices, inventory


def final_rewards(env):
    return [float(g(s, "reward", 0.0) or 0.0) for s in env.steps[-1]]
