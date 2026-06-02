interface AvatarProps {
  name?: string;
  photoURL?: string | null;
  size?: number;
}

export function Avatar({ name, photoURL, size = 36 }: AvatarProps) {
  const initial = (name || "?")[0].toUpperCase();
  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name || "avatar"}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: "1px solid var(--line-2)",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--bg-3)",
        border: "1px solid var(--line-2)",
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--font-serif)",
        fontStyle: "italic",
        fontSize: size * 0.46,
        color: "var(--fg-1)",
        flexShrink: 0,
        boxShadow: "var(--shadow-1)",
      }}
    >
      {initial}
    </div>
  );
}
