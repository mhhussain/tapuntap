interface SpinnerProps {
  size?: number;
  label?: string;
}

export function Spinner({ size = 20, label }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label || "Loading"}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "2px solid var(--line-2)",
        borderTopColor: "var(--accent)",
        display: "inline-block",
        animation: "spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}
