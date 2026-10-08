import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import {
  TopicDashboard,
  type GroupResolution,
  type Market,
} from "@/components/TopicDashboard";
import { ChartVote } from "@/components/ChartVote";
import { SuggestionsPanel } from "@/components/SuggestionsPanel";
import { VotedCard } from "@/components/VotedCard";
import { Cite, SectionLabel, Sources, type Statement } from "@/components/Citations";
import { SERIF } from "@/lib/serif";
import { median, probabilityColor, probabilityWord } from "@/lib/probabilityWords";

const TOPIC = "climate";

const GROUP_TITLES: Record<string, string> = {
  climate_heatwave_1m: "A heat wave kills a million people in a month, before 2050",
  climate_disaster_10m: "A natural disaster kills 10 million people, before 2101",
  global_catastrophe_2100: "A tenth of humanity dies within five years, by 2100 (any cause)",
  catastrophe_climate_cause: "If that happens, climate change is the main cause",
  warming_3_6c: "Five years in a row above 3.6°C, before 2100",
  warming_2c_2037: "A year at 2°C above pre-industrial, by 2037",
};

const CLIMATE_GROUPS = Object.keys(GROUP_TITLES);

const GROUP_RESOLUTION: Record<string, GroupResolution> = {
  climate_heatwave_1m: {
    summary: "One million deaths within 30 days, credibly reported as caused by a heat wave. Fires, conflict and famine don't count.",
    footnotes: [{
      id: 0, source: "Metaculus", url: "https://www.metaculus.com/questions/30583/",
      fullText: "This question will resolve as Yes if, before January 1, 2050, one million deaths have occurred in the span of 30 days or less that credible sources have reported to be due to a heat wave. Metaculus may wait up to two years after a potentially qualifying heat wave for investigations and reporting to complete in order to assess whether a heat wave killed at least one million people, and that two year period may extend past the resolution date, if necessary. The deaths must be a direct result of excessive heat acting on humans. Indirect effects, such as fires, violent conflict, or famine, do not count.",
    }],
  },
  climate_disaster_10m: {
    summary: "A single natural disaster, including a drought-driven famine, documented as killing 10 million people. Earthquakes and eruptions count too; pandemics don't.",
    footnotes: [{
      id: 0, source: "Metaculus", url: "https://www.metaculus.com/questions/44640/",
      fullText: "This question will resolve as Yes if, after this question opens and before January 1, 2101, a single natural disaster event occurs and is documented as causing 10,000,000 or more human deaths. For purposes of this question, a natural disaster includes: Any weather event, such as extreme temperatures. Floods. Earthquakes. Tornados. Cyclones. Winter storms. Volcanic eruptions. Droughts. Wildfires (regardless of the cause). Please note that this does not include biological disasters such as pandemics. The question may resolve based on published excess mortality research (e.g., excess mortality from a famine caused by a drought). If a range is provided, the question resolves based on the midpoint of the range. Climate change-related gradual processes (such as sea-level rise, long-term warming trends, or ecosystem changes) do not qualify unless they are linked to a specific, identifiable natural disaster event.",
    }],
  },
  global_catastrophe_2100: {
    summary: "World population falls at least 10% within five years, for any reason. Most forecasters on this question are thinking about AI, nuclear war and pandemics.",
    footnotes: [{
      id: 0, source: "Metaculus", url: "https://www.metaculus.com/questions/1493/",
      fullText: "This question will resolve as Yes if the human population (on Earth, and possibly elsewhere) decreases by at least 10% in any period of 5 years or less. Years are here defined as consecutive calendar years.",
    }],
  },
  catastrophe_climate_cause: {
    summary: "Conditional on the catastrophe above: is it principally due to climate change or geoengineering? Multiply the two for the chance climate kills a tenth of humanity.",
    footnotes: [{
      id: 0, source: "Metaculus", url: "https://www.metaculus.com/questions/1500/",
      fullText: "If a global catastrophe happens before 2100, will it be principally due to human-made climate change, or the use of geoengineering as a deliberate large-scale intervention in the Earth's climate system? In the headline question to this series, we defined a global catastrophe as a 10% decrease in the world population in any period of 5 years or less. This question resolves ambiguously if no such global catastrophe occurs. The question results positively if a human-made climate change or geoengineering catastrophe occurs that claims at least 10% in any period of 5 years or less before 2100. This catastrophe must be due to the direct effects of climate change that are generally believed very unlikely in a counterfactual world with little or no global warming but otherwise similar to ours. These include (but are not limited to) floods, extreme weather, the spreading of infectious disease, and the health effects of extreme heat. Finally, the effects due to the effects of the use of geoengineering that has been principally motivated to mitigate climate change risks, also count towards the population decline.",
    }],
  },
  warming_3_6c: {
    summary: "Five consecutive years each at least 3.6°C above 1861–1880 on NASA's record. That's well past the current-policies path, so this is the warming tail.",
    footnotes: [{
      id: 0, source: "Metaculus", url: "https://www.metaculus.com/questions/1539/",
      fullText: "This question will resolve as Yes if, before January 1, 2100, there is a 5-year period in which the average global temperature in each year is at least 3.6˚C greater than the average global temperature relative to the period 1861–1880, according to NASA. Note that the data in the link is normalised relative to the 1951-1980 baseline, on which 1880 stands at -0.2. Therefore, the critical value to look for with this specific NASA dataset will be 3.4˚C.",
    }],
  },
  warming_2c_2037: {
    summary: "The Long Bets wager between John Mitchell and Zeke Hausfather: any calendar year through 2037 more than 2°C above 1850–1899 on Berkeley Earth.",
    footnotes: [{
      id: 0, source: "Metaculus", url: "https://www.metaculus.com/questions/9570/",
      fullText: "John Mitchell will win the bet if the Berkeley Earth Global Average Temperature Anomaly with Sea Ice Temperature Inferred from Air Temperatures dataset reports an annual (January through December) temperature anomaly of over 2C relative to the 1850-1899 baseline period on or before the published value corresponding to the calendar year 2037. Zeke Hausfather will win the bet if an annual temperature anomaly of 2C relative to the 1850-1899 baseline period does not occur before the published calendar year 2037 value. If the Long Now Foundation declares John Mitchell the winner of the bet, then this question resolves positively.",
    }],
  },
};

