import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Fetches the IPO sources that publish a whole cumulative curve at once, and
 * stores them for the dashboard to blend.
 *
 * - **Metaculus** exposes a 201-point CDF over the question's date range in
 *   `aggregations.recency_weighted.latest.forecast_values`. Needs the API key,
 *   hence server-side.
 * - **Kalshi** lists "when will X officially announce an IPO" ladders. Its
 *   market endpoints report `last_price: null` for these, so prices come from
 *   order-book midpoints instead — thin books, indicative only. Announcement
 *   is an earlier event than completion; the note travels with the curve.
 *
 * Polymarket is not here: its rungs are individual binary markets living in
 * `predictions`, already polled and charted with history.
 */

const METACULUS_QUESTIONS = [
  {
    key: "ipo_anthropic:metaculus",
    topic: "ipo_anthropic",
    postId: 44767,
    label: "Metaculus",
  },
  {
    key: "ipo_openai:metaculus",
    topic: "ipo_openai",
    postId: 44766,
    label: "Metaculus",
  },
];

// Inputs to Metaculus's AI IPO windfall map, shown in the giving card. Stored
// like the curves, but t is not a date: for market cap it is dollars at the
// 25th, 50th and 75th percentiles; for lockup length it is each option's lower
// bound in days (">180" stored as 181), with p that option's probability.
const METACULUS_LOCKUP_QUESTIONS = [
  {
    key: "ipo_anthropic:lockup-cap",
    topic: "ipo_anthropic:lockup",
    postId: 45334,
    label: "Market cap when the lockup ends",
  },
  {
    key: "ipo_openai:lockup-cap",
    topic: "ipo_openai:lockup",
    postId: 44912,
    label: "Market cap when the lockup ends",
  },
  {
    key: "ipo_anthropic:lockup-days",
    topic: "ipo_anthropic:lockup",
    postId: 44793,
    label: "Employee lockup length",
  },
  {
    key: "ipo_openai:lockup-days",
    topic: "ipo_openai:lockup",
    postId: 44795,
    label: "Employee lockup length",
  },
];

const KALSHI_LADDERS = [
  {
    key: "ipo_anthropic:kalshi",
    topic: "ipo_anthropic",
    eventTicker: "KXIPOANTHROPIC-DATE",
    label: "Kalshi (announcement)",
    url: "https://kalshi.com/markets/kxipoanthropic",
  },
  {
    key: "ipo_openai:kalshi",
    topic: "ipo_openai",
    eventTicker: "KXIPOOPENAI",
    label: "Kalshi (announcement)",
    url: "https://kalshi.com/markets/kxipoopenai",
  },
];

const KALSHI_NOTE =
  "Kalshi asks when an IPO will be officially announced — an earlier event than the listing itself. Priced from order-book midpoints because its API reports no last price for these markets.";

type Point = { t: number; p: number };

type Scaling = {
  range_min: number;
  range_max: number;
  zero_point?: number | null;
};

/** A 0-1 position on a Metaculus question's range, in the question's units. */
function fromUnit(scaling: Scaling, frac: number): number {
  return scaling.zero_point == null
    ? scaling.range_min + (scaling.range_max - scaling.range_min) * frac
    : scaling.zero_point +
        (scaling.range_min - scaling.zero_point) *
          Math.pow(
            (scaling.range_max - scaling.zero_point) /
              (scaling.range_min - scaling.zero_point),
            frac,
          );
}

export const storeCurve = internalMutation({
  args: {
    key: v.string(),
    topic: v.string(),
    source: v.string(),
    label: v.string(),
    sourceUrl: v.optional(v.string()),
    note: v.optional(v.string()),
    points: v.array(v.object({ t: v.number(), p: v.number() })),
    medianHistory: v.optional(
      v.array(v.object({ t: v.number(), impliedT: v.number() }))
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("forecastCurves")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    const doc = { ...args, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, doc);
    } else {
      await ctx.db.insert("forecastCurves", doc);
    }
  },
});

export const listCurves = query({
  args: {},
  handler: async (ctx) => ctx.db.query("forecastCurves").collect(),
});

/** Best resting bid on one side of a Kalshi book, as a probability. */
function bestBid(side: [string, string][] | undefined): number | null {
  if (!side || side.length === 0) return null;
  const price = Number(side[side.length - 1][0]);
  return Number.isFinite(price) ? price : null;
}

