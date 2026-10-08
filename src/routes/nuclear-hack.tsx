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

const TOPIC = "nuclear-hack";

const GROUP_TITLES: Record<string, string> = {
  nc3_iran_nuke_2027: "Iran confirmed to have a nuclear weapon, before 2027",
  nuclear_weapon: "Iran nuclear weapon before 2030",
  nc3_new_states_2035: "Gets a nuclear weapon before 2035: Iran, Saudi Arabia, South Korea",
  nc3_taiwan_grid_cyber: "A Chinese cyberattack blacks out 10,000 people in Taiwan for a day, before 2030",
  nc3_us_ai_blackout: "A cyberattack on a grid AI blacks out 50,000 US customers, before 2028",
  nc3_no_detonation_2035: "No nuclear weapon detonated outside a test, before 2035",
};

const NC3_GROUPS = Object.keys(GROUP_TITLES);

const GROUP_RESOLUTION: Record<string, GroupResolution> = {
  nc3_iran_nuke_2027: {
    summary: "Iran's government, international nuclear agencies or credible global news confirm Iran has a nuclear weapon by 31 December 2026.",
    footnotes: [{
      id: 0, source: "Polymarket", url: "https://polymarket.com/event/iran-nuke-before-2027",
      fullText: "This market will resolve to \"Yes\" if credible reports from international nuclear agencies, Iran's government itself, or credible global news sources officially confirm that Iran possesses a nuclear weapon by December 31, 2026, 11:59 PM ET. Otherwise, this market will resolve to \"No\".",
    }],
  },
  nuclear_weapon: {
    summary: "Iran's government credibly says it has a nuclear weapon, or tests one, before 2030. Buying or being given one counts; a warhead without a missile counts.",
    footnotes: [{
      id: 0, source: "Metaculus", url: "https://www.metaculus.com/questions/5253/",
      fullText: "This question will resolve as Yes if the Iranian Government credibly states that it has a nuclear weapon or has tested a nuclear weapon at any time between January 1, 2020 to January 1, 2030, according to credible media reports. For these purposes we do not consider a radiological weapon — where any fission/fusion energy is energetically sub-dominant to chemical or other explosives — to constitute a nuclear detonation. For the purpose of this question, no missiles are required to carry the nuclear weapons (e.g. a nuclear warhead alone is sufficient for positive resolution). The deliberate detonation of nuclear weapons primarily for non-offensive engineering, mining or other civilian purposes (on Earth or in Space) will be sufficient to resolve this question as Yes. Purchase of or gift of nuclear weapon to Iran will resolve this question as Yes.",
    }],
  },
  nc3_new_states_2035: {
    summary: "By 2035, the country claims a nuclear weapon or tests one, or other governments, intelligence agencies or the IAEA credibly report it has one. Each country resolves separately.",
    footnotes: [{
      id: 0, source: "Metaculus", url: "https://www.metaculus.com/questions/21898/",
      fullText: "This question will resolve as yes if by 1 Jan 2035 either: 1. The named government credibly claims to be in possession of at least one nuclear weapon and/or has successfully tested a nuclear weapon. 2. Credible reports from other governments, intelligence agencies, or international bodies such as the International Atomic Energy Agency indicate that the named country is in possession of at least one nuclear weapon and/or has tested a nuclear weapon. Please note that, unlike the question linked in the background info, resolution doesn't require that the country has tested a nuclear weapon, only that it possesses one. As it is possible for multiple countries to develop nuclear weapons, positive resolution by one country will not affect resolution of other countries.",
    }],
  },
  nc3_taiwan_grid_cyber: {
    summary: "A cyberattack formally attributed to China cuts power to at least 10,000 people in Taiwan for at least a day, before 2030.",
    footnotes: [{
      id: 0, source: "Metaculus", url: "https://www.metaculus.com/questions/21805/",
      fullText: "This question resolves as Yes if, before January 1, 2030, China carries out a cyberattack on Taiwan's electricity infrastructure that causes loss of electricity for at least 10,000 people for at least 1 day. The question resolves as No otherwise. The attribution of the attack must be issued by either i) the United States, a Five Eyes nation, or a NATO member, or ii) a reputable cybersecurity company or research organization. Attribution must be formal—i.e. in an on-the-record speech or in writing. A publication that uses phrases such as \"China is suspected,\" or \"China is possibly,\" or \"China is likely\" will not trigger Yes resolution.",
    }],
  },
  nc3_us_ai_blackout: {
    summary: "A cyberattack on an AI system that helps run a US grid causes an outage for at least 50,000 customers, before 2028.",
    footnotes: [{
      id: 0, source: "Metaculus", url: "https://www.metaculus.com/questions/39136/",
      fullText: "This question resolves as Yes if, before January 1, 2028, cyber attack on an AI system causes a power outage affecting 50,000 or more customers according to credible sources. The interruption in electrical service must be caused by a cyberattack on an AI system directly involved in the operational management of an electrical grid. Operational management is defined as the overseeing of the transmission and/or distribution of electricity to end users, e.g., load balancing and predictive maintenance.",
    }],
  },
  nc3_no_detonation_2035: {
    summary: "Yes means no nuclear weapon goes off outside a controlled test before 2035. Deliberate, accidental and terrorist detonations all break it; launches on false warnings count.",
    footnotes: [{
      id: 0, source: "Metaculus", url: "https://www.metaculus.com/questions/3150/",
      fullText: "This question will resolve positively if no nuclear weapon is detonated before Jan 1, 2035, outside of controlled tests. Negative resolution could be triggered by: Deliberate nuclear attack. Accidental nuclear attack (launched by accident or on the basis of erroneous information.) Accidental detonation of a weapon. Nuclear terrorism. For these purposes we do not consider a radiological weapon — where any fission/fusion energy is energetically sub-dominant to chemical or other explosives — to constitute a nuclear detonation. The deliberate detonation of nuclear weapons primarily for non-offensive engineering, mining or other civilian purposes (on Earth or in Space) do not trigger negative resolution.",
    }],
  },
};