// The ladder: chance that climate change kills more than each number of people, 2026–2100,
// on current policies (net of cold deaths avoided).
const RUNGS = [
  { m: 10, label: "10 million" },
  { m: 30, label: "30 million" },
  { m: 100, label: "100 million" },
  { m: 300, label: "300 million" },
  { m: 1000, label: "1 billion" },
] as const;
const HEADLINE_RUNG = 100;

// FutureSearch, one run on 7 Oct (docs/climate-futuresearch-2026-10-07.md), thresholded mode, high effort.
const FUTURESEARCH_URL = "https://github.com/Goodheart-Labs/globalriskodds/blob/main/docs/climate-futuresearch-2026-10-07.md";
const FUTURESEARCH: Record<number, number> = { 10: 0.93, 30: 0.67, 100: 0.32, 300: 0.1, 1000: 0.02 };
const FUTURESEARCH_2050: Record<number, number> = { 3: 0.9, 10: 0.53, 30: 0.14, 100: 0.02 };

// Claude's model: scripts/climate_deaths_model.py, run 7 Oct (docs/climate-deaths-model.md).
const MODEL_URL = "https://github.com/Goodheart-Labs/globalriskodds/blob/main/docs/climate-deaths-model.md";
const MODEL: Record<number, number> = { 10: 0.617, 30: 0.564, 100: 0.415, 300: 0.122, 1000: 0.003 };

