import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import {
  TopicDashboard,
  type GroupResolution,
  type Market,
} from "@/components/TopicDashboard";

const GROUP_TITLES: Record<string, string> = {
  h5n1_us_cases: "Human H5N1 cases in the US during 2026",
  h5_pheic: "WHO declares a bird flu emergency (PHEIC)",
  h5n1_pandemic: "WHO announces an H5N1 pandemic before 2030",
  any_pandemic_2026: "Any disease becomes a pandemic in 2026",
};

const H5N1_GROUPS = Object.keys(GROUP_TITLES);

const GROUP_RESOLUTION: Record<string, GroupResolution> = {
  h5n1_us_cases: {
    summary:
      "Two rungs of Kalshi's ladder: at least 1, and at least 3, human H5N1 cases reported in the United States during 2026. Cases reported by 8 January 2027 count if they are backdated to 2026.",
    footnotes: [
      {
        id: 0,
        source: "Kalshi",
        url: "https://kalshi.com/markets/kxh5n1count",
        fullText:
          "If the total number of human H5N1 cases reported in the United States during 2026 is above 0, then the market resolves to Yes. Cases are determined at 10:00 AM ET on the Expiration Date (January 8). Cases that actually occur between the end of the specified time period and Expiration do not count, but newly reported cases during this window do count if they are backdated to 2026. See the full rules for how Source Agencies are prioritized. This market refers exclusively to human cases.",
      },
      {
        id: 0,
        source: "Kalshi",
        url: "https://kalshi.com/markets/kxh5n1count",
        fullText:
          "If the total number of human H5N1 cases reported in the United States during 2026 is above 2, then the market resolves to Yes. Cases are determined at 10:00 AM ET on the Expiration Date (January 8). Cases that actually occur between the end of the specified time period and Expiration do not count, but newly reported cases during this window do count if they are backdated to 2026. See the full rules for how Source Agencies are prioritized. This market refers exclusively to human cases.",
      },
    ],
  },
  h5_pheic: {
    summary:
      "Two Metaculus questions on a WHO Public Health Emergency of International Concern. They differ in deadline (2028 vs 2030) and scope: any H5 event, vs a highly pathogenic avian flu outbreak presenting in humans.",
    footnotes: [
      {
        id: 0,
        source: "Metaculus",
        url: "https://www.metaculus.com/questions/45011/",
        fullText:
          "This question will resolve as Yes if before January 1, 2028, the World Health Organization declares any event caused by an H5 virus to be a Public Health Emergency of International Concern.",
      },
      {
        id: 0,
        source: "Metaculus",
        url: "https://www.metaculus.com/questions/23387/",
        fullText:
          "This question will resolve as Yes if, prior to January 1, 2030, an outbreak of a virus classified as a “Highly Pathogenic Avian Influenza” presenting in humans is declared a “Public Health Emergency of International Concern” (PHEIC) by the World Health Organization. If this PHEIC declaration does not happen prior to January 1, 2030, this question resolves as No.",
      },
    ],
  },
  h5n1_pandemic: {
    summary:
      "Resolves Yes if the WHO announces that H5N1 is a pandemic before January 1, 2030.",
    footnotes: [
      {
        id: 0,
        source: "Metaculus",
        url: "https://www.metaculus.com/questions/41677/",
        fullText:
          "This question will resolve as Yes if, before January 1, 2030, the World Health Organization announces that the H5N1 flu strain is a pandemic.",
      },
    ],
  },
  any_pandemic_2026: {
    summary:
      "Resolves Yes if any disease becomes a pandemic in 2026, with the WHO as the resolution source. This covers every disease, not only bird flu. It is on the page because it is the most heavily traded market nearby.",
    footnotes: [
      {
        id: 0,
        source: "Kalshi",
        url: "https://kalshi.com/markets/kxnewoutbreak-p",
        fullText:
          "If any disease becomes a pandemic in 2026, then the market resolves to Yes.",
      },
    ],
  },
};

const TRIBUNE_URL = "https://www.sltrib.com/news/2026/09/27/animal-advocates-raise-alarm-over/";
const AWI_RECORDS_URL =
  "https://awionline.org/news/records-request-reveals-unhurried-inadequate-response-to-bird-flu-outbreak-in-utah-farmed-mink/";
const HOGVET_URL = "https://hogvet51.substack.com/p/hey-utah-and-usdayou-passed-on-your";
const SPAIN_2022_URL = "https://www.eurosurveillance.org/content/10.2807/1560-7917.ES.2023.28.3.2300001";

function Source({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
      {children}
    </a>
  );
}

function MinkContext() {
  return (
    <div className="text-sm opacity-70 mb-6 not-prose space-y-2 max-w-3xl">
      <p>
        In August, USDA confirmed H5N1 on a Utah mink farm, the first documented outbreak in farmed mink in
        the US (<Source href={TRIBUNE_URL}>Salt Lake Tribune</Source>). State records released to the Animal
        Welfare Institute show the owner expected to lose 80% of the herd, and that the state vet had placed no
        quarantine as of 2 September. Utah asked USDA on 26 August to allow emergency vaccination
        (<Source href={AWI_RECORDS_URL}>AWI</Source>); as of 27 September USDA had not decided
        (<Source href={TRIBUNE_URL}>Salt Lake Tribune</Source>). A former USDA animal-health official who read
        the records found no sign of public-health monitoring of the farm's workers
        (<Source href={HOGVET_URL}>hogvet51</Source>).
      </p>
      <p>
        Mink matter because the virus can adapt to mammals inside them. On a Spanish mink farm in 2022 every
        mink sample carried a mutation (PB2 T271A) that boosts the virus's copying in mammal cells, and the
        virus may have spread from mink to mink (<Source href={SPAIN_2022_URL}>Eurosurveillance</Source>). No
        one has published evidence either way for Utah. No market asks about mink directly; the markets below
        price what would follow if it spread.
      </p>
    </div>
  );
}

const simpleMarketsQuery = convexQuery(api.simple.getMarkets, {});

export const Route = createFileRoute("/h5n1")({
  staticData: { title: "H5N1 Bird Flu" },
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(simpleMarketsQuery);
  },
  component: H5N1Page,
});

function H5N1Page() {
  const { data: markets } = useSuspenseQuery(simpleMarketsQuery);

  return (
    <TopicDashboard
      topic="h5n1"
      title="H5N1 Bird Flu Risk Dashboard"
      subtitle="Utah mink outbreak · US human cases · WHO emergency and pandemic odds · Forecasting from Kalshi and Metaculus"
      markets={markets as Market[]}
      groupTitles={GROUP_TITLES}
      groupResolutions={GROUP_RESOLUTION}
      groupKeys={H5N1_GROUPS}
      intro={<MinkContext />}
    />
  );
}
