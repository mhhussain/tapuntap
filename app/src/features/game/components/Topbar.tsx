import { Icon } from "../../../components/Icon";

interface TopbarProps {
  gameName: string;
  turn: number;
  phase: string;
  isHost: boolean;
  onLeave: () => void;
  onPrevPhase: () => void;
  onNextPhase: () => void;
  onEndGame: () => void;
}

export function Topbar({
  gameName,
  turn,
  phase,
  onLeave,
  onPrevPhase,
  onNextPhase,
  onEndGame,
}: TopbarProps) {
  return (
    <div className="topbar" style={{ borderBottom: "1px solid var(--line-1)" }}>
      <button
        className="btn btn-ghost btn-icon"
        onClick={onLeave}
        title="Leave game"
      >
        <Icon name="prev" size={14} />
      </button>
      <div className="topbar-title">{gameName}</div>
      <span className="topbar-sub">
        Turn {turn} · {phase}
      </span>
      <div className="topbar-spacer" />
      <button
        className="btn btn-sm"
        onClick={onPrevPhase}
        title="Previous phase"
      >
        ← Phase
      </button>
      <button
        className="btn btn-sm"
        onClick={onNextPhase}
        title="Next phase"
      >
        Phase →
      </button>
      <button
        className="btn btn-sm"
        onClick={onEndGame}
        style={{ marginLeft: 4 }}
      >
        End game
      </button>
    </div>
  );
}
