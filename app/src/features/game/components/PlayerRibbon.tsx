import { Icon } from "../../../components/Icon";
import { colorTone } from "../../../lib/format";
import type { GameDoc, PlayerPublic, PlayerPrivate } from "../../../types";

interface VitalProps {
  label: string;
  value: number;
  large?: boolean;
  disabled?: boolean;
  onMinus?: (e: React.MouseEvent) => void;
  onPlus?: (e: React.MouseEvent) => void;
}

function Vital({ label, value, large, disabled, onMinus, onPlus }: VitalProps) {
  return (
    <div className="vital">
      <span className="vital-label">{label}</span>
      <div className="vital-controls">
        {onMinus && (
          <button className="life-btn" disabled={disabled} onClick={onMinus}>
            −
          </button>
        )}
        <span className={`vital-val${large ? "" : " compact"}`}>{value}</span>
        {onPlus && (
          <button className="life-btn" disabled={disabled} onClick={onPlus}>
            +
          </button>
        )}
      </div>
    </div>
  );
}

interface CompactVitalProps {
  label: string;
  value: number;
  onClick?: (e: React.MouseEvent) => void;
}

function CompactVital({ label, value, onClick }: CompactVitalProps) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 10,
        color: "var(--fg-3)",
        fontFamily: "var(--font-mono)",
        cursor: onClick ? "pointer" : undefined,
      }}
    >
      <span style={{ textTransform: "uppercase" }}>{label}</span>
      <span style={{ color: "var(--fg-1)", fontWeight: 600, fontSize: 12 }}>
        {value}
      </span>
    </div>
  );
}

export function PlayerRibbon({
  game,
  players,
  myUid,
  myPrivate,
  onLife,
  onEndTurn,
  onOpenZone,
  pending,
}: {
  game: GameDoc;
  players: Record<string, PlayerPublic>;
  myUid: string;
  myPrivate: PlayerPrivate;
  onLife: (targetUid: string, delta: number) => void;
  onEndTurn: () => void;
  onOpenZone: (targetUid: string, zone: "graveyard" | "exile") => void;
  pending?: boolean;
}) {
  const activeUid = game.turnOrder[game.activeSeat];

  // Show my seat first, then others in turn order
  const orderedUids: string[] = [
    myUid,
    ...game.turnOrder.filter((u) => u !== myUid),
  ];

  return (
    <div className="player-ribbon">
      {orderedUids.map((uid, i) => {
        const p = players[uid];
        if (!p) return null;
        const isSelf = uid === myUid;
        const isActive = uid === activeUid;
        const handCount = isSelf ? myPrivate.hand.length : p.handCount ?? 0;
        const libCount = isSelf ? myPrivate.library.length : p.libraryCount ?? 0;
        const tone = colorTone([]);

        // Get deck name from game seats
        const seat = game.seats.find((s) => s.uid === uid);
        const deckName = seat?.deckName ?? "";

        return (
          <div
            key={uid}
            className={`ribbon-player${isActive ? " active" : ""}`}
            style={{
              borderRight:
                i < orderedUids.length - 1
                  ? "1px solid var(--line-1)"
                  : "none",
            }}
          >
            {/* Avatar */}
            <div className="ribbon-avatar" style={{ background: tone }}>
              {(p.displayName || "?")[0]}
            </div>

            {/* Name + deck */}
            <div className="ribbon-info">
              <div className="ribbon-name">
                {p.displayName}
                {isSelf && (
                  <span style={{ fontSize: 10, color: "var(--fg-3)" }}>
                    (you)
                  </span>
                )}
                {isActive && (
                  <span className="ribbon-active-label">Active</span>
                )}
              </div>
              {deckName && <div className="ribbon-deck">{deckName}</div>}
            </div>

            {/* Vitals */}
            <div className="ribbon-vitals">
              <Vital
                label="LIFE"
                value={p.life ?? 20}
                large
                disabled={!isSelf && pending}
                onMinus={(e) => {
                  e.stopPropagation();
                  onLife(uid, -1);
                }}
                onPlus={(e) => {
                  e.stopPropagation();
                  onLife(uid, 1);
                }}
              />
              <div
                style={{ display: "flex", flexDirection: "column", gap: 4 }}
              >
                <CompactVital label="HAND" value={handCount} />
                <CompactVital label="LIB" value={libCount} />
                <CompactVital
                  label="GY"
                  value={p.graveyard?.length ?? 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenZone(uid, "graveyard");
                  }}
                />
                <CompactVital
                  label="EX"
                  value={p.exile?.length ?? 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenZone(uid, "exile");
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}

      <button className="ribbon-next-btn" disabled={pending} onClick={onEndTurn}>
        <Icon name="next" size={14} />
        Next turn
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            padding: "1px 5px",
            background: "oklch(0 0 0 / 0.2)",
            borderRadius: 3,
            marginLeft: 4,
          }}
        >
          N
        </span>
      </button>
    </div>
  );
}
