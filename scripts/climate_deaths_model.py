#!/usr/bin/env python3
"""Claude's estimate behind /climate: how many people climate change kills, 2026-2100,
if the world keeps the policies it has (about 2.7C by 2100).

Adds up deaths by pathway, each a range drawn from the literature, and reports
how often the total clears each rung of the ladder. Re-run with:

    python3 scripts/climate_deaths_model.py

Counts net excess deaths (heat deaths minus cold deaths avoided), against a world
without human-caused warming. Notes in docs/climate-deaths-model.md.
Only the standard library is used.
"""
import math, random

N = 200_000
random.seed(7)
Z90 = 1.2816  # z-score of the 90th percentile


def two_piece(median, p10, p90):
    """Normal with different spreads either side of the median, matched to P10 and P90."""
    z = random.gauss(0, 1)
    return median + z * ((median - p10) if z < 0 else (p90 - median)) / Z90


def lognormal(median, p90):
    return median * math.exp(random.gauss(0, 1) * math.log(p90 / median) / Z90)


# Population (billions) by year, UN World Population Prospects 2024 medium variant, rounded.
POP = {2026: 8.3, 2050: 9.7, 2080: 10.3, 2100: 10.2}


def pop(year):
    ys = sorted(POP)
    for a, b in zip(ys, ys[1:]):
        if a <= year <= b:
            return POP[a] + (POP[b] - POP[a]) * (year - a) / (b - a)
    return POP[ys[-1]]


# Warming path (C above pre-industrial) under current policies: ~1.4 now, ~2.0 by 2050, ~2.7 by 2100.
def warming(year, w2100):
    if year <= 2050:
        return 1.4 + (2.0 - 1.4) * (year - 2026) / 24
    return 2.0 + (w2100 - 2.0) * (year - 2050) / 50


YEARS = range(2026, 2101)


def heat_cold(rate_2100, w2100):
    """Carleton et al. (2022): net temperature deaths per 100,000 in 2100 under RCP4.5, measured
    against the 2001-2010 climate (~0.9C). Ramped in with warming above that, convex (power 1.5)."""
    base = 0.9
    total = 0.0
    for y in YEARS:
        share = max(0.0, (warming(y, w2100) - base) / (w2100 - base)) ** 1.5
        total += rate_2100 * share * pop(y) * 1e9 / 1e5
    return total / 1e6  # millions


def run():
    draws = []
    parts = {k: [] for k in ["heat_cold", "food", "disease", "fire_flood_storm", "conflict", "cascade"]}
    for _ in range(N):
        # Warming by 2100: AR6 SSP2-4.5 best estimate 2.7C, very likely 2.1-3.5C (P5-P95).
        w = two_piece(2.7, 2.7 - 0.6 * Z90 / 1.645, 2.7 + 0.8 * Z90 / 1.645)
        w = max(w, 1.8)
        # Carleton RCP4.5: median 4, P10 -36, P90 62 deaths per 100,000 in 2100. Already spans
        # climate-model spread, so it is not scaled by w again.
        hc = heat_cold(two_piece(4, -36, 62), 2.7)
        # Other pathways (millions, cumulative), scaled by warming above today's 1.4C and a shared
        # vulnerability factor (how well poor countries develop and adapt), so they move together.
        scale = ((w - 1.4) / (2.7 - 1.4)) ** 1.5 * lognormal(1, 2)
        food = lognormal(6, 25) * scale        # WHO/Hales 2014: ~95k child undernutrition deaths/yr in 2030
        disease = lognormal(4, 12) * scale     # WHO/Hales 2014: malaria + diarrhoea ~108k/yr in 2030, falling by 2050
        ffs = lognormal(2, 6) * scale          # Park 2024: 12,566 fire-smoke deaths/yr from climate in the 2010s
        conflict = lognormal(1, 15) * scale    # Mach 2019: climate in 3-20% of conflict risk
        # Cascade: a systemic crisis (multi-breadbasket failure, collapse-driven famine and war)
        # that the pathway studies cannot see. Claude's judgment: 3%, median 100M if it happens.
        cascade = lognormal(100, 500) if random.random() < 0.03 else 0.0
        total = hc + food + disease + ffs + conflict + cascade
        draws.append(total)
        for k, v in zip(parts, [hc, food, disease, ffs, conflict, cascade]):
            parts[k].append(v)
    return draws, parts


def pct(xs, q):
    s = sorted(xs)
    return s[int(q * (len(s) - 1))]


if __name__ == "__main__":
    draws, parts = run()
    print(f"Total, millions: P10 {pct(draws, .1):.0f} · median {pct(draws, .5):.0f} · mean {sum(draws)/N:.0f} · P90 {pct(draws, .9):.0f}")
    for t in [10, 30, 100, 300, 1000]:
        print(f"  P(> {t:>4}M) = {sum(d > t for d in draws) / N:.1%}")
    print("By pathway, millions (P10 / median / P90):")
    for k, xs in parts.items():
        print(f"  {k:<17} {pct(xs, .1):6.1f} {pct(xs, .5):6.1f} {pct(xs, .9):7.1f}   mean {sum(xs)/N:6.1f}")
