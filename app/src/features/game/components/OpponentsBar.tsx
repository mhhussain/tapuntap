import { colorTone } from "../../../lib/format";
import { isLand } from "../../../lib/cards";
import type { PlayerPublic, CardInstance } from "../../../types";

export function OpponentsBar({
  opponents,
  onCardClick,
  onCardMouseEnter,
  onCardMouseLeave,
  onCardMouseMove,
}: {
  opponents: PlayerPublic[];
  onCardClick?: (c: CardInstance) => void;
  onCardMouseEnter?: (e: React.MouseEvent, c: CardInstance) => void;
  onCardMouseLeave?: (e: React.MouseEvent, c: CardInstance) => void;
  onCardMouseMove?: (e: React.MouseEvent) => void;
}) {
  if (opponents.length === 0) return null;
  return (
    <div className="opponents-bar">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <span className="eyebrow">Opponents</span>
        <div style={{ flex: 1, height: 1, background: "var(--line-1)" }} />
      </div>
      <div style={{ display: "flex", gap: 16, overflowX: "auto" }}>
        {opponents.map((p) => {
          const creatures = (p.battlefield || []).filter(
            (c) => !isLand(c.typeLine)
          );
          const lands = (p.battlefield || []).filter((c) =>
            isLand(c.typeLine)
          );
          const allPerms = [...creatures, ...lands];
          return (
            <div key={p.uid} className="opponent-mini-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  {p.displayName}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--fg-3)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {creatures.length} permanents · {lands.length} lands · ♥{" "}
                  {p.life ?? 20}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  overflowX: "auto",
                  paddingBottom: 4,
                }}
              >
                {allPerms.map((perm) => (
                  <div
                    key={perm.instanceId}
                    className={`opponent-perm${perm.tapped ? " tapped" : ""}`}
                    style={{
                      background: colorTone(perm.colors || []),
                      cursor: onCardClick ? "pointer" : undefined,
                    }}
                    title={perm.name}
                    onClick={onCardClick ? () => onCardClick(perm) : undefined}
                    onMouseEnter={onCardMouseEnter ? (e) => onCardMouseEnter(e, perm) : undefined}
                    onMouseLeave={onCardMouseLeave ? (e) => onCardMouseLeave(e, perm) : undefined}
                    onMouseMove={onCardMouseMove}
                  >
                    <div
                      style={{
                        position: "absolute",
                        bottom: 2,
                        left: 2,
                        fontSize: 7,
                        color: "oklch(1 0 0 / 0.9)",
                        fontWeight: 600,
                        lineHeight: 1,
                      }}
                    >
                      {perm.name.split(" ")[0]}
                    </div>
                  </div>
                ))}
                {allPerms.length === 0 && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--fg-4)",
                      fontStyle: "italic",
                    }}
                  >
                    Empty board
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