// Each row in millions: middle, then the 80% range (P10–P90). Order matches the table.
const PATHWAYS: { label: string; mid: number; lo: number; hi: number; cite: string[] }[] = [
  { label: "Heat, minus cold deaths avoided", mid: 18, lo: -160, hi: 270, cite: ["carleton", "cil"] },
  { label: "Hunger and famine", mid: 6, lo: 1, hi: 32, cite: ["who"] },
  { label: "Malaria, diarrhoea and other infections", mid: 4, lo: 1, hi: 17, cite: ["who"] },
  { label: "Wildfire smoke, floods and storms", mid: 2, lo: 0.5, hi: 8, cite: ["park", "disasters"] },
  { label: "Conflict", mid: 1, lo: 0.1, hi: 17, cite: ["mach"] },
];
const MODEL_TOTAL = { mid: 58, lo: -130, hi: 330 };

const MIDDLE_COLOR = "#B45309";
const MODEL_COLOR = "#0EA5E9";
const FUTURESEARCH_COLOR = "#7C3AED";

const CAT_URL = "https://climateactiontracker.org/press/release-global-update-2025/";
const UNEP_URL = "https://news.un.org/en/story/2025/11/1166255";
const IPCC_URL = "https://www.ipcc.ch/report/ar6/wg1/downloads/report/IPCC_AR6_WGI_SPM.pdf";
const LANCET_URL = "https://lancetcountdown.org/2025-report/";
const OWID_TEMP_URL = "https://ourworldindata.org/part-one-how-many-people-die-from-extreme-temperatures-and-how-could-this-change-in-the-future";
const OWID_DISASTERS_URL = "https://ourworldindata.org/natural-disasters";
const WHO_URL = "https://www.who.int/news-room/fact-sheets/detail/climate-change-and-health";
const BRESSLER_URL = "https://www.nature.com/articles/s41467-021-24487-w";
const CARLETON_URL = "https://academic.oup.com/qje/article/137/4/2037/6571943";
const CIL_URL = "https://impactlab.org/wp-content/uploads/2026/03/CIL_MortalityReport_2026.pdf";
const PARK_URL = "https://www.nature.com/articles/s41558-024-02149-1";
const MACH_URL = "https://www.nature.com/articles/s41586-019-1300-6";
const WYMAN_URL = "https://www.oliverwyman.com/our-expertise/insights/2024/jan/quantifying-climate-change-impact-on-human-health.html";