// FutureSearch, one run on 8 Oct (docs/nc3-futuresearch-2026-10-08.md), binary mode.
const FUTURESEARCH_URL = "https://github.com/Goodheart-Labs/globalriskodds/blob/main/docs/nc3-futuresearch-2026-10-08.md";
const FUTURESEARCH = 0.13;

// Claude's model: scripts/nc3_hack_model.py, run 8 Oct (docs/nc3-hack-model.md).
const MODEL_URL = "https://github.com/Goodheart-Labs/globalriskodds/blob/main/docs/nc3-hack-model.md";
const MODEL = 0.143;

// The same FutureSearch run, on softer and harder targets than NC3.
const TARGETS: { label: string; p: number; effort: "high" | "low"; cite: string[] }[] = [
  { label: "Ransomware victims fall in 2027, below 2025's count", p: 0.11, effort: "high", cite: ["ransomware", "futuresearch"] },
  { label: "One cyberattack forces 1,000+ NHS cancellations, by end of 2027", p: 0.37, effort: "low", cite: ["futuresearch"] },
  { label: "A UK nuclear site's operations disrupted, by end of 2028", p: 0.18, effort: "low", cite: ["futuresearch"] },
  { label: "A cyberattack trips a power reactor anywhere, by end of 2028", p: 0.09, effort: "low", cite: ["futuresearch"] },
  { label: "Nuclear command hack confirmed or reported, by end of 2030", p: FUTURESEARCH, effort: "high", cite: ["futuresearch"] },
];

const MIDDLE_COLOR = "#B45309";
const MODEL_COLOR = "#0EA5E9";
const FUTURESEARCH_COLOR = "#7C3AED";

