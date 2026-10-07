import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ItemVote } from "@/components/ItemVote";
import { chartScore } from "@/lib/helpfulness";

/** A fact the page cites. Shared by the Spilled-Ink-style topic pages (/plague, /climate). */
export type Statement = { id: string; text: string; source: string; url?: string };

const slotOf = (topic: string, id: string) => `${topic}:source:${id}`;

type Vote = { slot: string; rating: string; voterKey: string };

function CiteCard({ id, n, st, votes, alignRight, topic }: { id: string; n: number; st: Statement; votes: Vote[]; alignRight: boolean; topic: string }) {
  return (
    <span id={id} role="dialog" aria-label={`Source ${n}`}
      className={`absolute top-full z-40 mt-1 block w-[min(24rem,88vw)] rounded-md border border-base-300 bg-base-100 p-3 text-left font-sans text-sm font-normal leading-snug tracking-normal text-base-content shadow-lg max-sm:fixed max-sm:inset-x-3 max-sm:bottom-3 max-sm:top-auto max-sm:w-auto ${alignRight ? "right-0" : "left-0"}`}>
      <span className="block text-[10px] font-semibold opacity-50">{n}</span>
      <span className="mt-1 block">{st.text}</span>
      {st.url
        ? <a href={st.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-block text-xs underline opacity-70 hover:opacity-100">{st.source} ↗</a>
        : <span className="mt-1.5 block text-xs opacity-70">{st.source}</span>}
      <span className="mt-2 block"><ItemVote slot={slotOf(topic, st.id)} votes={votes} expanded /></span>
    </span>
  );
}

/** Boxed citation number. Hover (or tap) opens the source with its vote buttons; a click pins it. */
function CiteChip({ n, st, topic }: { n: number; st: Statement; topic: string }) {
  const votes = useQuery(api.chartVotes.listAll) ?? [];
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const id = useId();
  const open = hovered || pinned;
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) { setPinned(false); setHovered(false); }
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const place = () => {
    const box = wrap.current?.getBoundingClientRect();
    setAlignRight(!!box && box.left > window.innerWidth / 2);
  };
  // Short delays so a pointer crossing the gap into the card does not lose it.
  const hover = (next: boolean) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { if (next) place(); setHovered(next); }, next ? 120 : 250);
  };
  return (
    <span ref={wrap} className="relative inline-block"
      onMouseEnter={() => { if (window.matchMedia("(hover: hover)").matches) hover(true); }}
      onMouseLeave={() => hover(false)}
      onKeyDown={(event) => { if (event.key === "Escape") { setPinned(false); setHovered(false); } }}>
      <button type="button" aria-expanded={open} aria-controls={id} aria-label={`Source ${n}`}
        onClick={() => { place(); setPinned(!open); setHovered(false); window.clearTimeout(timer.current); }}
        className={`ml-0.5 -translate-y-1 cursor-pointer rounded-sm border px-1 font-sans text-[10px] leading-4 hover:opacity-100 ${open ? "border-base-content/60 opacity-100" : "border-base-300 opacity-75"}`}>
        {n}
      </button>
      {open && <CiteCard id={id} n={n} st={st} votes={votes} alignRight={alignRight} topic={topic} />}
    </span>
  );
}

export function Cite({ ids, statements, topic }: { ids: string[]; statements: Statement[]; topic: string }) {
  return (
    <>
      {ids.map((id) => {
        const i = statements.findIndex((s) => s.id === id);
        return i < 0 ? null : <CiteChip key={id} n={i + 1} st={statements[i]} topic={topic} />;
      })}
    </>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="not-prose risk-kicker mt-0 border-t border-base-content/80 pt-3">{children}</h2>;
}

function SourceRow({ n, text, url, source, slot, votes, reader }: {
  n: number; text: string; url?: string; source: string; slot: string; votes: Vote[]; reader?: boolean;
}) {
  return (
    <li id={`s-${n}`} className="flex scroll-mt-24 gap-3 border-b border-base-300 py-3 transition-colors target:bg-warning/15">
      <span className="w-5 shrink-0 text-right text-xs opacity-50 tabular-nums">{n}</span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="leading-snug">
          {text}{" "}
          {url
            ? <a href={url} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-xs underline opacity-60 hover:opacity-100">{source} ↗</a>
            : <span className="whitespace-nowrap text-xs opacity-60">{source}</span>}
          {reader && <span className="ml-1 whitespace-nowrap text-xs opacity-50">· added by a reader</span>}
        </p>
        <ItemVote slot={slot} votes={votes} expanded />
      </div>
    </li>
  );
}

/** A link's host, for the source label. Never throws: bad links just lose the label. */
function hostOf(url: string | undefined): string {
  if (!url) return "no source given";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

function AddSource({ topic }: { topic: string }) {
  const addCaveat = useMutation(api.caveats.addCaveat);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setError(null);
    try {
      await addCaveat({ topic, content: text, url: url || undefined });
      setText(""); setUrl(""); setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save.");
    }
  };

  return (
    <div className="mt-5">
      <label className="mb-2 block text-sm font-medium" htmlFor="add-source">Add a source</label>
      <textarea id="add-source" rows={2} value={text} maxLength={600}
        onChange={(e) => { setText(e.target.value); setDone(false); }}
        placeholder="A fact that belongs on this page"
        className="textarea w-full text-sm" />
      <div className="mt-2 flex flex-wrap gap-2">
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="https://link-to-the-source" className="input input-sm min-w-0 flex-1 text-sm" />
        <button type="button" className="btn btn-sm btn-neutral" disabled={!text.trim()} onClick={() => void submit()}>Add</button>
      </div>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
      {done && <p className="mt-2 text-sm text-success">Added — readers vote on what stays near the top.</p>}
    </div>
  );
}

/** Numbered sources with votes, then reader-added ones sorted by score, then a form to add one. */
export function Sources({ statements, topic }: { statements: Statement[]; topic: string }) {
  const votes = useQuery(api.chartVotes.listAll) ?? [];
  const reader = useQuery(api.caveats.listForTopic, { topic }) ?? [];
  const readerSorted = [...reader].sort(
    (a, b) => chartScore(votes.filter((v) => v.slot === `${topic}:reader:${b._id}`))
      - chartScore(votes.filter((v) => v.slot === `${topic}:reader:${a._id}`)),
  );
  return (
    <section className="not-prose mx-auto mt-16 max-w-[680px]">
      <SectionLabel>Sources</SectionLabel>
      <ol>
        {statements.map((st, i) => (
          <SourceRow key={st.id} n={i + 1} text={st.text} url={st.url} source={st.source} slot={slotOf(topic, st.id)} votes={votes} />
        ))}
        {readerSorted.map((c, i) => (
          <SourceRow key={c._id} n={statements.length + i + 1} text={c.content} url={c.url}
            source={hostOf(c.url)}
            slot={`${topic}:reader:${c._id}`} votes={votes} reader />
        ))}
      </ol>
      <AddSource topic={topic} />
    </section>
  );
}