const STATEMENTS: Statement[] = [
  { id: "cat", text: "\"Warming under governments' policies and climate action – the CAT's Current Policies Pathway – has seen a small 0.1˚C drop, from 2.7°C to 2.6°C.\"", source: "Climate Action Tracker, Nov 2025", url: CAT_URL },
  { id: "unep", text: "The UNEP Emissions Gap Report 2025 puts warming this century at 2.8°C on current policies: \"Those based on current policies are 2.8°C, compared to 3.1°C last year.\"", source: "UN News, Nov 2025", url: UNEP_URL },
  { id: "ipcc", text: "Warming in 2081–2100 is very likely to be higher \"by 2.1°C to 3.5°C in the intermediate GHG emissions scenario (SSP2-4.5)\" than in 1850–1900.", source: "IPCC AR6, Summary for Policymakers", url: IPCC_URL },
  { id: "lancet", text: "\"Failure to curb the warming effects of climate change has seen the rate of heat-related deaths surge 23% since the 1990s, to 546,000 a year.\"", source: "Lancet Countdown 2025", url: LANCET_URL },
  { id: "cold", text: "\"Globally, cold deaths are 9 times higher than heat-related ones.\" (Summarising Zhao et al. 2021: 8.5% of deaths cold-related, 0.9% heat-related.)", source: "Our World in Data", url: OWID_TEMP_URL },
  { id: "disasters", text: "\"Disasters — from earthquakes and storms to floods and droughts — kill approximately 10,000 to 20,000 people per year globally (excluding temperature deaths, which are unevenly counted).\" \"In the 20th century, more than a million deaths per year were not uncommon.\"", source: "Our World in Data", url: OWID_DISASTERS_URL },
  { id: "who", text: "\"Between 2030 and 2050, climate change is expected to cause approximately 250 000 additional deaths per year, from undernutrition, malaria, diarrhoea and heat stress alone.\"", source: "WHO fact sheet, Oct 2023", url: WHO_URL },
  { id: "bressler-83", text: "\"In total, we find that there are 83 million projected cumulative excess deaths between 2020 and 2100 in the central estimate in the DICE baseline emissions scenario\", a scenario \"that results in 4.1 °C warming above preindustrial temperatures by 2100\".", source: "Bressler 2021, Nature Communications", url: BRESSLER_URL },
  { id: "bressler-opt", text: "\"The number of temperature-related excess deaths falls from 83 million in the DICE baseline emissions scenario to 9 million in the DICE-EMR optimal emissions scenario\", which \"results in 2.4 °C warming by 2100\".", source: "Bressler 2021, Nature Communications", url: BRESSLER_URL },
  { id: "bressler-scope", text: "\"The mortality damage function only represents temperature-related mortality; it leaves out potentially important climate-mortality pathways such as the effect of climate change on infectious disease, civil and interstate war, food supply, and flooding.\"", source: "Bressler 2021, Nature Communications", url: BRESSLER_URL },
  { id: "carleton", text: "\"The mean estimate of the mortality effects of climate change falls from 73 deaths per 100,000 under RCP8.5 to 11 deaths per 100,000 under the emissions stabilization scenario of RCP4.5. For RCP4.5, the median end-of-century estimate is 4, and the 10th–90th percentile range is [−36, 62].\" These count heat deaths minus cold deaths avoided.", source: "Carleton et al. 2022, Quarterly Journal of Economics", url: CARLETON_URL },
  { id: "cil", text: "On a path to about 3°C, \"the global average change in net mortality with no income growth is 10.7 additional deaths per 100,000 people compared to a global average of 1.4 additional deaths per 100,000 people when accounting for income growth\" (2040–2059 average).", source: "Climate Impact Lab, Mar 2026", url: CIL_URL },
  { id: "park", text: "\"Of the 46,401 (1960s) to 98,748 (2010s) annual fire PM2.5 mortalities, 669 (1.2%, 1960s) to 12,566 (12.8%, 2010s) were attributed to climate change.\"", source: "Park et al. 2024, Nature Climate Change", url: PARK_URL },
  { id: "mach", text: "\"Across the experts, best estimates are that 3–20% of conflict risk over the last century has been influenced by climate variability or change.\"", source: "Mach et al. 2019, Nature", url: MACH_URL },
  { id: "wyman", text: "A World Economic Forum report with Oliver Wyman: \"we project as many as 14.5 million additional deaths and $12.5 trillion in economic losses by 2050\", with floods \"accounting for 8.5 million deaths by 2050\".", source: "Oliver Wyman, Jan 2024", url: WYMAN_URL },
  { id: "model", text: `Claude's model adds up the pathways above, each a range taken from the studies, and finds a ${pct(MODEL[100])} chance of more than 100 million net deaths from 2026 to 2100 on current policies (middle ${MODEL_TOTAL.mid} million).`, source: "Claude Opus 5.5, 7 Oct 2026 · working ↗", url: MODEL_URL },
  { id: "cascade", text: "Claude's judgment: a 3% chance of a systemic crisis the pathway studies can't see (several breadbaskets failing at once, famine feeding war), killing about 100 million if it happens (80% range 20 million to 500 million).", source: "Claude Opus 5.5, 7 Oct 2026" },
];

function pct(x: number): string {
  if (x < 0.01) return x < 0.005 ? "<1%" : "1%";
  return `${Math.round(x * 100)}%`;
}

const millions = (m: number) => {
  const sign = m < 0 ? "−" : "";
  const a = Math.abs(m);
  if (a >= 1000) return `${sign}${a / 1000}B`;
  return `${sign}${a < 1 ? a : Math.round(a)}M`;
};

