import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import {
  TopicDashboard,
  type GroupResolution,
  type Market,
} from "@/components/TopicDashboard";
import { ChartVote } from "@/components/ChartVote";
import { SuggestionsPanel } from "@/components/SuggestionsPanel";
import { VotedCard } from "@/components/VotedCard";
import { CombinedChart, type ChartSeries } from "@/components/CombinedChart";
import { mergeMarketHistory } from "@/lib/marketPresentation";
import { median, probabilityColor, probabilityWord } from "@/lib/probabilityWords";
import { Cite, SectionLabel, Sources, type Statement } from "@/components/Citations";
import { SERIF } from "@/lib/serif";

const GROUP_TITLES: Record<string, string> = {
  plague_new_case_russia: "New pneumonic plague case in Russia",
  plague_irkutsk_cases: "Plague cases in Irkutsk Oblast by 1 November",
  plague_pathogen_named: "Russia names the cause of death by 1 November",
  plague_pheic: "WHO declares a plague emergency (PHEIC)",
  plague_pandemic: "WHO calls plague a pandemic in 2026",
  plague_us_pneumonic: "Pneumonic plague case in the US",
};

const PLAGUE_GROUPS = Object.keys(GROUP_TITLES);

const GROUP_RESOLUTION: Record<string, GroupResolution> = {
  plague_new_case_russia: {
    summary:
      "A lab-confirmed pneumonic plague case anywhere in Russia, not counting the lab worker. Cases reported only as \"plague\" don't count.",
    footnotes: [
      {
        id: 0,
        source: "Polymarket",
        url: "https://polymarket.com/event/confirmed-pneumonic-plague-case-in-russia-byptptpt",
        fullText:
          "This market will resolve to \"Yes\" if a confirmed case of pneumonic plague in a human is reported in the Russian Federation at any point between market creation and the specified date, 11:59 PM Moscow time. Otherwise, this market will resolve to \"No\". A \"confirmed case\" is a case explicitly identified by a qualifying source as laboratory-confirmed Yersinia pestis infection with pneumonic (pulmonary) involvement, or explicitly announced as a confirmed pneumonic plague case. Publication of the underlying laboratory results is not required. A bubonic or septicemic case that progresses to pneumonic plague qualifies. A case reported only as \"plague\" with no form specified, and a case described only as suspected or probable, do not qualify. The case must be distinct from the Irkutsk Anti-Plague Research Institute employee who reportedly passed away on October 1, 2026; subsequent confirmation, reclassification, or post-mortem testing of that patient will not qualify.",
      },
    ],
  },
  plague_irkutsk_cases: {
    summary:
      "Confirmed plague cases of any form in Irkutsk Oblast. The lab worker counts if confirmed after death, so 1+ is mostly a bet on her diagnosis; 2+ needs someone else.",
    footnotes: [
      {
        id: 0,
        source: "Kalshi",
        url: "https://kalshi.com/markets/kxplaguecount",
        fullText:
          "If the total number of human plague cases reported in Irkutsk Oblast during 2026 is at least 1, then the market resolves to Yes. Cases are determined at 10:00 AM ET on the Expiration Date (November 8). Only cases that Rospotrebnadzor, Russia's federal public health agency, confirms after Issuance and before November 1, 2026 count. Cases newly reported during the window between November 1 and Expiration do not count, even if they are backdated to the specified time period. A case is a human infection with Yersinia pestis (plague in any form) in Irkutsk Oblast, including a posthumous confirmation, and each infected person counts once. Suspected cases, and illness described as pneumonia of undetermined etiology, do not count.",
      },
    ],
  },
  plague_pathogen_named: {
    summary:
      "Rospotrebnadzor names a specific organism as the cause of the lab worker's pneumonia. \"Undetermined\" or \"not ruled out\" don't count.",
    footnotes: [
      {
        id: 0,
        source: "Kalshi",
        url: "https://kalshi.com/markets/kxirkutskpathogen",
        fullText:
          "If Rospotrebnadzor announces the identification of a specific pathogen as the cause of the fatal pneumonia of an Irkutsk Anti-Plague Research Institute employee before Nov 1, 2026, then the market resolves to Yes. Only an announcement by Rospotrebnadzor, Russia's federal public health agency, including its Irkutsk Oblast office, counts. It must name a specific organism, such as Yersinia pestis or another bacterium, virus or fungus identified by genus or species, as the cause of the employee's pneumonia or death. A generic description such as \"bacterial,\" \"viral\" or \"undetermined etiology\" does NOT count. Naming a pathogen as suspected, under investigation or not ruled out does NOT count. Ruling out a pathogen without naming the cause does NOT count.",
      },
    ],
  },
  plague_pheic: {
    summary:
      "The WHO declares a Public Health Emergency of International Concern covering plague. An Emergency Committee or a \"pandemic\" label alone doesn't count.",
    footnotes: [
      {
        id: 0,
        source: "Polymarket",
        url: "https://polymarket.com/event/russia-pneumonic-plague-declared-public-health-emergency-byptptpt",
        fullText:
          "This market will resolve to \"Yes\" if the World Health Organization officially declares a Public Health Emergency of International Concern covering plague, Yersinia pestis, pneumonic plague, or any plague outbreak between market creation and the specified date, 11:59 PM ET. Otherwise, this market will resolve to \"No\". Only a determination that constitutes a Public Health Emergency of International Concern under the International Health Regulations will qualify. Other designations will not be considered, including the convening of an Emergency Committee, a Disease Outbreak News publication, a grade assigned under the WHO Emergency Response Framework, and a characterization of the outbreak as a pandemic.",
      },
    ],
  },
  plague_pandemic: {
    summary:
      "The WHO explicitly calls plague a \"pandemic\" by 31 December. A PHEIC alone doesn't count.",
    footnotes: [
      {
        id: 0,
        source: "Polymarket",
        url: "https://polymarket.com/event/plague-pandemic-in-2026",
        fullText:
          "This market will resolve to \"Yes\" if the World Health Organization explicitly characterizes plague, Yersinia pestis, pneumonic plague, or any plague outbreak as a \"pandemic\" in an official public communication between market creation and December 31, 2026, 11:59 PM ET. Otherwise, this market will resolve to \"No\". An explicit characterization includes official WHO statements, reports, press briefings, or publications that clearly describe the disease or outbreak as a \"pandemic\". A Public Health Emergency of International Concern alone will not qualify unless it is also described as a pandemic.",
      },
    ],
  },
  plague_us_pneumonic: {
    summary:
      "Any confirmed US pneumonic plague case, linked to Russia or not.",
    footnotes: [
      {
        id: 0,
        source: "Kalshi",
        url: "https://kalshi.com/markets/kxpneumonicplague",
        fullText:
          "If a confirmed human case of pneumonic plague in the United States is officially reported by a Source Agency after Issuance and before January 1, 2027, then the market resolves to Yes. The disease is human pneumonic plague specifically. Bubonic or septicemic plague without pneumonic involvement, unspecified plague, and animal cases do not qualify. A case must be confirmed in the United States; a U.S. citizen diagnosed elsewhere does not count. Imported cases diagnosed and reported in the United States qualify and need not be linked to the Russian outbreak.",
      },
    ],
  },
};

