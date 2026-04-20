import { ReactNode } from "react";
import { FOCUS_PALETTE as P } from "./types";

interface Props {
  icon: ReactNode;
  label: string;
  badge?: string;
  children: ReactNode;
  glow?: boolean;
}

/**
 * Common shell for all focus artifacts.
 * Translucent card with neon-green border, subtle backdrop blur.
 */
export function ArtifactShell({ icon, label, badge, children, glow = false }: Props) {
  return (
    <div
      className="rounded-2xl overflow-hidden focus-artifact-enter"
      style={{
        background: "rgba(17, 22, 29, 0.65)",
        border: `1px solid rgba(0, 255, 148, 0.14)`,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow: glow
          ? `0 8px 32px -12px rgba(0, 255, 148, 0.18), inset 0 1px 0 rgba(255,255,255,0.03)`
          : `0 4px 20px -8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.03)`,
      }}
    >
      <div
        className="flex items-center gap-2.5 px-4 sm:px-5 py-3 border-b"
        style={{ borderColor: "rgba(0, 255, 148, 0.08)" }}
      >
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: `${P.primary}14`,
            color: P.primary,
            border: `1px solid ${P.primary}26`,
          }}
        >
          {icon}
        </div>
        <p
          className="flex-1 text-[10.5px] font-bold uppercase tracking-[2px] leading-none"
          style={{ color: P.primary }}
        >
          {label}
        </p>
        {badge && (
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded-md"
            style={{
              background: `${P.primary}10`,
              color: P.primary,
              border: `1px solid ${P.primary}1f`,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="px-4 sm:px-5 py-4">{children}</div>
    </div>
  );
}

interface ActionProps {
  onClick: () => void;
  children: ReactNode;
  variant?: "primary" | "ghost";
  disabled?: boolean;
}

export function ArtifactAction({ onClick, children, variant = "ghost", disabled }: ActionProps) {
  const isPrimary = variant === "primary";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
      style={{
        background: isPrimary ? `${P.primary}22` : "transparent",
        color: isPrimary ? P.primary : P.textDim,
        border: `1px solid ${isPrimary ? P.primary + "55" : P.border}`,
      }}
    >
      {children}
    </button>
  );
}
