#!/usr/bin/env python3
"""Claude's estimate behind /nuclear-hack: the chance that, between 8 Oct 2026 and the end of
2030, a nuclear-armed state confirms (or major outlets report, citing officials) that a cyber
intrusion compromised part of a nuclear command, control and communications (NC3) system.

Each pathway is a yearly rate of public, qualifying reports. Rates are Claude's judgment, anchored
on the record: about two decades of state cyber operations, many leaks about other targets, and
no clear qualifying NC3 case. Re-run with:

    python3 scripts/nc3_hack_model.py

Notes in docs/nc3-hack-model.md. Only the standard library is used.
"""
import math, random

N = 200_000
random.seed(7)
Z90 = 1.2816  # z-score of the 90th percentile
YEARS = (2031 - 2026.77)  # 8 Oct 2026 to 31 Dec 2030


def lognormal(median, p90):
    return median * math.exp(random.gauss(0, 1) * math.log(p90 / median) / Z90)


def beta_mean(mean, strength=20):
    return random.betavariate(mean * strength, (1 - mean) * strength)


# Peacetime pathways: (median reports per year, P90), before the AI multiplier.
PATHWAYS = {
    # A state hacks a rival's NC3 and its own officials leak or claim it
    # (closest past case: the 2017 "left of launch" reporting on North Korean missiles).
    "attacker_leak": (0.006, 0.025),
    # The victim's own government confirms it, or an audit, court case or whistleblower does.
    "victim_disclosure": (0.003, 0.015),
    # A backdoor or implant found in a component bought for an NC3 system.
    "supply_chain": (0.003, 0.015),
}

# The record: about 20 years of state cyber operations (2006-2026) with no clear qualifying
# report. Each draw is weighted by how likely that silence was at its pre-AI rate.
RECORD_YEARS = 20

# Frontier AI (Mythos-class bug finding) multiplies how often NC3 gets compromised.
AI_MULT = (1.5, 3.0)

# A war in the window between nuclear powers, or one directly involving one (China and the US
# over Taiwan, Russia and NATO, a major India–Pakistan war), and the chance it produces a
# qualifying report of an NC3 hack.
P_WAR = 0.15
P_REPORT_GIVEN_WAR = (0.15, 0.4)


def draw():
    base = sum(lognormal(*PATHWAYS[k]) for k in PATHWAYS)
    rate = base * lognormal(*AI_MULT)
    p_peace = 1 - math.exp(-rate * YEARS)
    war = random.random() < beta_mean(P_WAR)
    p_war = min(lognormal(*P_REPORT_GIVEN_WAR), 1.0) if war else 0.0
    weight = math.exp(-base * RECORD_YEARS)
    return 1 - (1 - p_peace) * (1 - p_war), p_peace, p_war, rate, weight


def weighted_quantile(pairs, q):
    pairs.sort()
    total, acc = sum(w for _, w in pairs), 0.0
    for x, w in pairs:
        acc += w
        if acc >= q * total:
            return x


def main():
    draws = [draw() for _ in range(N)]
    for label, weighted in (("prior only", False), ("after the 20-year record", True)):
        w = [d[4] if weighted else 1.0 for d in draws]
        tw = sum(w)
        mean = lambda i: sum(d[i] * wi for d, wi in zip(draws, w)) / tw
        rates = [(d[3], wi) for d, wi in zip(draws, w)]
        print(f"{label}:")
        print(f"  P(qualifying report by end of 2030): {mean(0):.3f}")
        print(f"    peacetime pathways alone:          {mean(1):.3f}")
        print(f"    war pathway alone:                 {mean(2):.3f}")
        print(f"    peacetime rate per year: P10 {weighted_quantile(rates, 0.1):.4f}, "
              f"median {weighted_quantile(rates, 0.5):.4f}, P90 {weighted_quantile(rates, 0.9):.4f}")


if __name__ == "__main__":
    main()