// Each resolves Yes only if someone other than the lab worker is confirmed
// with plague. The 5+ rung is left out: it asks for a bigger outbreak.
const SPREAD_COMPONENTS = [
  { group: "plague_new_case_russia", label: "by 31 Oct · Polymarket", source: "Polymarket" },
  { group: "plague_irkutsk_cases", label: "2+ cases · Kalshi", source: "Kalshi" },
];

// Claude's judgment, not a market: if plague spreads beyond the lab worker, the chance a
// linked case is confirmed in Europe or North America by 1 November.
const WEST_GIVEN_SPREAD = 0.02;

// FutureSearch, one run on 5 Oct (docs/plague-futuresearch-2026-10-05.md): a third
// reading of the spread step, and the headline asked directly as a cross-check.
const FUTURESEARCH_URL = "https://github.com/Goodheart-Labs/globalriskodds/blob/main/docs/plague-futuresearch-2026-10-05.md";
const FUTURESEARCH_TIME = Date.UTC(2026, 9, 6, 5, 25);
const FUTURESEARCH_SPREAD = 3;
const FUTURESEARCH_WEST = 0.01;
const MIDDLE_COLOR = "#B45309";

const CBS_URL = "https://www.cbsnews.com/news/russia-plague-lab-death-pneumonia-of-unknown-origin/";
const TIME_URL = "https://time.com/article/2026/10/05/russia-plague-fears-siberia-quarantine-lab-worker-died/";
const NORTHEASTERN_URL = "https://news.northeastern.edu/2026/10/05/outbreak-plague-russia-analysis/";
const WHO_FACTSHEET_URL = "https://www.who.int/news-room/fact-sheets/detail/plague";
const WHO_MADAGASCAR_URL = "https://www.who.int/emergencies/disease-outbreak-news/item/27-november-2017-plague-madagascar-en";

