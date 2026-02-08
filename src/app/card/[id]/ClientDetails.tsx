// src/app/card/[id]/ClientDetails.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { publicUrl } from "@/lib/storage";
import { ensureUser } from "@/lib/auth";
import TagInput from "@/components/TagInput";
import ImageCarousel from "@/components/ImageCarousel";
import GradeBadge from "@/components/GradeBadge";

type Card = {
  id: string;
  year: number | null;
  brand: string | null;
  card_no: string | null;
  sport: string | null;
  is_graded: boolean | null;
  grade: number | null;
  grading_company: string | null;
  grading_no: string | null;
  notes: string | null;
  player: { full_name?: string } | null;
  card_images: { storage_path: string; is_primary?: boolean | null }[] | null;
};

export default function ClientDetails({ id }: { id: string }) {
  const router = useRouter();
  const sp = useSearchParams();

  // NOTE: make sure your imports include useMemo + useRef
// import { useEffect, useMemo, useRef, useState } from "react";

const [card, setCard] = useState<Card | null>(null);
const [idx, setIdx] = useState(0);
const [open, setOpen] = useState(false);

// tags + notes UI state
const [tags, setTags] = useState<string[]>([]);
const [initialTags, setInitialTags] = useState<string[]>([]);
const [origTagIds, setOrigTagIds] = useState<string[]>([]);
const [notes, setNotes] = useState("");
const [editing, setEditing] = useState(false);
const [saving, setSaving] = useState(false);

// --- derived image urls (SAFE even when card is null) ---
const imgs = useMemo(() => {
  const list = Array.isArray(card?.card_images) ? card!.card_images! : [];
  return list as { storage_path: string; is_primary?: boolean | null }[];
}, [card]);

const urls = useMemo(() => imgs.map((i) => publicUrl(i.storage_path)), [imgs]);
const urlsLen = urls.length;
const activeUrl = urlsLen ? urls[idx] : null;

// keep idx in range if image count changes
useEffect(() => {
  if (!urlsLen) return;
  if (idx > urlsLen - 1) setIdx(0);
}, [urlsLen, idx]);

// lightbox swipe helpers
const touchStartX = useRef<number | null>(null);
const touchDeltaX = useRef(0);
const didSwipe = useRef(false);

function prevImage() {
  if (urlsLen <= 1) return;
  setIdx((i) => (i - 1 + urlsLen) % urlsLen);
}

function nextImage() {
  if (urlsLen <= 1) return;
  setIdx((i) => (i + 1) % urlsLen);
}

function onLightboxTouchStart(e: React.TouchEvent) {
  if (urlsLen <= 1) return;
  touchStartX.current = e.touches[0].clientX;
  touchDeltaX.current = 0;
  didSwipe.current = false;
}

function onLightboxTouchMove(e: React.TouchEvent) {
  if (touchStartX.current == null) return;
  touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  if (Math.abs(touchDeltaX.current) > 12) didSwipe.current = true;
}

function onLightboxTouchEnd() {
  if (touchStartX.current == null) return;

  const dx = touchDeltaX.current;
  touchStartX.current = null;
  touchDeltaX.current = 0;

  if (dx > 45) prevImage();
  else if (dx < -45) nextImage();
}

// ------- helpers -------
async function upsertTagsGetIds(labels: string[]): Promise<string[]> {
  const clean = Array.from(new Set(labels.map((t) => t.trim()).filter(Boolean)));
  if (!clean.length) return [];

  const { data: up, error: upErr } = await supabase
    .from("tags")
    .upsert(clean.map((label) => ({ label })), { onConflict: "label" })
    .select("id,label");
  if (upErr) throw upErr;

  let rows = up ?? [];
  if (!rows.length) {
    const { data: fetched, error: fErr } = await supabase
      .from("tags")
      .select("id,label")
      .in("label", clean);
    if (fErr) throw fErr;
    rows = fetched ?? [];
  }

  const map = new Map((rows as any[]).map((r) => [r.label, r.id]));
  return clean.map((l) => map.get(l)).filter(Boolean) as string[];
}

async function fetchCardAndTags() {
  const { data: c, error: cErr } = await supabase
    .from("cards")
    .select(
      `
      id, year, brand, card_no, sport,
      is_graded, grade, grading_company, grading_no, notes,
      player:players(full_name),
      card_images(storage_path, is_primary)
    `,
    )
    .eq("id", id)
    .maybeSingle();
  if (cErr) throw cErr;

  const cardRow = (c as unknown as Card) ?? null;
  setCard(cardRow);
  setNotes(cardRow?.notes ?? "");

  const { data: tagRows, error: tErr } = await supabase
    .from("card_tags")
    .select("tag_id, tags(label)")
    .eq("card_id", id);
  if (tErr) throw tErr;

  const labels = (tagRows ?? [])
    .map((r: any) => r.tags?.label as string | undefined)
    .filter(Boolean) as string[];
  const ids = (tagRows ?? []).map((r: any) => r.tag_id as string);

  setTags(labels);
  setInitialTags(labels);
  setOrigTagIds(ids);
}

// initial load
useEffect(() => {
  let cancel = false;
  (async () => {
    try {
      await fetchCardAndTags();
    } catch (e: any) {
      if (!cancel) alert(e.message ?? e);
    }
  })();
  return () => {
    cancel = true;
  };
}, [id]);

// pick the primary image by default
useEffect(() => {
  if (!card) return;
  const list = Array.isArray(card.card_images) ? card.card_images : [];
  const primaryIndex = list.findIndex((i) => i.is_primary);
  setIdx(primaryIndex === -1 ? 0 : primaryIndex);
}, [card]);

// esc closes lightbox + arrow navigation
useEffect(() => {
  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") setOpen(false);
    if (!open) return;

    if (e.key === "ArrowLeft") prevImage();
    if (e.key === "ArrowRight") nextImage();
  }

  if (open) window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [open, urlsLen]);

// ✅ IMPORTANT: only after all hooks:
if (!card)
  return <div className="py-16 text-center text-slate-500">Loading…</div>;

  const title =
    `${card.year ?? ""} ${card.brand ?? ""} #${card.card_no ?? ""}`.trim();
  const player = card.player?.full_name || "Unknown Player";
  const graded =
    card.is_graded && (card.grading_company || card.grade)
      ? `${card.grading_company ?? ""} ${card.grade ?? ""}${card.grading_no ? ` (#${card.grading_no})` : ""}`.trim()
      : "Raw";

  // ------- SAVE TAGS + NOTES -------
  async function saveTagsAndNotes() {
    if (!card) return;
    setSaving(true);
    try {
      await ensureUser();

      const desiredTagIds = await upsertTagsGetIds(tags);

      if (tags.filter((t) => t.trim()).length && desiredTagIds.length === 0) {
        alert("Could not resolve tag IDs; nothing was changed.");
        return;
      }

      const toRemove = origTagIds.filter((tid) => !desiredTagIds.includes(tid));
      const toAdd = desiredTagIds.filter((tid) => !origTagIds.includes(tid));

      if (toRemove.length) {
        const { error: delErr } = await supabase
          .from("card_tags")
          .delete()
          .eq("card_id", card.id)
          .in("tag_id", toRemove);
        if (delErr) throw delErr;
      }
      if (toAdd.length) {
        const { error: insErr } = await supabase
          .from("card_tags")
          .insert(toAdd.map((tag_id) => ({ card_id: card.id, tag_id })));
        if (insErr) throw insErr;
      }

      const nextNotes = notes.trim() ? notes.trim() : null;
      const { error: nErr } = await supabase
        .from("cards")
        .update({ notes: nextNotes })
        .eq("id", card.id);
      if (nErr) throw nErr;

      try {
        localStorage.setItem("cards_last_update", String(Date.now()));
      } catch {}

      await fetchCardAndTags();
      setEditing(false);
    } catch (e: any) {
      alert(`Save failed: ${e.message ?? e}`);
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setTags(initialTags);
    setNotes(card?.notes ?? "");
    setEditing(false);
  }

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      const q = new URLSearchParams();
      const s = sp.get("sport");
      if (s) q.set("sport", s);
      const p = sp.get("player");
      if (p) q.set("player", p);
      const y = sp.get("year");
      if (y) q.set("year", y);
      const t = sp.get("type");
      if (t) q.set("type", t);
      const tagsQ = sp.getAll("tags");
      tagsQ.forEach((tag) => q.append("tags", tag));
      router.push(q.toString() ? `/?${q.toString()}` : "/");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pb-10 pt-4 md:px-6">
      {/* Back (match Add page) */}
      <div>
        <button
          onClick={goBack}
          type="button"
          className="btn-ghost inline-flex items-center gap-2"
        >
          <span aria-hidden>←</span> Back
        </button>
      </div>

      {/* Hero (same panel style as Add page) */}
      {urls.length ? (
        <div className="panel overflow-hidden">
          <div className="panel-header">
            <div className="panel-header-accent" />
            <div className="panel-header-title">Photos</div>
            <div className="text-xs text-slate-500">
              {urls.length} image{urls.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="p-3 sm:p-4">
            <div className="mx-auto w-[92%] sm:w-[88%] md:w-[85%]">
              <ImageCarousel
                urls={urls}
                initial={idx}
                alt={title || "card"}
                onIndexChange={setIdx}
                onImageClick={() => setOpen(true)}
                className="cursor-zoom-in"
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Details panel (matches Add page panels) */}
      <div className="panel overflow-hidden">
        <div className="panel-header">
          <div className="panel-header-accent" />
          <div className="panel-header-title">Card Details</div>
          <div className="text-xs font-semibold text-slate-600">
            {card.brand ? `— ${card.brand} —` : "—"}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold text-slate-900 truncate">
                {player}
              </h1>
              <p className="mt-1 text-slate-600 truncate">{title}</p>
            </div>

            {/* Grade badge */}
            {card.is_graded && (
              <GradeBadge company={card.grading_company} grade={card.grade} />
            )}
          </div>

          {/* Status row */}
          <div className="mt-3 flex gap-2 flex-wrap">
            <span className="pill px-2.5 py-1 text-[11px]">
              {card.is_graded ? "Graded" : "Raw"}
            </span>

            <span className="pill bg-slate-100 text-slate-700 border-slate-200 px-2.5 py-1 text-[11px]">
              {card.sport || "—"}
            </span>
          </div>

          {card.is_graded && (card.grading_company || card.grading_no) && (
            <div className="mt-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">
                {card.grading_company}
              </span>
              {card.grading_no && (
                <>
                  <span className="text-slate-400"> • </span>
                  <span>Cert #{card.grading_no}</span>
                </>
              )}
            </div>
          )}

          {/* Tags & Notes panel header row */}
          <div className="mt-5 border-t border-slate-200/70 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-extrabold tracking-wide uppercase text-slate-800">
                Tags & Notes
              </div>

              {!editing ? (
                <button
                  type="button"
                  className="btn-ghost px-3 py-1.5 text-xs"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-ghost px-3 py-1.5 text-xs"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary px-3 py-1.5 text-xs"
                    onClick={saveTagsAndNotes}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              )}
            </div>

            {!editing ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {initialTags.length ? (
                    initialTags.map((t) => (
                      <span key={t} className="pill px-2.5 py-1 text-[11px]">
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">No tags</span>
                  )}
                </div>

                <div className="mt-3">
                  {card.notes ? (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {card.notes}
                    </p>
                  ) : (
                    <span className="text-sm text-slate-500">No notes</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <TagInput
                  value={tags}
                  onChange={setTags}
                  placeholder="Add a tag and press Enter (e.g., RC, Auto)"
                  suggestions={[
                    "RC",
                    "Auto",
                    "Refractor",
                    "Numbered",
                    "Patch",
                    "HOF",
                  ]}
                />
                <textarea
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-200/70"
                  rows={3}
                  placeholder="Anything special about this card…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox (leave as-is, just slightly match button style) */}
      {/* Lightbox (swipe + tap-to-close) */}
      {open && activeUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative h-[min(90vh,1000px)] w-[min(95vw,1200px)]"
            onClick={(e) => {
              e.stopPropagation();

              // tap-to-close (but not after a swipe)
              if (!didSwipe.current) setOpen(false);

              // reset for next tap
              didSwipe.current = false;
            }}
            onTouchStart={onLightboxTouchStart}
            onTouchMove={onLightboxTouchMove}
            onTouchEnd={onLightboxTouchEnd}
          >
            <Image
              src={activeUrl}
              alt={title || "card"}
              fill
              sizes="100vw"
              className="object-contain select-none"
              draggable={false}
              priority
            />

            {/* Optional tiny hint + arrows (desktop) */}
            {urls.length > 1 && (
              <>
                <button
                  type="button"
                  title="Previous"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white hover:bg-white/20"
                >
                  ‹
                </button>

                <button
                  type="button"
                  title="Next"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white hover:bg-white/20"
                >
                  ›
                </button>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
                  {idx + 1} / {urls.length}
                </div>
              </>
            )}
          </div>

          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            title="Close"
            type="button"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