const STATEMENTS: Statement[] = [
  { id: "saccs", text: "\"The US Strategic Automated Command and Control System (SACCS) has reportedly replaced the ancient eight-inch floppy disks it uses to store data on the US nuclear arsenal.\" \"Earlier this summer, the antiquated IBM floppy drives were replaced with what was described as a 'highly-secure solid state digital storage solution.'\"", source: "The Register, Oct 2019", url: "https://www.theregister.com/2019/10/18/us_nuclear_upgrade/" },
  { id: "chatham", text: "\"There are a number of vulnerabilities and pathways through which a malicious actor may infiltrate a nuclear weapons system without a state's knowledge. Human error, system failures, design vulnerabilities, and susceptibilities within the supply chain all represent common security issues in nuclear weapons systems.\"", source: "Chatham House, Jan 2018", url: "https://www.chathamhouse.org/sites/default/files/publications/research/2018-01-11-cybersecurity-nuclear-weapons-unal-lewis-final.pdf" },
  { id: "gao", text: "On US weapon systems in development: \"Using relatively simple tools and techniques, testers were able to take control of systems and largely operate undetected, due in part to basic issues such as poor password management and unencrypted communications.\"", source: "US GAO, Oct 2018", url: "https://www.gao.gov/products/gao-19-128" },
  { id: "chatham-unknown", text: "\"During peacetime, offensive cyber activities would create a dilemma for a state as it may not know whether its systems have been the subject of a cyberattack.\"", source: "Chatham House, Jan 2018", url: "https://www.chathamhouse.org/sites/default/files/publications/research/2018-01-11-cybersecurity-nuclear-weapons-unal-lewis-final.pdf" },
  { id: "solarwinds", text: "After the SolarWinds hack reached the US nuclear weapons agency, the Energy Department said \"the malware has been isolated to business networks only\" and \"has not impacted the mission essential national security functions of the Department, including the National Nuclear Security Administration (NNSA)\".", source: "US Department of Energy, Dec 2020", url: "https://www.energy.gov/node/4696417" },
  { id: "sharepoint", text: "\"The US government agency in charge of designing and maintaining nuclear weapons was among those breached by a hack of Microsoft's SharePoint server software.\" The department said it was \"minimally impacted because it widely uses Microsoft M365 cloud and very capable cybersecurity systems\".", source: "Engadget, Jul 2025", url: "https://www.engadget.com/cybersecurity/us-nuclear-weapons-agency-breached-using-microsoft-sharepoint-hack-120027770.html" },
  { id: "left-of-launch", text: "\"Soon after ex-President Obama ordered the secret program three years ago, North Korean missiles began exploding, veering off course or crashing into the sea, the newspaper said Saturday.\" \"By most accounts, the North Korean missile failures were caused by US sabotage, the Times says. But it's also likely many of the missile failures resulted from North Korean incompetence.\"", source: "Fox News on the New York Times, Mar 2017", url: "https://www.foxnews.com/world/us-wages-secret-cyber-operations-against-north-korea-missile-program" },
  { id: "ncsc", text: "\"In just 18 months, the best AI models went from barely making any progress on a realistic simulated enterprise attack to completing over half of it.\"", source: "UK NCSC, Mar 2026", url: "https://www.ncsc.gov.uk/blogs/why-cyber-defenders-need-to-be-ready-for-frontier-ai" },
  { id: "glasswing", text: "Anthropic's Mythos model found \"more than ten thousand high- or critical-severity vulnerabilities across the most systemically important software in the world\"; \"75 of the 530 high- or critical-severity bugs we've reported have now been patched\".", source: "Anthropic, May 2026", url: "https://www.anthropic.com/research/glasswing-initial-update" },
  { id: "ncsc-noisy", text: "\"The activity of frontier AI models released before March 2026 tends to generate noticeable security alerts and is relatively easy to detect.\"", source: "UK NCSC, Mar 2026", url: "https://www.ncsc.gov.uk/blogs/why-cyber-defenders-need-to-be-ready-for-frontier-ai" },
  { id: "model", text: `Claude's model gives ${pct(MODEL)}: leaks by an attacker's officials, confirmation by the victim, and supply-chain finds, each a yearly rate scaled up for frontier AI, plus a 15% chance of a war between nuclear powers. It is weighted down by 20 years with no qualifying case.`, source: "Claude Opus 5.5, 8 Oct 2026 · working ↗", url: MODEL_URL },
  { id: "futuresearch", text: `FutureSearch's AI forecaster gives ${pct(FUTURESEARCH)} for the headline, 15% for a new nuclear-armed state by 2030, and the numbers in the table above. Three questions ran at high effort and three at low.`, source: "FutureSearch, 8 Oct 2026 · reasoning ↗", url: FUTURESEARCH_URL },
  { id: "ransomware", text: "Ransomware leak sites listed 8,146 victims in 2025, and 7,885 in 2026 by 8 October.", source: "ransomware.live", url: "https://www.ransomware.live/stats/2025" },
  { id: "synnovis-week1", text: "\"Over 800 planned operations and 700 outpatient appointments had to be rearranged in the first week after a critical ransomware attack on an NHS supplier earlier this month.\"", source: "Infosecurity Magazine, Jun 2024", url: "https://www.infosecurity-magazine.com/news/london-ransomware1500-cancelled/" },
  { id: "synnovis-death", text: "King's College Hospital: \"The patient safety incident investigation identified a number of contributing factors that led to the patient's death. This included a long wait for a blood test result due to the cyber-attack impacting pathology services at the time.\"", source: "The Record, Jun 2025", url: "https://therecord.media/ransomware-attack-contributed-patient-death-uk-nhs" },
  { id: "iran-intel", text: "Before the June 2025 strikes, \"Iran likely could produce enough bomb-grade uranium for a weapon and build a bomb in around three to six months\"; afterwards \"U.S. intelligence estimates pushed that timeline back to about nine months to a year\".", source: "Reuters via Al-Monitor, May 2026", url: "https://www.al-monitor.com/originals/2026/05/exclusive-us-intelligence-indicates-limited-new-damage-irans-nuclear-program" },
  { id: "saudi", text: "\"Saudi officials have insisted the Kingdom will not forgo enrichment as part of any deal with the United States.\"", source: "Just Security, Feb 2026", url: "https://www.justsecurity.org/129480/risk-nuclear-proliferation-2026/" },
  { id: "south-korea", text: "The US said it would support \"the process that will lead to [South Korea's] civil uranium enrichment and spent fuel reprocessing for peaceful purposes.\"", source: "Just Security, Feb 2026", url: "https://www.justsecurity.org/129480/risk-nuclear-proliferation-2026/" },
];