const CHAIN: Statement[] = [
  { id: "west-estimate", text: `Claude's estimate: if plague spreads beyond the lab worker, about a ${WEST_GIVEN_SPREAD * 100}% chance (range 0.5–5%) that a linked case is confirmed in Europe or North America by 1 November. The likeliest next cases are her contacts, already under observation, and a far larger outbreak in Madagascar produced no travel-related cases.`, source: "Claude Opus 5.5, 5 Oct 2026" },
  { id: "madagascar", text: "From 1 August to 22 November 2017, Madagascar reported 2,348 plague cases, 1,791 of them pneumonic. The WHO said: \"To date, there are no reported cases related to international travel.\"", source: "WHO", url: WHO_MADAGASCAR_URL },
];

const FACTS: Statement[] = [
  { id: "died", text: "A lab worker at the Irkutsk Anti-Plague Research Institute died of severe pneumonia overnight into 2 October, the WHO said.", source: "CBS News", url: CBS_URL },
  { id: "test-tube", text: "Russian media reported that she broke a test tube containing plague bacteria in late September.", source: "CBS News", url: CBS_URL },
  { id: "no-accident", text: "Russian authorities said there had been no accident and attributed her death to \"pneumonia of unknown origin\".", source: "CBS News", url: CBS_URL },
  { id: "samples", text: "Rospotrebnadzor said no microorganisms related to her work were found in her biological samples.", source: "Time", url: TIME_URL },
  { id: "contacts", text: "Rospotrebnadzor tested nearly 200 of her contacts; some had colds or COVID, but no pathogens causing dangerous infections were found.", source: "CBS News", url: CBS_URL },
  { id: "who-risk", text: "The WHO said that \"based on the unofficial information available, the public health risk to the general public appears to be low\".", source: "CBS News", url: CBS_URL },
  { id: "spreads", text: "\"Any person with pneumonic plague may transmit the disease via respiratory particles to other humans.\"", source: "WHO", url: WHO_FACTSHEET_URL },
  { id: "incubation", text: "\"Incubation can be as short as 24 hours.\"", source: "WHO", url: WHO_FACTSHEET_URL },
  { id: "scarpino", text: "Samuel Scarpino, Northeastern University: \"The incubation time for plague is also very short, typically just a day or two, so we'd already be seeing cases.\"", source: "Northeastern", url: NORTHEASTERN_URL },
  { id: "antibiotics", text: "Common antibiotics \"can effectively cure the disease if they are delivered early\".", source: "WHO", url: WHO_FACTSHEET_URL },
];

const pct = (x: number) => `${x < 0.1 ? Number((x * 100).toFixed(1)) : Math.round(x * 100)}%`;

