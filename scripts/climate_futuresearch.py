# FutureSearch run behind /climate (docs/climate-futuresearch-2026-11-18.md).
# Needs FUTURESEARCH_API_KEY and the futuresearch package: python3 scripts/climate_futuresearch.py out.json
import asyncio, json, sys
from pandas import DataFrame
from futuresearch.ops import forecast

COMMON = ("Assume the world follows the current policy trajectory: climate policies already in place as of 2026 are kept, "
 "but not strengthened (roughly 2.6-2.9°C of warming above pre-industrial by 2100, per Climate Action Tracker and the UNEP "
 "Emissions Gap Report 'current policies' scenarios). Count net excess deaths attributable to human-caused climate change, "
 "relative to a counterfactual world without human-caused warming: deaths from heat, undernutrition and famine, "
 "climate-sensitive infectious disease, floods, storms, wildfire smoke, conflict or displacement where these are causally "
 "attributable to climate change, and deaths from any climate-driven collapse of ecosystems the food supply depends on "
 "(for example ocean food webs, pollinators, or several major breadbaskets failing at once), minus cold deaths avoided by warming. "
 "Judge by the best scientific estimate that would be available at the end of the period. Question asked on 18 November 2026.")

ROWS = [
 {"key": "by2100",
  "question": "Under the current policy trajectory, how many people will die from climate change in total between 1 January 2026 and 31 December 2100?",
  "resolution_criteria": COMMON,
  "thresholds": ["more than 100 million", "more than 300 million", "more than 500 million", "more than 1 billion", "more than 2 billion"]},
 {"key": "decade",
  "question": "Under the current policy trajectory, what is the largest number of people climate change will kill within any single calendar decade (the 2030s, 2040s, 2050s, 2060s, 2070s, 2080s or 2090s, each 1 January of year 0 to 31 December of year 9)?",
  "resolution_criteria": COMMON + " Resolves on the deadliest single decade among those seven.",
  "thresholds": ["more than 10 million in one decade", "more than 30 million in one decade", "more than 100 million in one decade", "more than 300 million in one decade", "more than 1 billion in one decade"]},
]

OUT = sys.argv[1]  # read before the paid run, so a missing path fails fast

async def main():
    df = DataFrame([{k: v for k, v in r.items() if k != "key"} for r in ROWS])
    res = await forecast(input=df, forecast_type="thresholded", thresholds_field="thresholds", effort_level="high")
    out = res.data.copy()
    out.insert(0, "key", [r["key"] for r in ROWS])
    out.to_json(OUT, orient="records", indent=1, default_handler=str)
    print(out.drop(columns=[c for c in out.columns if c in ("rationale",)]).to_string())

asyncio.run(main())