function Hero({ p }: { p: number }) {
  return (
    <header className="not-prose mx-auto mb-10 max-w-3xl text-center">
      <h1 className="mx-auto" style={SERIF}>Will climate change kill 100 million people?</h1>
      <p className="mt-2 text-base opacity-70">By 2100, if countries keep the policies they have now</p>
      <p className="mt-8 text-6xl sm:text-7xl leading-none tracking-tight" style={{ ...SERIF, color: probabilityColor(p) }}>
        {probabilityWord(p)}
      </p>
      <p className="mx-auto mt-4 max-w-xl text-lg text-balance">
        About {pct(p)} that climate change kills more than 100 million people between 2026 and 2100, counting the
        deaths it causes minus the cold deaths it prevents.
      </p>
    </header>
  );
}

function Marker({ at, color, shape, title }: { at: number; color: string; shape: "circle" | "diamond" | "square"; title: string }) {
  const base = "absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2";
  const style = { left: `${Math.min(Math.max(at, 0), 1) * 100}%` };
  if (shape === "square") return <span title={title} aria-label={title} className={`${base} border-2 border-base-content bg-base-100`} style={style} />;
  return (
    <span title={title} aria-label={title}
      className={`${base} ${shape === "circle" ? "rounded-full" : "rotate-45"} ring-2 ring-base-100`}
      style={{ ...style, backgroundColor: color }} />
  );
}