function Hero({ spread }: { spread: number | undefined }) {
  const west = spread === undefined ? undefined : spread * WEST_GIVEN_SPREAD;
  return (
    <header className="not-prose mx-auto mb-10 max-w-3xl text-center">
      <h1 className="mx-auto" style={SERIF}>Will the Russian plague spread to the West?</h1>
      {west !== undefined && (
        <>
          <p className="mt-8 text-6xl sm:text-7xl leading-none tracking-tight" style={{ ...SERIF, color: probabilityColor(west) }}>
            {probabilityWord(west)}
          </p>
          <p className="mx-auto mt-4 max-w-xl text-lg text-balance">
            About {pct(west)} that a case linked to Russia is confirmed in Europe or North America by 1 November.
          </p>
        </>
      )}
    </header>
  );
}

function ChainTerm({ value, label, basis, ids, statements }: { value: string; label: string; basis?: ReactNode; ids: string[]; statements: Statement[] }) {
  return (
    <div className="min-w-0">
      <div className="text-3xl sm:text-4xl tabular-nums" style={SERIF}>{value}</div>
      <div className="mt-1 text-sm leading-snug">{label}<Cite ids={ids} statements={statements} topic="plague" /></div>
      {basis && <div className="mt-0.5 text-xs opacity-60">{basis}</div>}
    </div>
  );
}

/** The headline's working: market odds of any spread, times Claude's factor for reaching the West. */
type Input = { source: string; label: string; probability: number; url?: string; color: string; history: { timestamp: number; probability: number }[]; lastUpdated?: number };

function Chain({ spread, parts, statements }: { spread: number; parts: Input[]; statements: Statement[] }) {
  const op = "self-start pt-1 text-2xl opacity-40";
  return (
    <div className="not-prose mx-auto mb-6 grid max-w-3xl grid-cols-[1fr_auto_1fr_auto_1fr] items-start gap-2 text-center sm:gap-4">
      <ChainTerm value={pct(spread)} label="It spreads beyond the lab worker" ids={[]} statements={statements}
        basis={<>middle of {parts.map((x, i) => (
          <span key={x.source}>
            {i > 0 && (i === parts.length - 1 ? " and " : ", ")}
            <a href={x.url} target="_blank" rel="noopener noreferrer" className="underline">{x.source} ↗</a>
          </span>
        ))}</>} />
      <span className={op} aria-hidden="true">×</span>
      <ChainTerm value={pct(WEST_GIVEN_SPREAD)} label="If so, it reaches the West" basis="Claude's estimate" ids={["west-estimate", "madagascar"]} statements={statements} />
      <span className={op} aria-hidden="true">=</span>
      <ChainTerm value={pct(spread * WEST_GIVEN_SPREAD)} label="It reaches the West" ids={[]} statements={statements} />
    </div>
  );
}

/** Central chart: each input to the spread step and the middle line the headline is built from. */
function SpreadChart({ parts }: { parts: Input[] }) {
  const drawn = parts.filter((x) => x.history.length > 0);
  const fixed = parts.filter((x) => x.history.length === 0).map((x) => x.probability);
  const rows = mergeMarketHistory(drawn);
  const middle = rows.flatMap((row) => {
    const values = drawn.map((_, i) => row[`series_${i}`]).filter((v): v is number => v !== null && v !== undefined);
    return values.length === drawn.length ? [{ timestamp: Number(row.timestamp), probability: median([...values, ...fixed]) }] : [];
  });
  // Middle last so it draws on top: it often coincides with one input.
  const series: ChartSeries[] = [
    ...parts.filter((x) => x.history.length > 0).map((x) => ({ label: x.label, color: x.color, source: x.source, probability: x.probability, history: x.history, sourceUrl: x.url, lastUpdated: x.lastUpdated })),
    { label: "Middle", color: MIDDLE_COLOR, source: "", probability: Math.round(median(parts.map((x) => x.probability))), history: middle },
  ];
  return (
    <div className="not-prose mx-auto mb-14 max-w-3xl">
      <CombinedChart series={series} />
    </div>
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
    <VotedCard slot="plague:futuresearch">
      <div className="card-body">
        <h3 className="card-title text-lg mb-1">FutureSearch AI forecast</h3>
        <a href={FUTURESEARCH_URL} target="_blank" rel="noopener noreferrer" className="text-xs underline opacity-65 hover:opacity-100">5 October · reasoning ↗</a>
        <div className="my-6 grid grid-cols-2 gap-4">
          {big(pct(FUTURESEARCH_SPREAD / 100), "It spreads beyond the lab worker")}
          {big(pct(FUTURESEARCH_WEST), "It reaches the West")}
        </div>
        <ChartVote slot="plague:futuresearch" mode="expanded" />
      </div>
    </VotedCard>
  );
}

