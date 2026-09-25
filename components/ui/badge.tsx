import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "ice"
  | "emerald"
  | "cyan"
  | "amber"
  | "rose"
  | "purple"
  | "secondary"
  | "destructive";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  pulse?: boolean;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    background: "var(--surface-purple)",
    color: "var(--primary-deep)",
  },
  primary: {
    background: "var(--primary)",
    color: "var(--on-primary)",
  },
  success: {
    background: "color-mix(in srgb, var(--green) 16%, transparent)",
    color: "var(--green)",
  },
  warning: {
    background: "var(--surface-peach)",
    color: "#a0440d",
  },
  error: {
    background: "#fde8e8",
    color: "#c0392b",
  },
  ice: {
    background: "var(--surface-blue)",
    color: "#1a6098",
  },
  emerald: {
    background: "color-mix(in srgb, var(--green) 16%, transparent)",
    color: "var(--green)",
  },
  cyan: {
    background: "#d0f4fb",
    color: "#0e6676",
  },
  amber: {
    background: "var(--surface-peach)",
    color: "#a0440d",
  },
  rose: {
    background: "#fde8e8",
    color: "#c0392b",
  },
  purple: {
    background: "var(--surface-purple)",
    color: "var(--primary-deep)",
  },
  secondary: {
    background: "var(--surface)",
    color: "var(--muted)",
  },
  destructive: {
    background: "#fde8e8",
    color: "#c0392b",
  },
};

export function Badge({
  children,
  variant = "default",
  className,
  pulse = false,
}: BadgeProps) {
  const style = variantStyles[variant] || variantStyles.default;

  return (
    <span
      className={cn(className)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        fontSize: "11px",
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: "999px",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {pulse && (
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "999px",
            background: "currentColor",
            animation: "pulse 2s infinite",
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}

export default Badge;