/** The ladder: one row per death toll, each showing both forecasts and their middle. */
function Ladder({ metaculusTail }: { metaculusTail: number | undefined }) {
  return (
    <figure className="not-prose mx-auto mb-14 max-w-3xl">
      <figcaption className="mb-3 text-center text-sm opacity-70">Chance that climate change kills more than…</figcaption>
      <div>
        {RUNGS.map((r) => {
          const mid = median([MODEL[r.m], FUTURESEARCH[r.m]]);
          const headline = r.m === HEADLINE_RUNG;
          return (
            <div key={r.m}
              className={`grid grid-cols-[5.5rem_1fr_3rem] items-center gap-3 border-b border-base-300 py-3 sm:grid-cols-[7rem_1fr_3.5rem] ${headline ? "bg-base-200/60" : ""}`}>
              <div className={`text-right text-sm sm:text-base ${headline ? "font-bold" : ""}`} style={SERIF}>{r.label}</div>
              <div className="relative h-6">
                <div className="absolute inset-x-0 top-1/2 h-px bg-base-content/20" />
                <div className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-r"
                  style={{ width: `${mid * 100}%`, backgroundColor: MIDDLE_COLOR, opacity: headline ? 0.85 : 0.45 }} />
                <Marker at={MODEL[r.m]} color={MODEL_COLOR} shape="circle" title={`Claude's model: ${pct(MODEL[r.m])}`} />
                <Marker at={FUTURESEARCH[r.m]} color={FUTURESEARCH_COLOR} shape="diamond" title={`FutureSearch: ${pct(FUTURESEARCH[r.m])}`} />
                {r.m === 1000 && metaculusTail !== undefined && (
                  <Marker at={metaculusTail} color="" shape="square" title={`Metaculus, a tenth of humanity within five years: ${pct(metaculusTail)}`} />
                )}
              </div>
              <div className={`text-right tabular-nums ${headline ? "text-xl font-bold" : "text-lg"}`} style={SERIF}>{pct(mid)}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 grid grid-cols-[5.5rem_1fr_3rem] gap-3 text-[10px] opacity-50 sm:grid-cols-[7rem_1fr_3.5rem]">
        <span />
        <div className="flex justify-between tabular-nums"><span>0%</span><span>50%</span><span>100%</span></div>
        <span />
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-5 rounded-r" style={{ backgroundColor: MIDDLE_COLOR }} />Middle of the two</span>
        <a href={MODEL_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: MODEL_COLOR }} />Claude's model ↗
        </a>
        <a href={FUTURESEARCH_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline">
          <span className="h-2.5 w-2.5 rotate-45" style={{ backgroundColor: FUTURESEARCH_COLOR }} />FutureSearch ↗
        </a>
        {metaculusTail !== undefined && (
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 border-2 border-base-content" />Metaculus: a tenth of humanity dies within five years from climate</span>
        )}
      </div>
    </figure>
  );
}

function Summary() {
  const c = (...ids: string[]) => <Cite ids={ids} statements={STATEMENTS} topic={TOPIC} />;
  return (
    <div className="not-prose mx-auto mb-14 max-w-[680px] space-y-4 text-[17px] leading-relaxed" style={SERIF}>
      <p>
        If countries keep the policies they have, the world warms about 2.6°C{c("cat")} to 2.8°C{c("unep")} by 2100.
        The matching IPCC scenario very likely lands between 2.1°C and 3.5°C.{c("ipcc")}
      </p>
      <p>
        Heat already kills about 546,000 people a year,{c("lancet")} but cold kills about nine times as many as
        heat,{c("cold")} so warming also saves lives. This page counts the deaths climate change causes minus the ones
        it prevents. Disasters kill 10,000 to 20,000 people a year, far fewer than in the 20th century.{c("disasters")}
      </p>
      <p>
        The WHO expects about 250,000 extra deaths a year between 2030 and 2050 from undernutrition, malaria,
        diarrhoea and heat stress alone.{c("who")} One model finds 83 million temperature deaths by 2100 on a path to
        4.1°C{c("bressler-83")} and 9 million at 2.4°C,{c("bressler-opt")} counting heat only.{c("bressler-scope")}{" "}
        Another puts net temperature deaths at 11 per 100,000 people a year by 2100 under moderate emissions, in a
        range from 36 fewer to 62 more.{c("carleton")} Getting richer matters a lot: on one estimate, income growth
        cuts the 2050 toll more than sevenfold.{c("cil")}
      </p>
      <p>
        Less-studied pathways are growing. Wildfire smoke deaths caused by climate change went from 669 a year in the
        1960s to 12,566 in the 2010s,{c("park")} and experts judge that climate shaped 3–20% of conflict risk over the
        last century.{c("mach")} At the high end, one consultancy projects 14.5 million deaths by 2050.{c("wyman")}
      </p>
      <p>
        Claude's model and FutureSearch both put the middle of the range near 60 million deaths.{c("model")} They differ
        on the tails. The model takes the studies' wide ranges at face value, which leaves about a one-in-three chance
        that warming saves more lives than it costs; FutureSearch treats that as close to impossible.
      </p>
    </div>
  );
}

/** Claude's working: where the deaths would come from, by pathway. */
function Pathways() {
  const c = (ids: string[]) => <Cite ids={ids} statements={STATEMENTS} topic={TOPIC} />;
  const range = (lo: number, hi: number) => `${millions(lo)} to ${millions(hi)}`;
  return (
    <section className="not-prose mx-auto mb-14 max-w-[680px]">
      <SectionLabel>Where the deaths would come from</SectionLabel>
      <p className="mt-2 text-sm opacity-70">Claude's model, deaths from 2026 to 2100 on current policies.</p>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-b border-base-content/40 text-left text-xs opacity-70">
            <th className="py-2 pr-2 font-normal">Pathway</th>
            <th className="py-2 pr-2 text-right font-normal">Middle</th>
            <th className="py-2 text-right font-normal">80% range</th>
          </tr>
        </thead>
        <tbody>
          {PATHWAYS.map((row) => (
            <tr key={row.label} className="border-b border-base-300">
              <td className="py-2 pr-2">{row.label}{c(row.cite)}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{millions(row.mid)}</td>
              <td className="py-2 text-right tabular-nums whitespace-nowrap">{range(row.lo, row.hi)}</td>
            </tr>
          ))}
          <tr className="border-b border-base-300">
            <td className="py-2 pr-2">A collapse the studies can't see{c(["cascade"])}</td>
            <td className="py-2 text-right text-xs opacity-80" colSpan={2}>3% chance, ~100M if so</td>
          </tr>
          <tr className="font-semibold">
            <td className="py-2 pr-2">Total{c(["model"])}</td>
            <td className="py-2 pr-2 text-right tabular-nums">{millions(MODEL_TOTAL.mid)}</td>
            <td className="py-2 text-right tabular-nums whitespace-nowrap">{range(MODEL_TOTAL.lo, MODEL_TOTAL.hi)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-xs opacity-60">
        The pathways are drawn together, so the total's range is not the sum of theirs. Negative numbers mean lives saved.
      </p>
    </section>
  );
}

function FutureSearchCard() {
  const big = (value: string, label: string) => (
    <div>
      <div className="text-4xl tabular-nums" style={SERIF}>{value}</div>
      <div className="mt-1 text-sm opacity-70">{label}</div>
    </div>
  );
  return (
    <VotedCard slot="climate:futuresearch">
      <div className="card-body">
        <h3 className="card-title text-lg mb-1">FutureSearch AI forecast</h3>
        <a href={FUTURESEARCH_URL} target="_blank" rel="noopener noreferrer" className="text-xs underline opacity-65 hover:opacity-100">7 October · reasoning ↗</a>
        <div className="my-6 grid grid-cols-2 gap-4">
          {big(pct(FUTURESEARCH[100]), "Over 100 million dead by 2100")}
          {big(pct(FUTURESEARCH_2050[10]), "Over 10 million dead by 2050")}
        </div>
        <p className="text-sm opacity-70">Its middle estimate for 2026–2100 is 55–60 million deaths.</p>
        <ChartVote slot="climate:futuresearch" mode="expanded" />
      </div>
    </VotedCard>
  );
}

/** Sits beside the FutureSearch card in the grid. */
function SuggestCard() {
  return (
    <div className="card min-w-0 bg-base-100">
      <div className="card-body">
        <h3 className="card-title text-lg mb-1">Suggest a market</h3>
        <Link to="/wishlist" className="text-xs underline opacity-65 hover:opacity-100">See all requests</Link>
        <div className="mt-4">
          <SuggestionsPanel standalone topic={TOPIC} placeholder="e.g. Will a famine kill a million people before 2040?" />
        </div>
      </div>
    </div>
  );
}

const simpleMarketsQuery = convexQuery(api.simple.getMarkets, {});

export const Route = createFileRoute("/climate")({
  staticData: { title: "Climate Deaths" },
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(simpleMarketsQuery);
  },
  component: ClimatePage,
});

function ClimatePage() {
  const { data } = useSuspenseQuery(simpleMarketsQuery);
  const markets = data as Market[];

  const p = median([MODEL[HEADLINE_RUNG], FUTURESEARCH[HEADLINE_RUNG]]);
  // Metaculus cross-check for the top rung: a tenth of humanity dies within five years (1493), times the
  // chance climate is the main cause if so (1500).
  const prob = (group: string) => markets.find((m) => m.chartGroup === group)?.probability;
  const anyCatastrophe = prob("global_catastrophe_2100");
  const climateCause = prob("catastrophe_climate_cause");
  const metaculusTail = anyCatastrophe !== undefined && climateCause !== undefined
    ? (anyCatastrophe / 100) * (climateCause / 100)
    : undefined;

  return (
    <TopicDashboard
      topic={TOPIC}
      title="Will climate change kill 100 million people?"
      markets={markets}
      groupTitles={GROUP_TITLES}
      groupResolutions={GROUP_RESOLUTION}
      groupKeys={CLIMATE_GROUPS}
      header={<><Hero p={p} /><Ladder metaculusTail={metaculusTail} /></>}
      voteMode="expanded"
      intro={<><Summary /><Pathways /><SectionLabel>Nearby questions</SectionLabel></>}
      extraCards={<><FutureSearchCard /><SuggestCard /></>}
      footer={<Sources statements={STATEMENTS} topic={TOPIC} />}
    />
  );
}
