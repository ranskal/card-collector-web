// src/app/add/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ensureUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import CropperModal from "@/components/CropperModal";
import TagInput from "@/components/TagInput";

type Player = { id: string; full_name: string };

const DEFAULT_SPORTS = [
  "Baseball",
  "Basketball",
  "Football",
  "Hockey",
  "Miscellaneous",
] as const;

const DEFAULT_BRANDS = ["Topps", "Fleer", "Donruss", "Philadelphia"] as const;

const DEFAULT_COMPANIES = ["PSA", "SGC", "BVG", "Beckett", "SWG", "CGC"] as const;

type LocalImg = { file: File; url: string; isPrimary: boolean };

// ---- helpers: merge + normalize ----
function uniqSort(list: string[]) {
  return Array.from(new Set(list.map((s) => s.trim()).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b),
  );
}

function normalizeTitle(s: string) {
  // "topps chrome" -> "Topps Chrome"
  const out = s
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return out;
}

function normalizeUpper(s: string) {
  // "psa" -> "PSA"
  return s.trim().replace(/\s+/g, " ").toUpperCase();
}

function normalizeValue(kind: "sport" | "brand" | "company", raw: string) {
  const s = raw.trim();
  if (!s) return "";
  if (kind === "company") return normalizeUpper(s); // PSA/SGC/CGC
  return normalizeTitle(s); // sport + brand
}

async function loadDistinctStringColumn(
  table: string,
  column: string,
  kind: "sport" | "brand" | "company",
): Promise<string[]> {
  const { data, error } = await supabase
    .from(table)
    .select(column)
    .not(column, "is", null);

  if (error) {
    console.error(`Failed to load ${table}.${column}`, error);
    return [];
  }

  const normalized = (data ?? [])
    .map((r: any) => normalizeValue(kind, String(r?.[column] ?? "")))
    .filter(Boolean);

  return uniqSort(normalized);
}

