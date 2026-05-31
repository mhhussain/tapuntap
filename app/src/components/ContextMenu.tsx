import { useEffect, useRef, useState, type ReactNode } from "react";

export type MenuItem =
  | { header: string }
  | "sep"
  | { label: string; icon?: ReactNode; danger?: boolean; onClick: () => void };

interface ContextMenuProps {
  items: MenuItem[];
  x: number;
  y: number;
  onClose: () => void;
}

interface MenuState {
  items: MenuItem[];
  x: number;
  y: number;
}

export function ContextMenu({ items, x, y, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Clamp to viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const el = menuRef.current;
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      el.style.left = `${Math.max(0, window.innerWidth - rect.width - 4)}px`;
    }
    if (rect.bottom > window.innerHeight) {
      el.style.top = `${Math.max(0, window.innerHeight - rect.height - 4)}px`;
    }
  }, [x, y]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 500,
        minWidth: 160,
        background: "var(--bg-2)",
        border: "1px solid var(--line-2)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-2)",
        padding: "4px 0",
        userSelect: "none",
      }}
    >
      {items.map((item, i) => {
        if (item === "sep") {
          return (
            <div
              key={i}
              style={{
                height: 1,
                background: "var(--line-1)",
                margin: "4px 0",
              }}
            />
          );
        }
        if ("header" in item) {
          return (
            <div
              key={i}
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--fg-3)",
                fontWeight: 600,
                padding: "4px 12px 2px",
              }}
            >
              {item.header}
            </div>
          );
        }
        const { label, icon, danger, onClick } = item;
        return (
          <button
            key={i}
            onClick={() => {
              onClick();
              onClose();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "6px 12px",
              background: "transparent",
              border: "none",
              color: danger ? "var(--bad)" : "var(--fg-1)",
              fontSize: 13,
              cursor: "pointer",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "var(--bg-3)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "transparent";
            }}
          >
            {icon && (
              <span style={{ color: danger ? "var(--bad)" : "var(--fg-3)", flexShrink: 0 }}>
                {icon}
              </span>
            )}
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function useContextMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null);

  const openMenu = (e: React.MouseEvent, items: MenuItem[]) => {
    e.preventDefault();
    setMenu({ items, x: e.clientX, y: e.clientY });
  };

  const closeMenu = () => setMenu(null);

  return { menu, openMenu, closeMenu };
}
