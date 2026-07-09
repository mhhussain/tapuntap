import { useState } from "react";
import { Modal } from "../../../components/Modal";

interface DrawNModalProps {
  libraryCount: number;
  onDraw: (count: number) => void;
  onClose: () => void;
}

export function DrawNModal({ libraryCount, onDraw, onClose }: DrawNModalProps) {
  const max = Math.max(1, libraryCount);
  const [count, setCount] = useState(Math.min(1, max));

  function clamp(n: number): number {
    if (Number.isNaN(n)) return 1;
    return Math.min(max, Math.max(1, n));
  }

  function submit() {
    onDraw(clamp(count));
    onClose();
  }

  return (
    <Modal
      title="Draw N cards"
      onClose={onClose}
      width={320}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit}>
            Draw
          </button>
        </>
      }
    >
      <div className="eyebrow" style={{ marginBottom: 6 }}>
        Count (1–{max})
      </div>
      <input
        className="input"
        type="number"
        min={1}
        max={max}
        value={count}
        autoFocus
        onChange={(e) => setCount(clamp(parseInt(e.target.value) || 1))}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        style={{ textAlign: "center", fontFamily: "var(--font-mono)" }}
      />
    </Modal>
  );
}