function Summary({ statements }: { statements: Statement[] }) {
  const c = (...ids: string[]) => <Cite ids={ids} statements={statements} topic="plague" />;
  return (
    <div className="not-prose mx-auto mb-14 max-w-[680px] space-y-4 text-[17px] leading-relaxed" style={SERIF}>
      <p>
        A lab worker at the Irkutsk Anti-Plague Research Institute died of severe pneumonia on 2 October.{c("died")}{" "}
        Russian media say she broke a test tube of plague bacteria in late September.{c("test-tube")} Russian
        authorities deny any accident and call it "pneumonia of unknown origin".{c("no-accident")} They found nothing
        from her work in her samples{c("samples")} and no dangerous pathogens in nearly 200 contacts.{c("contacts")}{" "}
        The WHO calls the public risk low.{c("who-risk")}
      </p>
      <p>
        Pneumonic plague spreads between people{c("spreads")} and can incubate in 24 hours,{c("incubation")} so new
        cases would show quickly.{c("scarpino")} Antibiotics cure it if given early.{c("antibiotics")}
      </p>
    </div>
  );
}

const simpleMarketsQuery = convexQuery(api.simple.getMarkets, {});

export const Route = createFileRoute("/plague")({
  staticData: { title: "Russian Plague" },
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(simpleMarketsQuery);
  },
  component: PlaguePage,
});

function PlaguePage() {
  const { data } = useSuspenseQuery(simpleMarketsQuery);
  const markets = data as Market[];

  const marketInputs: Input[] = SPREAD_COMPONENTS.flatMap((c) => {
    const m = markets.find((x) => x.chartGroup === c.group && x.shortLabel === c.label);
    if (!m) return [];
    // Carry each line to its current price so every input reaches the right edge.
    const last = Math.max(m.lastUpdated, ...m.history.map((h) => h.timestamp));
    const history = [...m.history, { timestamp: last, probability: m.probability }];
    return [{ source: c.source, label: c.label, probability: m.probability, url: m.sourceUrl, color: m.chartColor ?? "#94A3B8", history, lastUpdated: m.lastUpdated }];
  });
  const spread: Input[] = [
    ...marketInputs,
    {
      // One forecast so far: it counts toward the middle and shows on its card, not as a line.
      source: "FutureSearch", label: "FutureSearch", probability: FUTURESEARCH_SPREAD, url: FUTURESEARCH_URL, color: "#7C3AED",
      history: [], lastUpdated: FUTURESEARCH_TIME,
    },
  ];
  const p = spread.length > 1 ? median(spread.map((x) => x.probability)) / 100 : undefined;
  const statements: Statement[] = [
    ...CHAIN,
    ...FACTS,
  ];

  return (
    <TopicDashboard
      topic="plague"
      title="Will the Russian plague spread to the West?"
      markets={markets}
      groupTitles={GROUP_TITLES}
      groupResolutions={GROUP_RESOLUTION}
      groupKeys={PLAGUE_GROUPS}
      header={<>
        <Hero spread={p} />
        {p !== undefined && <><Chain spread={p} parts={spread} statements={statements} /><SpreadChart parts={spread} /></>}
      </>}
      voteMode="expanded"
      intro={<><Summary statements={statements} /><SectionLabel>The markets</SectionLabel></>}
      extraCards={<FutureSearchCard />}
      footer={<>
        <Sources statements={statements} topic="plague" />
        <div className="mx-auto mt-10 max-w-[680px]"><SuggestionsPanel topic="plague" placeholder="e.g. Will Russia name the pathogen before 2027?" /></div>
      </>}
    />
  );
}
