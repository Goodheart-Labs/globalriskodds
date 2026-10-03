import { ChartVote } from "@/components/ChartVote";
import { EditableInfo } from "@/components/EditableInfo";
import { VotedCard } from "@/components/VotedCard";

type Curve = {
  key: string;
  sourceUrl?: string;
  points: Array<{ t: number; p: number }>;
};

type Link = { label: string; url: string };

const METACULUS_POST =
  "https://forum.effectivealtruism.org/posts/3qMJWh4akZSggoZjt/mapping-the-ai-ipo-windfall";

// Published estimates, newest first. They count different things, so each
// carries what it counts and how it was built.
const ESTIMATES: Array<{
  figure: string;
  counts: string;
  who: Link;
  date: string;
  basis: string;
  more?: Link[];
}> = [
  {
    figure: "$25.7B",
    counts: "reaching charities within four years of the lockups ending",
    who: { label: "Metaculus forecasters", url: METACULUS_POST },
    date: "30 Sep 2026",
    basis:
      "Combines Metaculus forecasts of IPO dates, market caps and lockups with stated assumptions about how much holders sell and give. The same post counts over $100B pledged, and later refers to $24.5B.",
    more: [
      {
        label: "Radiant map",
        url: "https://radiant.metaculus.com/projects/1c3f7d1a-8ad9-4d6f-a906-90de0ec06f88",
      },
      {
        label: "AI Lab IPOs series",
        url: "https://www.metaculus.com/tournament/ai-lab-ipo/",
      },
    ],
  },
  {
    figure: "$12–32B",
    counts: "into donor-advised funds",
    who: {
      label: "George Weiner (Whole Whale)",
      url: "https://nonprofitnewsfeed.com/news/could-the-2026-ipo-wave-trigger-a-32b-donor-advised-fund-boom/",
    },
    date: "9 Jun 2026",
    basis:
      "2021's ratio of new donor-advised fund money to US IPO proceeds (about 16%), applied to the 2026 IPO wave. $12B is SpaceX alone; $24B adds OpenAI and Anthropic. At these funds' 25% payout, $3–8B a year in grants.",
  },
  {
    figure: "$37B a year",
    counts: "of intended philanthropic spend",
    who: {
      label: "Nan Ransohoff",
      url: "https://nanransohoff.substack.com/p/the-third-wave-of-american-philanthropy",
    },
    date: "19 May 2026",
    basis:
      "10% a year from about $370B of assets at May valuations: OpenAI Foundation ~$220B, Anthropic co-founders ~$90B, Anthropic employees ~$60B. About $100B a year if valuations double and spend rises to 15%.",
  },
  {
    figure: "$37.8B",
    counts: "from the pledges of Anthropic's seven co-founders",
    who: {
      label: "Celia Ford (Transformer)",
      url: "https://www.transformernews.ai/p/anthropic-employees-philanthropy-billions-donations-effective-altruism-coefficient-giving-ai-safety",
    },
    date: "12 Mar 2026",
    basis:
      "Each co-founder's ~1.8% stake (a Forbes estimate) times their 80% pledge, at Anthropic's $380B valuation of February 2026.",
  },
];

const trillions = (dollars: number) => `$${(dollars / 1e12).toFixed(2)}T`;

/** Chance the lockup is at least `days` long, from per-option probabilities. */
function chanceAtLeast(curve: Curve, days: number): number | null {
  const total = curve.points.reduce((sum, pt) => sum + pt.p, 0);
  if (!(total > 0)) return null;
  const mass = curve.points
    .filter((pt) => pt.t >= days)
    .reduce((sum, pt) => sum + pt.p, 0);
  return Math.round((mass / total) * 100);
}

export function IpoWindfall({
  curves,
  companies,
}: {
  curves: Curve[];
  companies: ReadonlyArray<{ key: string; name: string; color: string }>;
}) {
  const tiles = companies.map((company) => {
    const cap = curves.find((c) => c.key === `${company.key}:lockup-cap`);
    const days = curves.find((c) => c.key === `${company.key}:lockup-days`);
    const quartile = (p: number) => cap?.points.find((pt) => pt.p === p)?.t;
    return {
      ...company,
      cap,
      days,
      median: quartile(0.5),
      lower: quartile(0.25),
      upper: quartile(0.75),
      longLockup: days ? chanceAtLeast(days, 180) : null,
    };
  });

  return (
    <VotedCard slot="ipo:windfall" className="mb-10">
      <div className="card-body max-sm:p-4">
        <h3 className="card-title text-lg mb-1">
          How much of the IPO money might reach charities?
        </h3>
        <EditableInfo slot="ipo:windfall">
          {`Employees can usually sell only once a lockup ends, commonly 180 days after listing, so that is when most of the giving can start. The tiles are live Metaculus forecasts for that moment. Below are published estimates of the giving itself. They count different things (money given within four years, money parked in donor-advised funds, yearly spend, pledges), so they are not directly comparable.`}
        </EditableInfo>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {tiles.map((tile) => (
            <div key={tile.key} className="rounded-lg bg-base-200 p-4">
              <p
                className="text-sm font-semibold mb-1"
                style={{ color: tile.color }}
              >
                {tile.name}
              </p>
              {tile.median != null ? (
                <>
                  <a
                    href={tile.cap?.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    <span className="text-3xl font-bold tracking-tight">
                      {trillions(tile.median)}
                    </span>
                  </a>
                  <p className="text-sm opacity-70">
                    market cap when the employee lockup ends
                  </p>
                  {tile.lower != null && tile.upper != null && (
                    <p className="text-xs opacity-50">
                      middle 50%: {trillions(tile.lower)}–
                      {trillions(tile.upper)}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm opacity-50">
                  Market-cap forecast unavailable.
                </p>
              )}
              {tile.longLockup != null && (
                <p className="text-xs opacity-50 mt-2">
                  <a
                    href={tile.days?.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {tile.longLockup}% chance the lockup is 180 days or longer
                  </a>
                </p>
              )}
            </div>
          ))}
        </div>

        <ul className="not-prose divide-y divide-base-300">
          {ESTIMATES.map((estimate) => (
            <li key={estimate.who.url} className="py-3">
              <p>
                <span className="text-xl font-bold tracking-tight">
                  {estimate.figure}
                </span>{" "}
                <span className="text-sm opacity-70">{estimate.counts}</span>
              </p>
              <p className="text-xs opacity-60 mt-0.5">
                <a
                  href={estimate.who.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:opacity-80"
                >
                  {estimate.who.label}
                </a>
                , {estimate.date}
                {estimate.more?.map((link) => (
                  <span key={link.url}>
                    {" · "}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:opacity-80"
                    >
                      {link.label}
                    </a>
                  </span>
                ))}
              </p>
              <p className="text-xs opacity-50 mt-1 leading-relaxed">
                {estimate.basis}
              </p>
            </li>
          ))}
        </ul>
        <p className="not-prose text-xs opacity-50 mt-2 leading-relaxed">
          The Metaculus post also credits Giving What We Can with expecting
          about $15B a year. Its link,{" "}
          <a
            href="https://gizmodo.com/the-effective-altruists-reportedly-have-their-mojo-back-thanks-to-ai-2000799030"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80"
          >
            a Gizmodo article
          </a>
          , gives that figure to analysts and links Ransohoff's post; it equals
          her Anthropic-only share ($150B at 10%), so it is not listed
          separately.
        </p>
        <ChartVote slot="ipo:windfall" />
      </div>
    </VotedCard>
  );
}
