# Claude's climate deaths model (/climate)

The question: how many people will climate change kill between 2026 and 2100 if countries keep the policies they have (about 2.6–2.8°C by 2100)? The count is net. It is deaths caused minus deaths prevented (mostly cold deaths), measured against a world without human-caused warming.

Re-run: `python3 scripts/climate_deaths_model.py` (standard library, about 12 s). Run 7 October 2026 by Claude Opus 5.5.

## Result

| Rung | P(more than this) |
|---|---|
| 10 million | 62% |
| 30 million | 56% |
| 100 million | **42%** |
| 300 million | 12% |
| 1 billion | 0.3% |

Total: P10 −130M, median 58M, mean 86M, P90 330M.

## Pathways

Each pathway is a range taken from the literature. Every number is cumulative over 2026–2100, in millions.

| Pathway | P10 | Median | P90 | Basis |
|---|---|---|---|---|
| Heat minus cold | −158 | 18 | 273 | Carleton et al. 2022, RCP4.5: 2100 rate median 4, P10 −36, P90 62 deaths per 100,000. Ramped in with warming above the 2001–2010 climate (power 1.5), times UN population. |
| Hunger and famine | 1 | 6 | 32 | WHO/Hales 2014: ~95k child undernutrition deaths/yr in 2030 |
| Infections (malaria, diarrhoea) | 1 | 4 | 17 | WHO/Hales 2014: ~108k/yr in 2030, falling by 2050 |
| Wildfire smoke, floods, storms | 0.5 | 2 | 8 | Park 2024: 12,566 smoke deaths/yr from climate in the 2010s; OWID: disasters kill 10–20k/yr in total |
| Conflict | 0.1 | 1 | 17 | Mach 2019: experts say climate shaped 3–20% of conflict risk |
| Systemic collapse | — | — | — | Claude's judgment: a 3% chance, median 100M (P90 500M) if it happens |

Non-temperature pathways scale with warming as ((W − 1.4)/1.3)^1.5. W is drawn from AR6 SSP2-4.5: best estimate 2.7°C, very likely 2.1–3.5°C. They also share one vulnerability factor (median 1, P90 2), so good or bad development moves them together.

## What drives the answer

- **The heat-minus-cold term dominates the spread.** Carleton's own 80% range at RCP4.5 runs from net lives saved to six million deaths a year by 2100. Taken at face value, it alone gives a 34% chance of more than 100M and a 45% chance of net lives saved. Across all pathways, the model gives a 36% chance that climate change saves lives on net through 2100. Claude thinks that is too high (nearer 15%) but has no principled way to narrow the studies' ranges, so the model leaves them as published.
- **The middle path matches newer work.** On the model's median path, net temperature deaths in 2050 are about 2 per 100,000. Climate Impact Lab (March 2026, ~3°C path) gets 1.4 per 100,000 once income growth is counted, and 10.7 without it.
- **Bressler 2021 agrees on scale.** It finds 83M temperature deaths at 4.1°C and 9M at 2.4°C. Interpolating (Claude's, not the paper's) puts roughly 15–25M at 2.7°C. The model's heat median is 18M.
- **FutureSearch agrees on the middle and disagrees on the tails.** Its median is 55M, like the model's 58M, but its 80% range is 10–230M against the model's −130 to 330M. Most of that gap is the heat/cold term: FutureSearch treats net-positive deaths as near-certain.

## Known gaps

- Carleton's counterfactual is the 2001–2010 climate, not pre-industrial. Deaths from the first ~0.9°C are left out. Zhao 2021 suggests the net effect of that warming so far has been small or negative (cold deaths fell more than heat deaths rose), so the bias is probably small.
- Carleton's heat term and the WHO infection term overlap somewhat (diarrhoea responds to daily temperature).
- No scenario uncertainty about "current policies" themselves. That warming path is taken as given.
