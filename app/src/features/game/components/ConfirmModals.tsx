import { Modal } from "../../../components/Modal";

// ---- EndGameConfirm --------------------------------------------------------
export interface EndGameConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
}

export function EndGameConfirm({ open, onClose, onConfirm, busy }: EndGameConfirmProps) {
  if (!open) return null;
  return (
    <Modal
      title="End this game?"
      onClose={onClose}
      width={440}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            Keep playing
          </button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={busy}>
            End &amp; view summary
          </button>
        </>
      }
    >
      <p style={{ margin: 0, color: "var(--fg-2)", lineHeight: 1.6 }}>
        This finishes the game for everyone and opens the summary, where you can mark the winner
        and choose a rematch. The board state will be saved to the game's history.
      </p>
    </Modal>
  );
}

// ---- LeaveGameConfirm ------------------------------------------------------
export interface LeaveGameConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
}

export function LeaveGameConfirm({ open, onClose, onConfirm, busy }: LeaveGameConfirmProps) {
  if (!open) return null;
  return (
    <Modal
      title="Leave this game?"
      onClose={onClose}
      width={440}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            Stay
          </button>
          <button
            className="btn"
            style={{ background: "var(--bad)", borderColor: "var(--bad)", color: "white" }}
            onClick={onConfirm}
            disabled={busy}
          >
            Leave game
          </button>
        </>
      }
    >
      <p style={{ margin: 0, color: "var(--fg-2)", lineHeight: 1.6 }}>
        The game keeps running for the other players and your seat is held. You can resume any
        time from <strong style={{ color: "var(--fg-1)" }}>Games</strong> while it's still live.
      </p>
    </Modal>
  );
}

// ---- ShuffleConfirm ---------------------------------------------------------
export interface ShuffleConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
}

export function ShuffleConfirm({ open, onClose, onConfirm, busy }: ShuffleConfirmProps) {
  if (!open) return null;
  return (
    <Modal
      title="Shuffle your library?"
      onClose={onClose}
      width={440}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={busy}>
            Shuffle
          </button>
        </>
      }
    >
      <p style={{ margin: 0, color: "var(--fg-2)", lineHeight: 1.6 }}>
        This randomizes the order of the cards remaining in your library. It can't be undone.
      </p>
    </Modal>
  );
}

// ---- MulliganConfirm ---------------------------------------------------------
export interface MulliganConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
}

export function MulliganConfirm({ open, onClose, onConfirm, busy }: MulliganConfirmProps) {
  if (!open) return null;
  return (
    <Modal
      title="Mulligan your hand?"
      onClose={onClose}
      width={440}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={busy}>
            Mulligan
          </button>
        </>
      }
    >
      <p style={{ margin: 0, color: "var(--fg-2)", lineHeight: 1.6 }}>
        Your entire hand shuffles back into your library. You'll need to draw and bottom cards
        manually afterward — this action alone draws nothing.
      </p>
    </Modal>
  );
}
