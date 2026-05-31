import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { searchCards } from "../../lib/scryfall";
import { createDeck, getDeck, updateDeck } from "../../api/decks";
import { useToast } from "../../components/Toast";
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
  const [cards, setCards] = useState<DeckCardEntry[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!isNew && deckId) {
      getDeck(deckId).then((d) => { setName(d.name); setFormat(d.format); setCards(d.cards); })
        .catch((e) => toast(e.message, "error"));
    }
  }, [deckId, isNew, toast]);

  async function doSearch() {
    if (!q.trim()) return;
    try { const r = await searchCards(q); setResults(r.data.slice(0, 30)); }
    catch (e) { toast((e as Error).message, "error"); }
  }

  function addCard(card: any) {
    setCards((cs) => {
      const existing = cs.find((c) => c.cardId === card.id);
      if (existing) return cs.map((c) => c.cardId === card.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...cs, toEntry(card)];
    });
  }

  async function save() {
    if (!name.trim()) { toast("Name your deck", "error"); return; }
    try {
      if (isNew) { const { id } = await createDeck({ name, format, cards }); navigate(`/decks/${id}`); }
      else { await updateDeck(deckId!, { name, format, cards }); toast("Saved"); }
    } catch (e) { toast((e as Error).message, "error"); }
  }

  return (
    <>
      <div className="topbar">
        <input className="input" placeholder="Deck name" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="input" value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="commander">Commander</option>
          <option value="standard">Standard</option>
        </select>
        <div className="topbar-spacer" />
        <button className="btn btn-primary" onClick={save}>Save</button>
      </div>
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder="Search Scryfall…" value={q}
              onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} />
            <button className="btn" onClick={doSearch}>Search</button>
          </div>
          <div className="decks-grid" style={{ marginTop: 12 }}>
            {results.map((c) => (
              <div key={c.id} className="panel" style={{ padding: 8, cursor: "pointer" }} onClick={() => addCard(c)}>
                {c.image_uris?.small && <img src={c.image_uris.small} alt={c.name} style={{ width: "100%" }} />}
                <div style={{ fontSize: 12 }}>{c.name}</div>
              </div>
            ))}
          </div>
        </div>
        <aside style={{ width: 280, borderLeft: "1px solid var(--line-1)", padding: 16, overflowY: "auto" }}>
          <div className="eyebrow">Deck ({cards.reduce((s, c) => s + c.quantity, 0)})</div>
          {cards.map((c) => (
            <div key={c.cardId} className="deck-card-row">
              <span className="deck-card-qty">{c.quantity}</span>
              <span className="deck-card-name">{c.name}</span>
              <button className="btn btn-ghost btn-sm" onClick={() =>
                setCards((cs) => cs.flatMap((x) => x.cardId !== c.cardId ? [x] : x.quantity > 1 ? [{ ...x, quantity: x.quantity - 1 }] : []))
              }>−</button>
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
