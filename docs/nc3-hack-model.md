# Claude's nuclear command hack model (/nuclear-hack)

The question: between 8 October 2026 and 31 December 2030, will the government of a nuclear-armed state publicly confirm, or will a major outlet (Reuters, AP, NYT, WaPo, WSJ, FT, BBC, Guardian) report citing current or former officials, that a cyber intrusion compromised part of a nuclear command, control and communications (NC3) system? Early warning, launch authorisation and nuclear-forces communications count, including through the supply chain. Unclassified administrative networks of nuclear agencies and civil nuclear power do not.

Re-run: `python3 scripts/nc3_hack_model.py` (standard library, about 2 s). Run 8 October 2026 by Claude Opus 5.5.

## Result

**14%** after updating on the record (17% before it).

| Part | Chance |
|---|---|
| Peacetime pathways | 12% |
| A war that produces a report | 3% |

## Pathways

Each pathway is a yearly rate of public, qualifying reports, before AI. These are Claude's judgment: there is no clean base rate, because no case has yet qualified.

| Pathway | Median per year | P90 | Why |
|---|---|---|---|
| Attacker's officials leak or claim it | 0.006 | 0.025 | Leaks about offensive cyber are common (Iran's missile computers in 2019, Russia's grid in 2019), but the nearest NC3 case is the 2017 "left of launch" reporting on North Korean missile tests, which was about missiles, not command systems. |
| Victim confirms it | 0.003 | 0.015 | Governments confirm breaches of business networks (NNSA in 2020 and 2025) and say mission systems were untouched. An audit, court case or whistleblower could break that. |
| Supply chain find | 0.003 | 0.015 | Chatham House lists supply-chain weaknesses as a common route in. Counterfeit parts have turned up in US weapons before; a deliberate implant in NC3 has not been reported. |

- **AI multiplier:** median ×1.5, P90 ×3, on all three. Frontier models now find serious bugs at scale (Glasswing: over 10,000 high or critical bugs, 75 of 530 reported ones patched by May 2026). NC3 is mostly isolated and old, which blunts this.
- **War:** 15% chance of a war in the window between nuclear powers or directly involving one (China and the US over Taiwan, Russia and NATO, a major India–Pakistan war), and a median 15% chance (P90 40%) that it produces a qualifying report.
- **The record:** about 20 years of state cyber operations (2006–2026) with no qualifying report. Each draw is weighted by the chance of that silence at its pre-AI rate. This pulls the answer from 17% to 14%.

## What drives the answer

- **Disclosure, not compromise, is the bottleneck.** The question needs a confirmation or a sourced report. A compromise that stays secret counts for nothing, and NC3 compromises are among the most closely held secrets states have.
- **The attacker-leak pathway is the biggest.** Officials brag about offensive operations more than they admit defensive failures.
- **FutureSearch agrees.** Its high-effort run gives 13%, from the same reading: a near-zero record, with business-network breaches at NNSA not counting.

## Known gaps

- Borderline reports are the main resolution risk. A report that hackers reached a missile programme, a nuclear lab, or a contractor could be read either way.
- Leaks about attacks on non-nuclear states (Iran) never count, even if the target is a weapons programme.
- Rates are judgment calls. Halving or doubling all three peacetime medians moves the answer to 10% or 21%.
