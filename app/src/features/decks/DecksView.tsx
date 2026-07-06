import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMyDecks } from "../../api/hooks";
import { getDeck, getDeckVersions, deleteDeck, type DeckVersion } from "../../api/decks";
import { useToast } from "../../components/Toast";
import { Icon } from "../../components/Icon";
import { ManaCost } from "../../components/ManaCost";
import { HoverPreview, useHoverPreview, type HoverCard } from "../../components/HoverPreview";
import { CardImageModal } from "../../components/CardImageModal";
import { computeManaCurve, groupCardsByType, isLand } from "../../lib/cards";
import type { Deck, DeckCardEntry } from "../../types";

const COLORS = ["W", "U", "B", "R", "G"] as const;

// ---- Small shared sub-components ----

function ColorDots({ colors, size = 10 }: { colors: string[]; size?: number }) {
  if (!colors || colors.length === 0) return null;
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
      {colors.map((c) => (
        <span
          key={c}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: `var(--mana-${c.toLowerCase()})`,
            display: "inline-block",
            flexShrink: 0,
          }}
        />
      ))}
    </span>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="search">
      <Icon name="search" size={14} />
      <input
        className="input"
        placeholder={placeholder ?? "Search…"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%" }}
      />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-serif)", fontSize: 32, fontStyle: "italic", color: "var(--fg-0)", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function ManaCurveBar({ cards }: { cards: DeckCardEntry[] }) {
  const curve = computeManaCurve(cards);
  const buckets: Array<{ label: string; key: string | number }> = [
    { label: "0", key: 0 }, { label: "1", key: 1 }, { label: "2", key: 2 },
    { label: "3", key: 3 }, { label: "4", key: 4 }, { label: "5", key: 5 }, { label: "6+", key: "6+" },
  ];
  const max = Math.max(...buckets.map((b) => (curve as any)[b.key] ?? 0), 1);
  return (
    <div className="mana-curve">
      {buckets.map((b) => {
        const count = (curve as any)[b.key] ?? 0;
        const pct = Math.round((count / max) * 100);
        return (
          <div key={b.label} className="curve-bar-wrap" title={`${b.label}: ${count}`}>
            <div className="curve-bar-area">
              <div className="curve-bar" style={{ height: `${pct}%`, minHeight: count > 0 ? 2 : 0 }} />
            </div>
            <div className="curve-label">{b.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function DeckCardList({
  cards,
  onRemove,
  onAdd,
  onHoverEnter,
  onHoverMove,
  onHoverLeave,
  onCardClick,
}: {
  cards: DeckCardEntry[];
  onRemove?: (cardId: string) => void;
  onAdd?: (cardId: string) => void;
  onHoverEnter?: (e: React.MouseEvent, card: DeckCardEntry) => void;
  onHoverMove?: (e: React.MouseEvent) => void;
  onHoverLeave?: () => void;
  onCardClick?: (card: DeckCardEntry) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {groupCardsByType(cards).map(({ group: grp, cards: items }) => {
        const total = items.reduce((s, c) => s + (c.quantity ?? 1), 0);
        return (
          <div key={grp}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
              <span className="eyebrow">{grp}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>{total}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", border: "1px solid var(--line-1)", borderRadius: 6, overflow: "hidden" }}>
              {items.map((card) => (
                <div
                  key={card.cardId}
                  className="deck-card-row"
                  onMouseEnter={(e) => onHoverEnter?.(e, card)}
                  onMouseMove={onHoverMove}
                  onMouseLeave={onHoverLeave}
                  onClick={() => onCardClick?.(card)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderBottom: "1px solid var(--line-1)", cursor: onCardClick ? "pointer" : undefined }}
                >
                  <span className="deck-card-qty">{card.quantity ?? 1}×</span>
                  <span className="deck-card-name">{card.name}</span>
                  <ManaCost cost={card.manaCost ?? ""} />
                  {onRemove && (
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={(e) => { e.stopPropagation(); onRemove(card.cardId); }}
                      title="Remove one"
                    >
                      <Icon name="minus" size={12} />
                    </button>
                  )}
                  {onAdd && (
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={(e) => { e.stopPropagation(); onAdd(card.cardId); }}
                      title="Add one"
                    >
                      <Icon name="plus" size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Main view ----

export function DecksView() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { decks, error } = useMyDecks(refreshKey);
  const navigate = useNavigate();
  const toast = useToast();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [colorFilter, setColorFilter] = useState<string[]>([]);

  const hover = useHoverPreview();
  const [enlarged, setEnlarged] = useState<HoverCard | null>(null);

  // Full deck + versions loaded on selection
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [versions, setVersions] = useState<DeckVersion[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // When deck list loads, auto-select first
  useEffect(() => {
    if (decks && decks.length > 0 && !selectedId) {
      setSelectedId(decks[0].id);
    }
  }, [decks, selectedId]);

  // Load detail when selection changes
  useEffect(() => {
    if (!selectedId) { setSelectedDeck(null); setVersions([]); return; }
    let cancelled = false;
    setDetailLoading(true);
    Promise.all([getDeck(selectedId), getDeckVersions(selectedId)])
      .then(([deck, vers]) => { if (!cancelled) { setSelectedDeck(deck); setVersions(vers); } })
      .catch((e) => { if (!cancelled) toast(e.message, "error"); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [selectedId, toast]);

  const filteredDecks = useMemo(() => {
    if (!decks) return [];
    return decks.filter((d) => {
      if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (colorFilter.length && !colorFilter.every((c) => d.colors.includes(c))) return false;
      return true;
    });
  }, [decks, search, colorFilter]);

  function toggleColor(c: string) {
    setColorFilter((f) => f.includes(c) ? f.filter((x) => x !== c) : [...f, c]);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this deck?")) return;
    try {
      await deleteDeck(id);
      toast("Deck deleted");
      setSelectedId(null);
      setSelectedDeck(null);
      setVersions([]);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  const avgCmc = useMemo(() => {
    if (!selectedDeck || selectedDeck.cards.length === 0) return 0;
    const nonLands = selectedDeck.cards.filter((c) => !isLand(c.typeLine ?? ""));
    if (nonLands.length === 0) return 0;
    const total = nonLands.reduce((s, c) => s + (c.cmc ?? 0) * (c.quantity ?? 1), 0);
    const count = nonLands.reduce((s, c) => s + (c.quantity ?? 1), 0);
    return count > 0 ? total / count : 0;
  }, [selectedDeck]);

  const colorBreakdown = useMemo(() => {
    if (!selectedDeck) return {} as Record<string, number>;
    const totals: Record<string, number> = {};
    for (const card of selectedDeck.cards) {
      const colors = card.colors ?? [];
      if (colors.length === 0) {
        totals["C"] = (totals["C"] ?? 0) + (card.quantity ?? 1);
      } else {
        for (const c of colors) {
          totals[c] = (totals[c] ?? 0) + (card.quantity ?? 1);
        }
      }
    }
    return totals;
  }, [selectedDeck]);

  const selectedSummary = decks?.find((d) => d.id === selectedId) ?? null;

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Deck Library</div>
        <span className="topbar-sub">{decks ? `${decks.length} decks` : ""}</span>
        <div className="topbar-spacer" />
        <button className="btn btn-primary" onClick={() => navigate("/decks/new")}>
          <Icon name="plus" size={14} /> New deck
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", flex: 1, overflow: "hidden" }}>

        {/* Left — deck list */}
        <aside style={{ borderRight: "1px solid var(--line-1)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, borderBottom: "1px solid var(--line-1)" }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Search decks…" />
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleColor(c)}
                  className="btn btn-icon btn-sm"
                  title={`Filter ${c}`}
                  style={{
                    padding: 0, width: 26, height: 26,
                    background: colorFilter.includes(c) ? `var(--mana-${c.toLowerCase()})` : "var(--bg-2)",
                    borderColor: colorFilter.includes(c) ? `var(--mana-${c.toLowerCase()})` : "var(--line-2)",
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: colorFilter.includes(c) ? "oklch(0.18 0 0)" : "var(--fg-2)" }}>{c}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {error && <div style={{ padding: 14, color: "var(--bad)", fontSize: 12 }}>{error}</div>}
            {!decks && !error && <div style={{ padding: 14, color: "var(--fg-3)" }}>Loading…</div>}
            {decks && decks.length === 0 && (
              <div className="empty" style={{ padding: 24 }}>
                <div className="empty-title">No decks yet</div>
              </div>
            )}
            {filteredDecks.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "12px 14px",
                  background: d.id === selectedId ? "var(--bg-2)" : "transparent",
                  borderLeft: d.id === selectedId ? "2px solid var(--accent)" : "2px solid transparent",
                  border: "none",
                  borderBottom: "1px solid var(--line-1)",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontWeight: 600, color: d.id === selectedId ? "var(--fg-0)" : "var(--fg-1)" }}>{d.name}</span>
                  <ColorDots colors={d.colors} />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
                  <span>{d.cardCount} cards</span>
                  <span>·</span>
                  <span>{d.format}</span>
                  <span>·</span>
                  <span>v{d.version}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Right — deck detail */}
        <main style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {!selectedId && (
            <div className="empty">
              <div className="empty-title">Select a deck</div>
            </div>
          )}
          {selectedId && detailLoading && (
            <div style={{ padding: 24, color: "var(--fg-3)" }}>Loading…</div>
          )}
          {selectedId && !detailLoading && selectedDeck && (
            <>
              {/* Header */}
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--line-1)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ColorDots colors={selectedSummary?.colors ?? []} size={12} />
                      <span className="eyebrow">{selectedDeck.format}</span>
                    </div>
                    <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 36, fontStyle: "italic", margin: "4px 0 8px", color: "var(--fg-0)", fontWeight: 400 }}>
                      {selectedDeck.name}
                    </h1>
                    {selectedDeck.commander && (
                      <p style={{ margin: 0, color: "var(--fg-2)" }}>Commander: {selectedDeck.commander.name}</p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-icon" title="Edit deck" onClick={() => navigate(`/decks/${selectedDeck.id}`)}>
                      <Icon name="edit" size={14} />
                    </button>
                    <button className="btn btn-icon btn-danger" title="Delete" onClick={() => handleDelete(selectedDeck.id)}>
                      <Icon name="trash" size={14} />
                    </button>
                    <button className="btn" onClick={() => navigate(`/playtest/new?deckId=${selectedDeck.id}`)}>
                      <Icon name="play" size={12} /> Playtest
                    </button>
                    <button className="btn btn-primary" onClick={() => navigate("/games/new")}>
                      <Icon name="play" size={12} /> Play
                    </button>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, auto) 1fr", gap: 24, marginTop: 20, alignItems: "start" }}>
                  <Stat label="Card count" value={selectedDeck.cards.reduce((s, c) => s + (c.quantity ?? 1), 0)} />
                  <Stat label="Avg. mana cost" value={avgCmc.toFixed(1)} />
                  <Stat label="Version" value={`v${selectedDeck.version}`} />
                  <div>
                    <div className="eyebrow" style={{ marginBottom: 6 }}>Mana curve</div>
                    <ManaCurveBar cards={selectedDeck.cards} />
                  </div>
                </div>
              </div>

              {/* Card list */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div className="eyebrow">Decklist</div>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
                    {COLORS.map((c) => colorBreakdown[c] ? (
                      <span key={c} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span className={`pip pip-${c.toLowerCase()}`} style={{ width: 8, height: 8, fontSize: 0, border: "none" }} />
                        {colorBreakdown[c]}
                      </span>
                    ) : null)}
                  </div>
                </div>

                {selectedDeck.cards.length === 0 ? (
                  <div className="empty">
                    <div className="empty-icon"><Icon name="cards" size={20} /></div>
                    <div className="empty-title">An empty grimoire</div>
                    <div className="empty-body">
                      Edit this deck to add cards from Scryfall.
                    </div>
                  </div>
                ) : (
                  <DeckCardList
                    cards={selectedDeck.cards}
                    onHoverEnter={hover.onMouseEnter}
                    onHoverMove={hover.onMouseMove}
                    onHoverLeave={hover.onMouseLeave}
                    onCardClick={setEnlarged}
                  />
                )}

                {/* Version history */}
                {versions.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <div className="eyebrow" style={{ marginBottom: 8 }}>Version history</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {versions.map((v) => (
                        <div
                          key={v.version}
                          style={{ display: "flex", gap: 12, padding: "8px 12px", background: "var(--bg-1)", border: "1px solid var(--line-1)", borderRadius: 6 }}
                        >
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)", minWidth: 30 }}>v{v.version}</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)", minWidth: 80 }}>
                            {v.timestamp ? new Date(v.timestamp).toLocaleDateString() : "—"}
                          </span>
                          <span style={{ fontSize: 13 }}>{v.changelog}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
      <HoverPreview anchor={hover.anchor} />
      {enlarged && <CardImageModal card={enlarged} onClose={() => setEnlarged(null)} />}
    </>
  );
}
