import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { searchCards } from "../../lib/scryfall";
import { createDeck, getDeck, updateDeck } from "../../api/decks";
import { useToast } from "../../components/Toast";
import { Icon } from "../../components/Icon";
import { ManaCost } from "../../components/ManaCost";
import { groupCardsByType } from "../../lib/cards";
import type { DeckCardEntry } from "../../types";

function toEntry(card: any, quantity = 1): DeckCardEntry {
  return {
    cardId: card.id, name: card.name, quantity,
    manaCost: card.mana_cost || "", cmc: card.cmc || 0, typeLine: card.type_line || "",
    colors: card.colors || [], imageUri: card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || null,
    imageUriBack: card.card_faces?.[1]?.image_uris?.normal || null,
    power: card.power ?? null, toughness: card.toughness ?? null, loyalty: card.loyalty ?? null,
  };
}

export function BuilderView() {
  const { deckId } = useParams();
  const isNew = deckId === undefined;
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState("");
  const [format, setFormat] = useState("commander");
  const [commander, setCommander] = useState<DeckCardEntry | null>(null);
  const [cards, setCards] = useState<DeckCardEntry[]>([]);

  // Scryfall search state
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [changelog, setChangelog] = useState("");
  const qRef = useRef(q);
  qRef.current = q;

  useEffect(() => {
    if (!isNew && deckId) {
      getDeck(deckId)
        .then((d) => { setName(d.name); setFormat(d.format); setCommander(d.commander); setCards(d.cards); })
        .catch((e) => toast(e.message, "error"));
    }
  }, [deckId, isNew, toast]);

  async function doSearch() {
    const term = q.trim();
    if (!term) return;
    setSearching(true);
    try {
      const r = await searchCards(term);
      setResults(r.data.slice(0, 30));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSearching(false);
    }
  }

  function addCard(card: any) {
    setCards((cs) => {
      const existing = cs.find((c) => c.cardId === card.id);
      if (existing) return cs.map((c) => c.cardId === card.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...cs, toEntry(card)];
    });
  }

  function removeCard(cardId: string) {
    setCards((cs) => cs.flatMap((c) => {
      if (c.cardId !== cardId) return [c];
      return c.quantity > 1 ? [{ ...c, quantity: c.quantity - 1 }] : [];
    }));
  }

  function setCommanderFromCard(card: any) {
    setCommander(toEntry(card, 1));
    // Make sure it's also in the deck list
    addCard(card);
  }

  async function save() {
    if (!name.trim()) { toast("Name your deck", "error"); return; }
    try {
      if (isNew) {
        const { id } = await createDeck({ name, format, commander, cards, changelog: changelog || "Initial version" });
        navigate(`/decks/${id}`);
      } else {
        await updateDeck(deckId!, { name, format, commander, cards, changelog: changelog || undefined });
        toast("Saved");
        setChangelog("");
      }
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  const totalCards = cards.reduce((s, c) => s + c.quantity, 0);
  const groups = groupCardsByType(cards);

  const smallImg = (card: any) =>
    card?.image_uris?.small || card?.card_faces?.[0]?.image_uris?.small || null;
  const normalImg = (card: any) =>
    card?.image_uris?.normal || card?.card_faces?.[0]?.image_uris?.normal || null;

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <button className="btn btn-ghost btn-icon" onClick={() => navigate("/decks")} title="Back to library">
          <Icon name="chevron-left" size={16} />
        </button>
        <input
          className="input"
          placeholder="Deck name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <select className="input" value={format} onChange={(e) => setFormat(e.target.value)} style={{ width: 140 }}>
          <option value="commander">Commander</option>
          <option value="standard">Standard</option>
          <option value="modern">Modern</option>
          <option value="legacy">Legacy</option>
          <option value="vintage">Vintage</option>
          <option value="pauper">Pauper</option>
          <option value="draft">Draft</option>
        </select>
        <div className="topbar-spacer" />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-3)" }}>{totalCards} cards</span>
        <button className="btn btn-primary" onClick={save}>
          {isNew ? "Create deck" : "Save"}
        </button>
      </div>

      {/* Three-panel layout: Search | Detail | Decklist */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 280px 1fr", flex: 1, overflow: "hidden" }}>

        {/* Panel 1: Card search */}
        <div className="builder-panel">
          <div className="builder-panel-header">
            <div className="eyebrow" style={{ flex: 1 }}>Card search</div>
          </div>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--line-1)", display: "flex", gap: 6 }}>
            <div className="search" style={{ flex: 1 }}>
              <Icon name="search" size={14} />
              <input
                className="input"
                placeholder="Search Scryfall…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                style={{ width: "100%" }}
              />
            </div>
            <button className="btn" onClick={doSearch} disabled={searching} style={{ flexShrink: 0 }}>
              {searching ? "…" : <Icon name="search" size={13} />}
            </button>
          </div>
          <div className="builder-panel-body" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, alignContent: "start" }}>
            {results.length === 0 && !searching && (
              <div style={{ gridColumn: "1/-1", padding: "16px 0", textAlign: "center", color: "var(--fg-3)", fontSize: 12 }}>
                Search for cards above
              </div>
            )}
            {results.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCard(c)}
                onDoubleClick={() => addCard(c)}
                title="Click to preview · Double-click to add"
                style={{
                  display: "flex", flexDirection: "column", gap: 4,
                  padding: 6, border: "1px solid var(--line-1)", borderRadius: 6,
                  background: selectedCard?.id === c.id ? "var(--bg-3)" : "var(--bg-2)",
                  textAlign: "left", cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
                  <span style={{ display: "inline-flex", gap: 2 }}>
                    {(c.colors || []).map((col: string) => (
                      <span key={col} style={{ width: 8, height: 8, borderRadius: "50%", background: `var(--mana-${col.toLowerCase()})`, display: "inline-block" }} />
                    ))}
                  </span>
                  <ManaCost cost={c.mana_cost || ""} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-0)", lineHeight: 1.2 }}>{c.name}</div>
                <div style={{ fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {(c.type_line || "").split("—")[0].trim()}
                </div>
              </button>
            ))}
          </div>
          <div style={{ padding: 8, borderTop: "1px solid var(--line-1)", fontSize: 11, color: "var(--fg-3)", textAlign: "center" }}>
            Double-click to add · Click for details
          </div>
        </div>

        {/* Panel 2: Card detail */}
        <div className="builder-panel">
          {!selectedCard ? (
            <div className="empty" style={{ flex: 1 }}>
              <div className="empty-icon"><Icon name="cards" size={20} /></div>
              <div className="empty-title">Card preview</div>
              <div className="empty-body">Click a search result to see details here.</div>
            </div>
          ) : (
            <>
              <div className="builder-panel-header">
                <span className="eyebrow" style={{ flex: 1 }}>Card detail</span>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedCard(null)}>
                  <Icon name="close" size={14} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                {normalImg(selectedCard) && (
                  <div style={{ display: "grid", placeItems: "center", marginBottom: 12 }}>
                    <img
                      src={normalImg(selectedCard)}
                      alt={selectedCard.name}
                      style={{ width: 180, borderRadius: 8, boxShadow: "var(--shadow-2)" }}
                    />
                  </div>
                )}
                <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 20, color: "var(--fg-0)", marginBottom: 4 }}>
                  {selectedCard.name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <ManaCost cost={selectedCard.mana_cost || ""} />
                  <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                    CMC {selectedCard.cmc ?? 0}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--fg-2)", marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--line-1)" }}>
                  {selectedCard.type_line}
                </div>
                {selectedCard.oracle_text && (
                  <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6, fontStyle: "italic", marginBottom: 12 }}>
                    {selectedCard.oracle_text}
                  </div>
                )}
                {(selectedCard.power || selectedCard.toughness) && (
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--fg-0)", marginBottom: 12 }}>
                    <span className="eyebrow" style={{ marginRight: 8 }}>P/T</span>
                    {selectedCard.power}/{selectedCard.toughness}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                  <button
                    className="btn btn-primary"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => addCard(selectedCard)}
                  >
                    <Icon name="plus" size={14} /> Add to deck
                  </button>
                  {format === "commander" && (
                    <button
                      className="btn"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => setCommanderFromCard(selectedCard)}
                    >
                      Set as commander
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Panel 3: Decklist */}
        <div className="builder-panel">
          <div className="builder-panel-header">
            <div className="eyebrow" style={{ flex: 1 }}>Deck ({totalCards})</div>
          </div>
          <div className="builder-panel-body">
            {commander && (
              <div style={{ marginBottom: 12 }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Commander</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "var(--bg-2)", borderRadius: 6, border: "1px solid var(--line-1)" }}>
                  {smallImg(commander) && (
                    <img src={smallImg(commander) || ""} alt={commander.name} style={{ width: 30, borderRadius: 4 }} />
                  )}
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{commander.name}</span>
                  <ManaCost cost={commander.manaCost || ""} />
                </div>
              </div>
            )}

            {cards.length === 0 && (
              <div className="empty" style={{ minHeight: 120 }}>
                <div className="empty-title">Empty deck</div>
                <div className="empty-body">Add cards from the search panel.</div>
              </div>
            )}

            {groups.map(({ group, cards: groupCards }) => (
              <div key={group} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
                  <span className="eyebrow">{group}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>
                    {groupCards.reduce((s, c) => s + c.quantity, 0)}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", border: "1px solid var(--line-1)", borderRadius: 6, overflow: "hidden" }}>
                  {groupCards.map((c) => (
                    <div
                      key={c.cardId}
                      className="deck-card-row"
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", borderBottom: "1px solid var(--line-1)" }}
                    >
                      <span className="deck-card-qty">{c.quantity}×</span>
                      <span className="deck-card-name">{c.name}</span>
                      <ManaCost cost={c.manaCost ?? ""} />
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => removeCard(c.cardId)}
                        title="Remove one"
                      >
                        <Icon name="minus" size={12} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => {
                          const found = results.find((r) => r.id === c.cardId);
                          if (found) addCard(found);
                          else setCards((cs) => cs.map((x) => x.cardId === c.cardId ? { ...x, quantity: x.quantity + 1 } : x));
                        }}
                        title="Add one"
                      >
                        <Icon name="plus" size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Changelog note for saves */}
            {!isNew && (
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--line-1)" }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Version note</div>
                <input
                  className="input"
                  placeholder="What changed in this version?"
                  value={changelog}
                  onChange={(e) => setChangelog(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