function pct(x: number): string {
  if (x < 0.01) return x < 0.005 ? "<1%" : "1%";
  return `${Math.round(x * 100)}%`;
}

function Hero({ p }: { p: number }) {
  return (
    <header className="not-prose mx-auto mb-10 max-w-3xl text-center">
      <h1 className="mx-auto" style={SERIF}>Will hackers get into a nuclear command system?</h1>
      <p className="mt-2 text-base opacity-70">Confirmed by a government, or reported by major outlets citing officials, by the end of 2030</p>
      <p className="mt-8 text-6xl sm:text-7xl leading-none tracking-tight" style={{ ...SERIF, color: probabilityColor(p) }}>
        {probabilityWord(p)}
      </p>
      <p className="mx-auto mt-4 max-w-xl text-lg text-balance">
        About {pct(p)} that a cyber intrusion into the systems that warn of, order or carry a nuclear launch is
        confirmed or reported by the end of 2030.
      </p>
    </header>
  );
}

function Marker({ at, color, shape, title }: { at: number; color: string; shape: "circle" | "diamond"; title: string }) {
  return (
    <span title={title} aria-label={title}
      className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 ring-2 ring-base-100 ${shape === "circle" ? "rounded-full" : "rotate-45"}`}
      style={{ left: `${Math.min(Math.max(at, 0), 1) * 100}%`, backgroundColor: color }} />
  );
}

/** The two estimates and their middle, on one 0–50% scale. */
function Estimates({ p }: { p: number }) {
  const scale = 0.5;
  return (
    <figure className="not-prose mx-auto mb-14 max-w-3xl">
      <div className="grid grid-cols-[1fr_3.5rem] items-center gap-3 border-y border-base-300 py-3">
        <div className="relative h-6">
          <div className="absolute inset-x-0 top-1/2 h-px bg-base-content/20" />
          <div className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-r"
            style={{ width: `${(p / scale) * 100}%`, backgroundColor: MIDDLE_COLOR, opacity: 0.85 }} />
          <Marker at={MODEL / scale} color={MODEL_COLOR} shape="circle" title={`Claude's model: ${pct(MODEL)}`} />
          <Marker at={FUTURESEARCH / scale} color={FUTURESEARCH_COLOR} shape="diamond" title={`FutureSearch: ${pct(FUTURESEARCH)}`} />
        </div>
        <div className="text-right text-xl font-bold tabular-nums" style={SERIF}>{pct(p)}</div>
      </div>
      <div className="mt-1 grid grid-cols-[1fr_3.5rem] gap-3 text-[10px] opacity-50">
        <div className="flex justify-between tabular-nums"><span>0%</span><span>25%</span><span>50%</span></div>
        <span />
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-5 rounded-r" style={{ backgroundColor: MIDDLE_COLOR }} />Middle of the two</span>
        <a href={MODEL_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: MODEL_COLOR }} />Claude's model {pct(MODEL)} ↗
        </a>
        <a href={FUTURESEARCH_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline">
          <span className="h-2.5 w-2.5 rotate-45" style={{ backgroundColor: FUTURESEARCH_COLOR }} />FutureSearch {pct(FUTURESEARCH)} ↗
        </a>
      </div>
    </figure>
  );
}