export const refreshIpoCurves = action({
  args: {},
  handler: async (ctx): Promise<{ stored: string[]; failed: string[] }> => {
    const stored: string[] = [];
    const failed: string[] = [];
    const apiKey = process.env.METACULUS_API_KEY;

    for (const question of METACULUS_QUESTIONS) {
      try {
        const res = await fetch(
          `https://www.metaculus.com/api/posts/${question.postId}/`,
          apiKey ? { headers: { Authorization: `Token ${apiKey}` } } : {},
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const q = data.question;
        const cdf: number[] =
          q?.aggregations?.recency_weighted?.latest?.forecast_values ?? [];
        const scaling = q?.scaling ?? {};
        if (cdf.length < 2 || scaling.range_min == null) {
          throw new Error("no CDF");
        }

        // The CDF is evenly spaced across the question's date range. Sample it
        // down to keep the stored document small; the shape is smooth.
        const points: Point[] = [];
        const step = Math.max(1, Math.floor(cdf.length / 40));
        for (let i = 0; i < cdf.length; i += step) {
          const frac = i / (cdf.length - 1);
          points.push({ t: fromUnit(scaling, frac) * 1000, p: cdf[i] });
        }

        // Where this question's community centre has pointed over time.
        const toDate = (frac: number) => fromUnit(scaling, frac) * 1000;

        const rawHistory = q?.aggregations?.recency_weighted?.history ?? [];
        const medianHistory = rawHistory
          .filter((entry: { centers?: number[] }) => entry.centers?.[0] != null)
          .map((entry: { start_time: number; centers: number[] }) => ({
            t: entry.start_time * 1000,
            impliedT: toDate(entry.centers[0]),
          }));

        await ctx.runMutation(internal.ipoCurves.storeCurve, {
          key: question.key,
          topic: question.topic,
          source: "metaculus",
          label: question.label,
          sourceUrl: `https://www.metaculus.com/questions/${question.postId}/`,
          points,
          medianHistory,
        });
        stored.push(question.key);
      } catch (error) {
        failed.push(`${question.key}: ${String(error)}`);
      }
    }

    for (const question of METACULUS_LOCKUP_QUESTIONS) {
      try {
        const res = await fetch(
          `https://www.metaculus.com/api/posts/${question.postId}/`,
          apiKey ? { headers: { Authorization: `Token ${apiKey}` } } : {},
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const q = data.question;
        const latest = q?.aggregations?.recency_weighted?.latest;

        let points: Point[];
        if (q?.type === "multiple_choice") {
          const options: string[] = q.options ?? [];
          points = options.map((option, i) => ({
            t: option.startsWith(">")
              ? Number(option.slice(1)) + 1
              : parseInt(option, 10),
            p: latest?.forecast_values?.[i],
          }));
        } else {
          const scaling = q?.scaling;
          points = [
            [latest?.interval_lower_bounds?.[0], 0.25],
            [latest?.centers?.[0], 0.5],
            [latest?.interval_upper_bounds?.[0], 0.75],
          ].map(([frac, p]) => ({ t: fromUnit(scaling, frac), p }));
        }
        if (
          points.length < 2 ||
          points.some((pt) => !Number.isFinite(pt.t) || !Number.isFinite(pt.p))
        ) {
          throw new Error("no forecast");
        }

        await ctx.runMutation(internal.ipoCurves.storeCurve, {
          key: question.key,
          topic: question.topic,
          source: "metaculus",
          label: question.label,
          sourceUrl: `https://www.metaculus.com/questions/${question.postId}/`,
          points,
        });
        stored.push(question.key);
      } catch (error) {
        failed.push(`${question.key}: ${String(error)}`);
      }
    }

    for (const ladder of KALSHI_LADDERS) {
      try {
        const eventRes = await fetch(
          `https://api.elections.kalshi.com/trade-api/v2/events/${ladder.eventTicker}?with_nested_markets=true`,
        );
        if (!eventRes.ok) throw new Error(`HTTP ${eventRes.status}`);
        const eventData = await eventRes.json();
        const markets = eventData.event?.markets ?? [];

        const points: Point[] = [];
        for (const market of markets) {
          if (market.status !== "active") continue;
          const match = String(market.yes_sub_title ?? "").match(
            /Before (\w+) (\d+),? (\d{4})/,
          );
          if (!match) continue;
          const [, month, day, year] = match;
          const date = new Date(`${month} ${day}, ${year} 00:00:00Z`);
          if (isNaN(date.getTime())) continue;

          const bookRes = await fetch(
            `https://api.elections.kalshi.com/trade-api/v2/markets/${market.ticker}/orderbook`,
          );
          if (!bookRes.ok) continue;
          const book = await bookRes.json();
          const yesBid = bestBid(book.orderbook_fp?.yes_dollars);
          const noBid = bestBid(book.orderbook_fp?.no_dollars);
          if (yesBid == null || noBid == null) continue;
          const mid = (yesBid + (1 - noBid)) / 2;
          if (mid <= 0 || mid >= 1) continue;

          // "Before Jul 1" means cumulative through Jun 30.
          points.push({ t: date.getTime() - 60_000, p: mid });
        }

        if (points.length < 2) throw new Error("no priced rungs");
        points.sort((a, b) => a.t - b.t);

        await ctx.runMutation(internal.ipoCurves.storeCurve, {
          key: ladder.key,
          topic: ladder.topic,
          source: "kalshi",
          label: ladder.label,
          sourceUrl: ladder.url,
          note: KALSHI_NOTE,
          points,
        });
        stored.push(ladder.key);
      } catch (error) {
        failed.push(`${ladder.key}: ${String(error)}`);
      }
    }

    return { stored, failed };
  },
});
