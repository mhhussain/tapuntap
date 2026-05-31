import type { ReactNode } from "react";

export function Modal({ title, onClose, children, footer, width = 480 }:
  { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ minWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