function Summary() {
  const c = (...ids: string[]) => <Cite ids={ids} statements={STATEMENTS} topic={TOPIC} />;
  return (
    <div className="not-prose mx-auto mb-14 max-w-[680px] space-y-4 text-[17px] leading-relaxed" style={SERIF}>
      <p>
        Nuclear command systems are old and mostly cut off from the internet. Until 2019 a US nuclear command system stored
        its data on eight-inch floppy disks.{c("saccs")} Being old does not make
        them safe. Chatham House lists human error, design flaws and the supply chain as ways in,{c("chatham")} and
        US testers took control of weapons in development with simple tools.{c("gao")} A state might not even know
        its systems had been hit.{c("chatham-unknown")}
      </p>
      <p>
        No hack of a nuclear command system has been confirmed. The near misses stopped at business networks.
        Hackers reached the US nuclear weapons agency through SolarWinds in 2020{c("solarwinds")} and through
        SharePoint in 2025.{c("sharepoint")} The closest case on the attack side is US
        sabotage of North Korean missile tests, and even that may have been North Korean incompetence.{c("left-of-launch")}
      </p>
      <p>
        AI is speeding up attackers. The best models went from almost nothing to over half of a simulated network
        attack in 18 months,{c("ncsc")} and one model found over 10,000 serious bugs, far faster than they get
        patched.{c("glasswing")} For now their attacks are noisy and easy to catch.{c("ncsc-noisy")}
      </p>
      <p>
        So the question is less whether someone gets in than whether anyone admits it. Claude's model{c("model")} and
        FutureSearch{c("futuresearch")} land in the same place: governments hide this, and attackers boast about
        it only sometimes.
      </p>
    </div>
  );
}