export default function AddPage() {
  const router = useRouter();

  const [players, setPlayers] = useState<Player[]>([]);
  const [playerChoice, setPlayerChoice] = useState<string>(""); // id or '__OTHER__'
  const [newPlayer, setNewPlayer] = useState("");

  // Start with defaults so selects never render empty
  const [sports, setSports] = useState<string[]>([...DEFAULT_SPORTS]);
  const [brands, setBrands] = useState<string[]>([...DEFAULT_BRANDS]);
  const [companies, setCompanies] = useState<string[]>([...DEFAULT_COMPANIES]);

  // Choices should also start valid
  const [sportChoice, setSportChoice] = useState<string>(DEFAULT_SPORTS[0]);
  const [brandChoice, setBrandChoice] = useState<string>(DEFAULT_BRANDS[0]);

  const [customSport, setCustomSport] = useState("");
  const [customBrand, setCustomBrand] = useState("");

  const [year, setYear] = useState("");
  const [cardNo, setCardNo] = useState("");

  const [isGraded, setIsGraded] = useState(false);
  const [companyChoice, setCompanyChoice] = useState<string>(""); // '' or company or '__OTHER__'
  const [customCompany, setCustomCompany] = useState("");
  const [gradingNo, setGradingNo] = useState("");
  const [grade, setGrade] = useState("");

  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const [images, setImages] = useState<LocalImg[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [tmpCardId] = useState(() => String(Date.now()));

  // ---- load players ----
  useEffect(() => {
    (async () => {
      const u = await ensureUser();
      console.log("[add] user id:", u.id);

      const { data } = await supabase
        .from("players")
        .select("id, full_name")
        .order("full_name", { ascending: true });

      setPlayers(data ?? []);
      if (data && data.length) setPlayerChoice(data[0].id);
    })();
  }, []);

  // ---- load dropdown values from existing cards (merge with defaults) ----
  useEffect(() => {
    (async () => {
      const [dbBrands, dbSports, dbCompanies] = await Promise.all([
        loadDistinctStringColumn("cards", "brand", "brand"),
        loadDistinctStringColumn("cards", "sport", "sport"),
        loadDistinctStringColumn("cards", "grading_company", "company"),
      ]);

      const mergedBrands = uniqSort([
        ...DEFAULT_BRANDS.map((x) => normalizeValue("brand", x)),
        ...dbBrands,
      ]);

      const mergedSports = uniqSort([
        ...DEFAULT_SPORTS.map((x) => normalizeValue("sport", x)),
        ...dbSports,
      ]);

      const mergedCompanies = uniqSort([
        ...DEFAULT_COMPANIES.map((x) => normalizeValue("company", x)),
        ...dbCompanies,
      ]);

      setBrands(mergedBrands);
      setSports(mergedSports);
      setCompanies(mergedCompanies);

      setBrandChoice((prev) =>
        prev && mergedBrands.includes(prev) ? prev : mergedBrands[0] || "",
      );
      setSportChoice((prev) =>
        prev && mergedSports.includes(prev) ? prev : mergedSports[0] || "",
      );
      setCompanyChoice((prev) =>
        prev && mergedCompanies.includes(prev) ? prev : prev,
      );
    })();
  }, []);

  const showNewPlayer = playerChoice === "__OTHER__";
  const showNewSport = sportChoice === "__OTHER_SPORT__";
  const showNewBrand = brandChoice === "__OTHER_BRAND__";
  const showNewCompany = isGraded && companyChoice === "__OTHER_COMPANY__";

  function addSport() {
    const s = normalizeValue("sport", customSport);
    if (!s) return;
    if (!sports.includes(s)) setSports((prev) => uniqSort([...prev, s]));
    setSportChoice(s);
    setCustomSport("");
  }

  function addBrand() {
    const b = normalizeValue("brand", customBrand);
    if (!b) return;
    if (!brands.includes(b)) setBrands((prev) => uniqSort([...prev, b]));
    setBrandChoice(b);
    setCustomBrand("");
  }

  function addCompany() {
    const c = normalizeValue("company", customCompany);
    if (!c) return;
    if (!companies.includes(c)) setCompanies((prev) => uniqSort([...prev, c]));
    setCompanyChoice(c);
    setCustomCompany("");
  }

  function openPicker() {
    fileInputRef.current?.click();
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setCropQueue(files);
    setActiveFile(files[0]);
  }

  async function handleCropped(blob: Blob) {
    const croppedFile = new File([blob], `crop-${Date.now()}.jpg`, {
      type: blob.type || "image/jpeg",
    });
    const url = URL.createObjectURL(croppedFile);
    setImages((prev) => {
      const isFirst = prev.length === 0;
      return [...prev, { file: croppedFile, url, isPrimary: isFirst }];
    });
    setCropQueue((q) => {
      const [, ...rest] = q;
      setActiveFile(rest[0] ?? null);
      return rest;
    });
  }

  function cancelCrop() {
    setCropQueue((q) => {
      const [, ...rest] = q;
      setActiveFile(rest[0] ?? null);
      return rest;
    });
  }

  function makePrimary(i: number) {
    setImages((prev) => prev.map((im, idx) => ({ ...im, isPrimary: idx === i })));
  }

  function removeImage(i: number) {
    setImages((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      if (next.length && !next.some((n) => n.isPrimary)) next[0].isPrimary = true;
      return next;
    });
  }

  function clearImages() {
    setImages((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
  }

  // ---- TAGS: ensure all labels exist, then return their ids ----
  async function getTagIdsEnsure(labels: string[]): Promise<string[]> {
    if (!labels.length) return [];

    const { data: existing, error: exErr } = await supabase
      .from("tags")
      .select("id,label")
      .in("label", labels);

    if (exErr) throw exErr;

    const have = new Map<string, string>(
      (existing ?? []).map((r: any) => [r.label as string, r.id as string]),
    );

    const toInsert = labels
      .filter((l) => !have.has(l))
      .map((label) => ({ label }));

    if (toInsert.length) {
      const { data: inserted, error: insErr } = await supabase
        .from("tags")
        .insert(toInsert)
        .select("id,label");
      if (insErr) throw insErr;
      for (const r of inserted ?? []) have.set(r.label as string, r.id as string);
    }

    return labels.map((l) => have.get(l)).filter(Boolean) as string[];
  }

  async function save() {
    try {
      const u = await ensureUser();

      let playerId = playerChoice;
      if (!playerId || playerId === "__OTHER__") {
        const name = newPlayer.trim();
        if (!name) return alert("Please enter a player name.");

        const { data: existing } = await supabase
          .from("players")
          .select("id")
          .eq("full_name", name)
          .maybeSingle();

        if (existing) {
          playerId = existing.id;
        } else {
          const { data: inserted, error } = await supabase
            .from("players")
            .insert({ full_name: name })
            .select()
            .single();

          if (error || !inserted)
            throw error ?? new Error("Failed to insert player");

          playerId = inserted.id;
          setPlayers((prev) =>
            [...prev, { id: inserted.id, full_name: name }].sort((a, b) =>
              a.full_name.localeCompare(b.full_name),
            ),
          );
        }
      }

      if (!year.trim() || isNaN(+year)) return alert("Year must be a number.");

      let gradingCompany: string | null = null;
      if (isGraded) {
        if (!companyChoice) return alert("Select a grading company or choose Other…");
        const raw =
          companyChoice === "__OTHER_COMPANY__" ? customCompany : companyChoice;

        gradingCompany = normalizeValue("company", raw) || null;
        if (!gradingCompany) return alert("Enter a grading company.");
      }

      const resolvedSportRaw = showNewSport ? customSport : sportChoice;
      const resolvedBrandRaw = showNewBrand ? customBrand : brandChoice;

      const resolvedSport = normalizeValue("sport", resolvedSportRaw);
      const resolvedBrand = normalizeValue("brand", resolvedBrandRaw);

      const { data: card, error: cErr } = await supabase
        .from("cards")
        .insert({
          player_id: playerId,
          sport: resolvedSport || null,
          brand: resolvedBrand || null,
          year: parseInt(year, 10),
          card_no: cardNo || null,
          is_graded: isGraded,
          grading_company: gradingCompany,
          grading_no: isGraded ? gradingNo || null : null,
          grade: isGraded && grade ? Number(grade) : null,
          notes: notes.trim() ? notes.trim() : null,
        })
        .select()
        .single();

      if (cErr || !card) throw cErr ?? new Error("Failed to insert card");

      // ---- TAGS: read existing → insert missing → link all ----
      const clean = uniqSort(tags.map((t) => t.trim()).filter(Boolean));
      if (clean.length) {
        const tagIds = await getTagIdsEnsure(clean);
        if (tagIds.length) {
          const payload = tagIds.map((tag_id) => ({
            card_id: card.id,
            tag_id,
          }));
          const { error: linkErr } = await supabase.from("card_tags").insert(payload);
          if (linkErr) throw linkErr;
        }
      }

      // images
      if (images.length) {
        const uploadedPaths: { path: string; isPrimary: boolean }[] = [];
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          const ext = img.file.name.split(".").pop()?.toLowerCase() || "jpg";
          const path = `${u.id}/${tmpCardId}/${Date.now()}-${i}.${ext}`;

          const { error } = await supabase.storage.from("card-images").upload(path, img.file, {
            upsert: false,
            contentType: img.file.type || "image/jpeg",
          });
          if (error) throw error;

          uploadedPaths.push({ path, isPrimary: img.isPrimary });
        }

        const payload = uploadedPaths.map((p) => ({
          card_id: card.id,
          storage_path: p.path,
          is_primary: p.isPrimary,
        }));

        const { error: imgErr } = await supabase.from("card_images").insert(payload);
        if (imgErr) throw imgErr;
      }

      try {
        localStorage.setItem("cards_last_update", String(Date.now()));
      } catch {}

      (document.activeElement as HTMLElement | null)?.blur?.();
      alert("Saved!");
      router.push("/");
    } catch (e: any) {
      alert(`Save failed: ${e?.message || e}`);
      console.error(e);
    }
  }

  const titlePreview = useMemo(() => {
    const b =
      brandChoice && brandChoice !== "__OTHER_BRAND__" ? brandChoice : customBrand || "—";
    return `${year || "—"} ${b} #${cardNo || "—"}`;
  }, [year, brandChoice, customBrand, cardNo]);

  return (
    <div className="min-h-[calc(100vh-64px)]">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Add Card
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Add the basics first — you can always edit tags/notes later.
            </p>
          </div>

          <button className="btn-ghost" onClick={() => router.push("/")} type="button">
            Back
          </button>
        </div>

        <div className="grid gap-6">
          {/* SECTION: Card Info */}
          <section className="panel">
            <div className="panel-header">
              <div className="panel-header-accent" />
              <div className="panel-header-title">Card Info</div>
              <div className="panel-header-meta">{titlePreview}</div>
            </div>

            <div className="p-5 grid gap-4">
              {/* Player */}
              <div className="grid gap-2">
                <label>Player</label>
                <select
                  className="input"
                  value={playerChoice}
                  onChange={(e) => setPlayerChoice(e.target.value)}
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                  <option value="__OTHER__">Other…</option>
                </select>

                {showNewPlayer && (
                  <input
                    className="input"
                    placeholder="New player name"
                    value={newPlayer}
                    onChange={(e) => setNewPlayer(e.target.value)}
                  />
                )}
              </div>

              {/* Sport / Brand */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label>Sport</label>
                  <select
                    className="input"
                    value={sportChoice}
                    onChange={(e) => setSportChoice(e.target.value)}
                  >
                    {sports.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value="__OTHER_SPORT__">Other…</option>
                  </select>

                  {showNewSport && (
                    <div className="flex gap-2 items-stretch">
                      <input
                        className="input flex-1"
                        placeholder="Custom sport"
                        value={customSport}
                        onChange={(e) => setCustomSport(e.target.value)}
                      />
                      <button className="btn-ghost" onClick={addSport} type="button">
                        Add
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <label>Brand</label>
                  <select
                    className="input"
                    value={brandChoice}
                    onChange={(e) => setBrandChoice(e.target.value)}
                  >
                    {brands.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                    <option value="__OTHER_BRAND__">Other…</option>
                  </select>

                  {showNewBrand && (
                    <div className="flex gap-2 items-stretch">
                      <input
                        className="input flex-1"
                        placeholder="Custom brand"
                        value={customBrand}
                        onChange={(e) => setCustomBrand(e.target.value)}
                      />
                      <button className="btn-ghost" onClick={addBrand} type="button">
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Year / Card # / Graded toggle */}
              <div className="grid md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
                <div className="grid gap-2">
                  <label>Year</label>
                  <input
                    className="input"
                    placeholder="1970"
                    inputMode="numeric"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <label>Card #</label>
                  <input
                    className="input"
                    placeholder="175"
                    value={cardNo}
                    onChange={(e) => setCardNo(e.target.value)}
                  />
                </div>

                <div className="flex items-end">
                  <button
                    className={isGraded ? "btn-primary" : "btn-ghost"}
                    onClick={() => setIsGraded((v) => !v)}
                    type="button"
                  >
                    {isGraded ? "Graded: ON" : "Graded: OFF"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION: Grading */}
          {isGraded && (
            <section className="panel">
              <div className="panel-header">
                <div className="panel-header-accent" />
                <div className="panel-header-title">Grading</div>
                <div className="panel-header-meta">Optional but recommended</div>
              </div>

              <div className="p-5 grid gap-4">
                <div className="grid gap-2">
                  <label>Grading Company</label>
                  <select
                    className="input"
                    value={companyChoice}
                    onChange={(e) => setCompanyChoice(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {companies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__OTHER_COMPANY__">Other…</option>
                  </select>

                  {showNewCompany && (
                    <div className="flex gap-2 items-stretch">
                      <input
                        className="input flex-1"
                        placeholder="Custom company"
                        value={customCompany}
                        onChange={(e) => setCustomCompany(e.target.value)}
                      />
                      <button className="btn-ghost" onClick={addCompany} type="button">
                        Add
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label>Certification #</label>
                    <input
                      className="input"
                      value={gradingNo}
                      onChange={(e) => setGradingNo(e.target.value)}
                      placeholder="e.g. 106519951"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label>Grade</label>
                    <input
                      className="input"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      placeholder="e.g. 6.5"
                      inputMode="decimal"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION: Tags & Notes */}
          <section className="panel">
            <div className="panel-header">
              <div className="panel-header-accent" />
              <div className="panel-header-title">Tags & Notes</div>
              <div className="panel-header-meta">Helps searching later</div>
            </div>

            <div className="p-5 grid gap-4">
              <div className="grid gap-2">
                <label>Tags</label>
                <TagInput
                  value={tags}
                  onChange={setTags}
                  placeholder="Add a tag and press Enter (e.g., RC, Auto)"
                  suggestions={["RC", "Auto", "Refractor", "Numbered", "Patch", "HOF"]}
                />
                <p className="hint">Tip: keep tags short (RC, Auto, HOF, etc.)</p>
              </div>

              <div className="grid gap-2">
                <label>Notes</label>
                <textarea
                  className="input min-h-[110px]"
                  rows={4}
                  placeholder="Anything special about this card…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* SECTION: Photos */}
          <section className="panel">
            <div className="panel-header">
              <div className="panel-header-accent" />
              <div className="panel-header-title">Photos</div>
              <div className="panel-header-meta">Front / Back / Closeups</div>
            </div>

            <div className="p-5">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={onPickFiles}
                />
                <button className="btn-ghost" onClick={openPicker} type="button">
                  {images.length ? "Add More Photos" : "Add Photo(s)"}
                </button>
                {images.length > 0 && (
                  <button className="btn-ghost" onClick={clearImages} type="button">
                    Clear All
                  </button>
                )}
              </div>

              {images.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                  No photos yet. Add front/back (and any closeups) if you want.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {images.map((im, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-white p-2">
                      <div className="rounded-lg bg-slate-50 border border-slate-200 overflow-hidden">
                        <img
                          src={im.url}
                          alt="card"
                          className="w-full h-[150px] object-contain"
                        />
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {im.isPrimary ? (
                          <span className="pill">Primary</span>
                        ) : (
                          <button
                            className="btn-ghost text-xs px-3 py-1.5"
                            onClick={() => makePrimary(i)}
                            type="button"
                          >
                            Make Primary
                          </button>
                        )}

                        <button
                          className="btn-ghost text-xs px-3 py-1.5"
                          onClick={() => removeImage(i)}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Sticky save bar */}
          <div className="sticky bottom-3">
            <div className="panel px-4 py-3 flex items-center justify-between bg-white/90 backdrop-blur">
              <div className="text-sm text-slate-600">Ready to save this card?</div>
              <button className="btn-primary px-6 py-2" onClick={save} type="button">
                Save
              </button>
            </div>
          </div>
        </div>

        {activeFile && (
          <CropperModal
            file={activeFile}
            aspect={2 / 3}
            onCancel={cancelCrop}
            onDone={handleCropped}
          />
        )}
      </div>
    </div>
  );
}