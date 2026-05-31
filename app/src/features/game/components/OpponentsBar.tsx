import type { PlayerPublic } from "../../../types";

export function OpponentsBar({ opponents }: { opponents: PlayerPublic[] }) {
  if (opponents.length === 0) return null;
  return (
    <div style={{ padding: "10px 20px", background: "var(--bg-0)", borderBottom: "1px solid var(--line-1)" }}>
      <span className="eyebrow">Opponents</span>
      <div style={{ display: "flex", gap: 14, overflowX: "auto", marginTop: 8 }}>
        {opponents.map((p) => (
          <div key={p.uid} className="opponent-mini-card">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{p.displayName}</span>
              <span className="mono" style={{ fontSize: 11 }}>{(p.battlefield || []).length} perms · ♥ {p.life ?? 20}</span>
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
              {Array.from({ length: p.handCount ?? 0 }).map((_, i) => (
                <div key={i} style={{ width: 20, height: 28, background: "var(--bg-3)", border: "1px solid var(--line-2)", borderRadius: 3 }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