/** Nathan's opening question: is cyber defence winning? Soft targets against hard ones. */
function Targets() {
  const c = (ids: string[]) => <Cite ids={ids} statements={STATEMENTS} topic={TOPIC} />;
  return (
    <section className="not-prose mx-auto mb-14 max-w-[680px]">
      <SectionLabel>Is cyber defence winning?</SectionLabel>
      <div className="mt-3 space-y-3 text-[17px] leading-relaxed" style={SERIF}>
        <p>
          Not on soft targets. By October 2026, ransomware leak sites had listed almost as many victims as in all
          of 2025.{c(["ransomware"])} The 2024 attack on the NHS's blood-test supplier forced 1,500 operations and
          appointments to be moved in its first week,{c(["synnovis-week1"])} and contributed to a patient's
          death.{c(["synnovis-death"])} Hard targets hold up better, mostly because they are isolated.
        </p>
      </div>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-base-content/40 text-left text-xs opacity-70">
            <th className="py-2 pr-2 font-normal">FutureSearch, 8 October</th>
            <th className="py-2 text-right font-normal">Chance</th>
          </tr>
        </thead>
        <tbody>
          {TARGETS.map((row) => (
            <tr key={row.label} className="border-b border-base-300">
              <td className="py-2 pr-2">
                {row.label}{c(row.cite)}
                {row.effort === "low" && <span className="ml-1.5 text-xs opacity-50">quick run</span>}
              </td>
              <td className="py-2 text-right tabular-nums">{pct(row.p)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Proliferation() {
  const c = (...ids: string[]) => <Cite ids={ids} statements={STATEMENTS} topic={TOPIC} />;
  return (
    <section className="not-prose mx-auto mb-14 max-w-[680px]">
      <SectionLabel>Is anyone racing for the bomb?</SectionLabel>
      <div className="mt-3 space-y-3 text-[17px] leading-relaxed" style={SERIF}>
        <p>
          More nuclear states means more command systems to break into, and new ones are likely to be the least
          secure. Iran is closest. US intelligence put it nine months to a year from a bomb after the June 2025
          strikes, up from three to six months before.{c("iran-intel")} Saudi Arabia refuses to give up
          enrichment,{c("saudi")} and the US has said it will back South Korean enrichment and
          reprocessing.{c("south-korea")} FutureSearch gives 15% for any new nuclear-armed state by the end of
          2030.{c("futuresearch")}
        </p>
      </div>
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
    <VotedCard slot="nuclear-hack:futuresearch">
      <div className="card-body">
        <h3 className="card-title text-lg mb-1">FutureSearch AI forecast</h3>
        <a href={FUTURESEARCH_URL} target="_blank" rel="noopener noreferrer" className="text-xs underline opacity-65 hover:opacity-100">8 October · reasoning ↗</a>
        <div className="my-6 grid grid-cols-2 gap-4">
          {big(pct(FUTURESEARCH), "Nuclear command hack confirmed by 2030")}
          {big("15%", "A new nuclear-armed state by 2030")}
        </div>
        <ChartVote slot="nuclear-hack:futuresearch" mode="expanded" />
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
          <SuggestionsPanel standalone topic={TOPIC} placeholder="e.g. Will a government confirm an NC3 breach before 2030?" />
        </div>
      </div>
    </div>
  );
}

const simpleMarketsQuery = convexQuery(api.simple.getMarkets, {});

export const Route = createFileRoute("/nuclear-hack")({
  staticData: { title: "Nuclear Command Hack" },
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(simpleMarketsQuery);
  },
  component: NuclearHackPage,
});

function NuclearHackPage() {
  const { data } = useSuspenseQuery(simpleMarketsQuery);
  const markets = data as Market[];
  const p = median([MODEL, FUTURESEARCH]);

  return (
    <TopicDashboard
      topic={TOPIC}
      title="Will hackers get into a nuclear command system?"
      markets={markets}
      groupTitles={GROUP_TITLES}
      groupResolutions={GROUP_RESOLUTION}
      groupKeys={NC3_GROUPS}
      header={<><Hero p={p} /><Estimates p={p} /></>}
      voteMode="expanded"
      intro={<><Summary /><Targets /><Proliferation /><SectionLabel>Nearby questions</SectionLabel></>}
      extraCards={<><FutureSearchCard /><SuggestCard /></>}
      footer={<Sources statements={STATEMENTS} topic={TOPIC} />}
    />
  );
}
