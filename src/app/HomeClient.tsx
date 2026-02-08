// src/app/HomeClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ensureUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import GradeBadge from "@/components/GradeBadge";
import SportIcon from "@/components/SportIcon";

type CardRow = {
  id: string;
  created_at: string;
  year: number | null;
  brand: string | null;
  card_no: string | null;
  sport: string | null;
  is_graded: boolean | null;
  grading_company: string | null;
  grading_no: string | null;
  grade: number | null;
  player: { full_name?: string } | null;
  card_images: { storage_path: string; is_primary?: boolean | null }[];
  card_tags?: { tags?: { label?: string | null } | null }[] | null;
  notes?: string | null;
};

type FilterKey = "sport" | "player" | "year" | "type" | "tags" | null;
type TypeFilter = "" | "graded" | "raw";

function publicUrl(path: string) {
  return supabase.storage.from("card-images").getPublicUrl(path).data.publicUrl;
}

function Pill({
  active,
  children,
  onClick,
  title,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      type="button"
      className={[
        // base (layout only)
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] ring-1",
        "transition-colors",

        // active vs inactive
        active
          ? [
              "bg-indigo-50 text-indigo-700 ring-indigo-200",
              "font-semibold",
            ].join(" ")
          : [
              "bg-white/60 text-slate-600 ring-slate-300",
              "hover:bg-indigo-50/50 hover:text-indigo-700 hover:ring-indigo-200",
            ].join(" "),
      ].join(" ")}
    >
      {/* little dot indicator */}
      <span
        className={[
          "h-2 w-2 rounded-full",
          active ? "bg-indigo-500" : "bg-slate-300",
        ].join(" ")}
        aria-hidden="true"
      />
      {children}
    </button>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 16h10l1-16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

const s = (v: unknown) => (v ?? "").toString();
const cmpStr = (a?: string | null, b?: string | null) =>
  s(a).localeCompare(s(b), undefined, { sensitivity: "base", numeric: true });
const cmpNumAsc = (a?: number | null, b?: number | null) =>
  (a ?? Number.MAX_SAFE_INTEGER) - (b ?? Number.MAX_SAFE_INTEGER);
const cmpCardNo = (a?: string | null, b?: string | null) => {
  const na = parseInt((a ?? "").replace(/[^\d]/g, ""), 10);
  const nb = parseInt((b ?? "").replace(/[^\d]/g, ""), 10);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return cmpStr(a, b);
};

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function applyFilters(
  list: CardRow[],
  opts: {
    sport?: string;
    player?: string;
    year?: string;
    type?: TypeFilter;
    tags?: string[];
  },
) {
  const { sport, player, year, type, tags } = opts;
  return list.filter((c) => {
    const sportOk = sport === undefined || !sport || c.sport === sport;
    const playerOk =
      player === undefined || !player || c.player?.full_name === player;
    const yearOk = year === undefined || !year || c.year === Number(year);
    const typeOk =
      type === undefined ||
      !type ||
      (type === "graded" ? c.is_graded === true : c.is_graded !== true);
    const labels = (c.card_tags ?? [])
      .map((ct) => ct?.tags?.label)
      .filter(Boolean) as string[];
    const tagsOk =
      tags === undefined ||
      !tags?.length ||
      tags.every((t) => labels.includes(t));
    return sportOk && playerOk && yearOk && typeOk && tagsOk;
  });
}

export default function HomeClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const [cards, setCards] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [sportFilter, setSportFilter] = useState<string>("");
  const [playerFilter, setPlayerFilter] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [openFilter, setOpenFilter] = useState<FilterKey>(null);

  useEffect(() => {
    const sURL = sp.get("sport") || "";
    const pURL = sp.get("player") || "";
    const yURL = sp.get("year") || "";
    const tParam = sp.get("type");
    const tURL: TypeFilter =
      tParam === "graded" || tParam === "raw" ? (tParam as TypeFilter) : "";
    const tagsURL = sp.getAll("tags");

    if (sURL !== sportFilter) setSportFilter(sURL);
    if (pURL !== playerFilter) setPlayerFilter(pURL);
    if (yURL !== yearFilter) setYearFilter(yURL);
    if (tURL !== typeFilter) setTypeFilter(tURL);
    if (!arraysEqual(tagsURL, tagFilter)) setTagFilter(tagsURL);
  }, [sp]);

  const lastQs = useRef<string>("");
  useEffect(() => {
    const q = new URLSearchParams();
    if (sportFilter) q.set("sport", sportFilter);
    if (playerFilter) q.set("player", playerFilter);
    if (yearFilter) q.set("year", yearFilter);
    if (typeFilter) q.set("type", typeFilter);
    if (tagFilter.length) tagFilter.forEach((t) => q.append("tags", t));
    const qs = q.toString();
    if (qs !== lastQs.current) {
      lastQs.current = qs;
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    }
  }, [
    sportFilter,
    playerFilter,
    yearFilter,
    typeFilter,
    tagFilter,
    pathname,
    router,
  ]);

  async function loadCards() {
    setLoading(true);
    await ensureUser();
    const { data } = await supabase
      .from("cards")
      .select(
        `
        id, created_at, year, brand, card_no, sport,
        is_graded, grading_company, grading_no, grade,
        player:players(full_name), 
        card_images(storage_path, is_primary),
        card_tags:card_tags(tags(label)), notes
      `,
      )
      .order("created_at", { ascending: false });

    setCards((data as unknown as CardRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadCards();
  }, []);

  useEffect(() => {
    const onShow = (e: any) => {
      if (document.visibilityState === "visible" || e?.persisted) loadCards();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "cards_last_update") loadCards();
    };
    window.addEventListener("focus", onShow);
    window.addEventListener("pageshow", onShow);
    document.addEventListener("visibilitychange", onShow as any);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onShow);
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onShow as any);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const sportOptions = useMemo(
    () =>
      Array.from(
        new Set(cards.flatMap((c) => (c.sport ? [c.sport] : []))),
      ).sort(),
    [cards],
  );

  const playerOptions = useMemo(
    () =>
      Array.from(
        new Set(
          cards.flatMap((c) =>
            c.player?.full_name ? [c.player.full_name] : [],
          ),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [cards],
  );

  const yearOptions = useMemo(
    () =>
      Array.from(
        new Set(
          cards.flatMap((c) => (typeof c.year === "number" ? [c.year] : [])),
        ),
      ).sort((a, b) => a - b),
    [cards],
  );

  const tagOptions = useMemo(
    () =>
      Array.from(
        new Set(
          cards.flatMap(
            (c) =>
              ((c.card_tags ?? [])
                .map((ct) => ct?.tags?.label)
                .filter(Boolean) as string[]) ?? [],
          ),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [cards],
  );

  const filtered = useMemo(
    () =>
      applyFilters(cards, {
        sport: sportFilter,
        player: playerFilter,
        year: yearFilter,
        type: typeFilter,
        tags: tagFilter,
      }),
    [cards, sportFilter, playerFilter, yearFilter, typeFilter, tagFilter],
  );

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort(
      (a, b) =>
        cmpStr(a.player?.full_name, b.player?.full_name) ||
        cmpNumAsc(a.year, b.year) ||
        cmpStr(a.brand, b.brand) ||
        cmpCardNo(a.card_no, b.card_no),
    );
    return list;
  }, [filtered]);

  const typeCounts = useMemo(() => {
    const base = applyFilters(cards, {
      sport: sportFilter,
      player: playerFilter,
      year: yearFilter,
      type: undefined,
      tags: tagFilter,
    });
    const graded = base.filter((c) => c.is_graded === true).length;
    const all = base.length;
    return { all, graded, raw: all - graded };
  }, [cards, sportFilter, playerFilter, yearFilter, tagFilter]);

  const sportCounts = useMemo(() => {
    const base = applyFilters(cards, {
      player: playerFilter,
      year: yearFilter,
      type: typeFilter,
      sport: undefined,
      tags: tagFilter,
    });
    const by: Record<string, number> = {};
    for (const c of base) if (c.sport) by[c.sport] = (by[c.sport] ?? 0) + 1;
    return { all: base.length, by };
  }, [cards, playerFilter, yearFilter, typeFilter, tagFilter]);

  const playerCounts = useMemo(() => {
    const base = applyFilters(cards, {
      sport: sportFilter,
      year: yearFilter,
      type: typeFilter,
      player: undefined,
      tags: tagFilter,
    });
    const by: Record<string, number> = {};
    for (const c of base) {
      const n = c.player?.full_name;
      if (n) by[n] = (by[n] ?? 0) + 1;
    }
    return { all: base.length, by };
  }, [cards, sportFilter, yearFilter, typeFilter, tagFilter]);

  const yearCounts = useMemo(() => {
    const base = applyFilters(cards, {
      sport: sportFilter,
      player: playerFilter,
      type: typeFilter,
      year: undefined,
      tags: tagFilter,
    });
    const by: Record<string, number> = {};
    for (const c of base)
      if (typeof c.year === "number")
        by[String(c.year)] = (by[String(c.year)] ?? 0) + 1;
    return { all: base.length, by };
  }, [cards, sportFilter, playerFilter, typeFilter, tagFilter]);

  const tagCounts = useMemo(() => {
    // Base set for "Any (X)" — ignores tagFilter
    const baseNoTags = applyFilters(cards, {
      sport: sportFilter,
      player: playerFilter,
      year: yearFilter,
      type: typeFilter,
      tags: undefined,
    });

    // Set used for per-tag counts — respects current tagFilter (AND semantics)
    const baseWithSelectedTags = applyFilters(cards, {
      sport: sportFilter,
      player: playerFilter,
      year: yearFilter,
      type: typeFilter,
      tags: tagFilter.length ? tagFilter : undefined,
    });

    const by: Record<string, number> = {};
    for (const c of baseWithSelectedTags) {
      const labels = (c.card_tags ?? [])
        .map((ct) => ct?.tags?.label)
        .filter(Boolean) as string[];

      for (const l of labels) {
        by[l] = (by[l] ?? 0) + 1;
      }
    }

    return {
      all: baseNoTags.length, // used by "Any (X)"
      by, // counts that respect selected tags
      matching: baseWithSelectedTags.length, // optional: current result count
    };
  }, [cards, sportFilter, playerFilter, yearFilter, typeFilter, tagFilter]);

  async function handleDelete(card: CardRow) {
    const label = `${card.player?.full_name || "Unknown Player"} • ${
      [
        card.year && String(card.year),
        card.brand,
        card.card_no && `#${card.card_no}`,
      ]
        .filter(Boolean)
        .join(" ") || "—"
    }`;
    if (
      !confirm(
        `Delete: ${label}?\n\nThis will remove the card and its photo(s).`,
      )
    )
      return;

    const { data: deleted, error } = await supabase
      .from("cards")
      .delete()
      .eq("id", card.id)
      .select("id");

    if (error || !deleted?.length) {
      alert(`Delete failed.`);
      return;
    }

    const paths = (card.card_images ?? [])
      .map((i) => i.storage_path)
      .filter(Boolean) as string[];

    if (paths.length) {
      try {
        await supabase.storage.from("card-images").remove(paths);
      } catch {}
    }

    setCards((prev) => prev.filter((c) => c.id !== card.id));
  }

  const sportLabel = sportFilter ? `Sport: ${sportFilter}` : "Sport: All";
  const playerLabel = playerFilter ? `Player: ${playerFilter}` : "Player: All";
  const yearLabel = yearFilter ? `Year: ${yearFilter}` : "Year: All";
  const typeLabel = typeFilter
    ? `Type: ${typeFilter === "graded" ? "Graded" : "Raw"}`
    : "Type: All";
  const tagsLabel = tagFilter.length
    ? `Tags: ${tagFilter.length} selected`
    : "Tags: Any";

  function openFilterDialog(key: Exclude<FilterKey, null>) {
    setOpenFilter(key);
  }
  function closeDialog() {
    setOpenFilter(null);
  }
  function chooseFilter(val: string) {
    if (openFilter === "sport") setSportFilter(val);
    if (openFilter === "player") setPlayerFilter(val);
    if (openFilter === "year") setYearFilter(val);
    if (openFilter === "type") {
      if (val === "" || val === "All") setTypeFilter("");
      else if (val === "Graded" || val === "graded") setTypeFilter("graded");
      else if (val === "Raw" || val === "raw") setTypeFilter("raw");
    }
    if (openFilter !== "tags") closeDialog();
  }
  function toggleTag(tag: string) {
    setTagFilter((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }
  function clearTags() {
    setTagFilter([]);
  }

  const currentValue =
    openFilter === "sport"
      ? sportFilter
      : openFilter === "player"
        ? playerFilter
        : openFilter === "year"
          ? yearFilter
          : openFilter === "type"
            ? typeFilter
              ? typeFilter === "graded"
                ? "Graded"
                : "Raw"
              : ""
            : "";

  const allCountForOpen =
    openFilter === "sport"
      ? sportCounts.all
      : openFilter === "player"
        ? playerCounts.all
        : openFilter === "year"
          ? yearCounts.all
          : openFilter === "type"
            ? typeCounts.all
            : openFilter === "tags"
              ? tagCounts.all
              : 0;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="sticky top-16 z-20 -mx-4 border-b border-slate-200/60 bg-slate-50/90 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-600">Filter:</span>

          <Pill
            active={!!sportFilter}
            onClick={() => openFilterDialog("sport")}
          >
            {sportLabel}
          </Pill>
          <Pill
            active={!!playerFilter}
            onClick={() => openFilterDialog("player")}
          >
            {playerLabel}
          </Pill>
          <Pill active={!!yearFilter} onClick={() => openFilterDialog("year")}>
            {yearLabel}
          </Pill>
          <Pill active={!!typeFilter} onClick={() => openFilterDialog("type")}>
            {typeLabel}
          </Pill>
          <Pill
            active={tagFilter.length > 0}
            onClick={() => openFilterDialog("tags")}
          >
            {tagsLabel}
          </Pill>

          <button
            onClick={() => {
              setSportFilter("");
              setPlayerFilter("");
              setYearFilter("");
              setTypeFilter("");
              setTagFilter([]);
            }}
            className="btn-ghost ml-auto"
            title="Clear filters"
            type="button"
          >
            Clear
          </button>
        </div>
      </div>

      {!loading && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-700">
            <span className="text-indigo-600 text-sm font-semibold">
              {sorted.length}
            </span>{" "}
            of {cards.length} cards
          </div>

          {(sportFilter ||
            playerFilter ||
            yearFilter ||
            typeFilter ||
            tagFilter.length > 0) && (
            <span className="text-xs font-medium text-slate-500">
              Filters on
            </span>
          )}
        </div>
      )}
      {loading && (
        <div className="py-16 text-center text-slate-500">Loading…</div>
      )}

      {/* LIST */}
      <div className="panel overflow-hidden">
        <div className="divide-y divide-slate-200/70">
          {sorted.map((c) => {
            const imgs = Array.isArray(c.card_images) ? c.card_images : [];
            const chosen = imgs.find((i) => i.is_primary) ?? imgs[0];
            const url = chosen ? publicUrl(chosen.storage_path) : null;

            const title =
              `${c.year ?? ""} ${c.brand ?? ""} #${c.card_no ?? ""}`.trim() ||
              "—";

            const tagLabels = (c.card_tags ?? [])
              .map((ct) => ct?.tags?.label)
              .filter(Boolean) as string[];

            // show up to 3 tags, then "+N"
            const shownTags = tagLabels.slice(0, 3);
            const extraTagCount = Math.max(
              0,
              tagLabels.length - shownTags.length,
            );

            const query: Record<string, string | string[]> = {};
            if (sportFilter) query.sport = sportFilter;
            if (playerFilter) query.player = playerFilter;
            if (yearFilter) query.year = yearFilter;
            if (typeFilter) query.type = typeFilter;
            if (tagFilter.length) query.tags = tagFilter;

            return (
              <Link
                key={c.id}
                href={{ pathname: `/card/${c.id}`, query }}
                className="block px-4 py-2.5 sm:px-5 sm:py-3 hover:bg-slate-50/60 transition focus:outline-none focus:ring-2 focus:ring-indigo-300/60"
                title="Open details"
              >
                <div className="flex items-center gap-3">
                  {/* image */}
                  <div className="relative h-[72px] w-[72px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shrink-0">
                    {url && (
                      <Image
                        src={url}
                        alt=""
                        fill
                        sizes="72px"
                        className="object-contain"
                      />
                    )}
                  </div>

                  {/* CONTENT GROUP (text + optional badge) */}
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {/* text stack */}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-slate-900">
                        {c.player?.full_name || "Unknown Player"}
                      </div>

                      <div className="truncate text-xs text-slate-600">
                        {title}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {/* sport pill */}
                        {c.sport && <SportIcon sport={c.sport} />}

                        {/* notes */}
                        {c.notes && (
                          <span
                            className="text-slate-500 text-xs truncate max-w-[160px]"
                            title={c.notes}
                          >
                            {c.notes}
                          </span>
                        )}

                        {/* tag pills */}
                        {shownTags.map((t) => (
                          <span
                            key={t}
                            className="pill bg-white/60 text-slate-600 border-slate-300 px-2.5 py-1 text-[11px]"
                            title={t}
                          >
                            {t}
                          </span>
                        ))}

                        {/* +N more */}
                        {extraTagCount > 0 && (
                          <span className="pill bg-white/60 text-slate-500 border-slate-300 px-2.5 py-1 text-[11px]">
                            +{extraTagCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* badge lives inside the content group so it doesn't steal column width */}
                    {c.is_graded && c.grade != null && (
                      <GradeBadge
                        company={c.grading_company}
                        grade={c.grade}
                        size="sm"
                        className="mt-[2px] shrink-0"
                      />
                    )}
                  </div>

                  {/* delete */}
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      title="Delete"
                      aria-label="Delete card"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(c);
                      }}
                      className="
                                inline-flex h-9 w-9 items-center justify-center rounded-lg
                                border border-transparent
                                text-slate-400
                                hover:text-red-600 hover:bg-red-50 hover:border-red-200
                                focus:outline-none focus:ring-2 focus:ring-red-200/70
                                transition
                              "
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}

          {!loading && sorted.length === 0 && (
            <div className="py-16 text-center text-slate-500">
              No cards match your filters.{" "}
              <button
                className="link"
                onClick={() => {
                  setSportFilter("");
                  setPlayerFilter("");
                  setYearFilter("");
                  setTypeFilter("");
                  setTagFilter([]);
                }}
                type="button"
              >
                Clear filters
              </button>
              .
            </div>
          )}
        </div>
      </div>

      {openFilter && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          onClick={closeDialog}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 text-sm font-semibold text-slate-800">
              {openFilter === "sport"
                ? "Select Sport"
                : openFilter === "player"
                  ? "Select Player"
                  : openFilter === "year"
                    ? "Select Year"
                    : openFilter === "type"
                      ? "Select Type"
                      : "Select Tags"}
            </div>

            {/* list */}
            <div className="max-h-[50vh] overflow-auto space-y-2 pr-1">
              <button
                onClick={() => {
                  openFilter === "tags" ? setTagFilter([]) : chooseFilter("");
                }}
                className={[
                  "w-full text-left rounded-xl border px-3 py-2.5",
                  "text-sm transition",
                  "focus:outline-none focus:ring-2 focus:ring-indigo-300/60",
                  openFilter === "tags"
                    ? tagFilter.length === 0
                      ? "border-indigo-200 bg-indigo-50/70 text-indigo-800"
                      : "border-slate-200 bg-white text-slate-800 hover:bg-indigo-50/40 hover:border-indigo-200"
                    : openFilter === "type"
                      ? currentValue === "" || currentValue === "All"
                        ? "border-indigo-200 bg-indigo-50/70 text-indigo-800"
                        : "border-slate-200 bg-white text-slate-800 hover:bg-indigo-50/40 hover:border-indigo-200"
                      : currentValue === ""
                        ? "border-indigo-200 bg-indigo-50/70 text-indigo-800"
                        : "border-slate-200 bg-white text-slate-800 hover:bg-indigo-50/40 hover:border-indigo-200",
                ].join(" ")}
                type="button"
              >
                {openFilter === "tags" ? "Any" : "All"} ({allCountForOpen})
              </button>

              {(openFilter === "sport"
                ? sportOptions
                : openFilter === "player"
                  ? playerOptions
                  : openFilter === "year"
                    ? yearOptions.map(String)
                    : openFilter === "type"
                      ? ["Graded", "Raw"]
                      : tagOptions
              ).map((opt) => {
                let count = 0;
                if (openFilter === "type")
                  count = opt === "Graded" ? typeCounts.graded : typeCounts.raw;
                else if (openFilter === "sport")
                  count = sportCounts.by[opt] ?? 0;
                else if (openFilter === "player")
                  count = playerCounts.by[opt] ?? 0;
                else if (openFilter === "year") count = yearCounts.by[opt] ?? 0;
                else if (openFilter === "tags") count = tagCounts.by[opt] ?? 0;

                const isActive =
                  openFilter === "tags"
                    ? tagFilter.includes(opt)
                    : currentValue === opt;

                return (
                  <button
                    key={opt}
                    onClick={() => {
                      openFilter === "tags"
                        ? toggleTag(opt)
                        : chooseFilter(opt);
                    }}
                    className={[
                      "w-full text-left rounded-xl border px-3 py-2.5",
                      "text-sm transition",
                      "focus:outline-none focus:ring-2 focus:ring-indigo-300/60",
                      isActive
                        ? "border-indigo-200 bg-indigo-50/70 text-indigo-800"
                        : "border-slate-200 bg-white text-slate-800 hover:bg-indigo-50/40 hover:border-indigo-200",
                    ].join(" ")}
                    type="button"
                  >
                    {openFilter === "tags" && (isActive ? "✓ " : "")}
                    {opt} ({count})
                  </button>
                );
              })}
            </div>

            {/* footer */}
            <div className="mt-3 flex justify-end gap-2 border-t border-slate-200/70 pt-3">
              {openFilter === "tags" && (
                <button className="btn-ghost" onClick={clearTags} type="button">
                  Clear
                </button>
              )}
              <button
                className="btn-primary px-4 py-2"
                onClick={closeDialog}
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
