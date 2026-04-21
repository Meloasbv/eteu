import { type CSSProperties } from "react";
import { type BrainArea, AREA_META } from "@/lib/brainAreas";

interface Props {
  area: BrainArea;
  /** Lower z-index so it sits behind content but above bg */
  className?: string;
}

/**
 * Per-area background ambience (CSS-only, no JS animation):
 * - Reflexão: floating moonlight particles
 * - Oração: pulsing candle glow at top
 * - Brainstorm: pulsing dotted electric grid
 */
export default function AreaAmbience({ area, className }: Props) {
  const m = AREA_META[area];
  const base: CSSProperties = { position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" };

  if (area === "reflexao") {
    return (
      <div className={className} style={base} aria-hidden>
        <div
          style={{
            position: "absolute", top: "20%", left: "10%", width: 220, height: 220, borderRadius: "50%",
            background: `radial-gradient(circle, ${m.accentGlow} 0%, transparent 70%)`,
            animation: "areaFloat 22s infinite ease-in-out",
          }}
        />
        <div
          style={{
            position: "absolute", bottom: "25%", right: "10%", width: 320, height: 320, borderRadius: "50%",
            background: `radial-gradient(circle, ${m.accentGlow} 0%, transparent 70%)`,
            animation: "areaFloat 22s infinite ease-in-out",
            animationDelay: "-11s",
          }}
        />
        <div
          style={{
            position: "absolute", top: "55%", left: "55%", width: 160, height: 160, borderRadius: "50%",
            background: `radial-gradient(circle, ${m.accentGlow} 0%, transparent 70%)`,
            animation: "areaFloat 22s infinite ease-in-out",
            animationDelay: "-6s",
          }}
        />
        <style>{`
          @keyframes areaFloat {
            0%,100% { transform: translate(0,0) scale(1); opacity: 0.4; }
            25% { transform: translate(30px,-20px) scale(1.1); opacity: 0.6; }
            50% { transform: translate(-12px,28px) scale(0.95); opacity: 0.3; }
            75% { transform: translate(20px,10px) scale(1.05); opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  if (area === "oracao") {
    return (
      <div className={className} style={base} aria-hidden>
        <div
          style={{
            position: "absolute", top: "-30%", left: "50%", transform: "translateX(-50%)",
            width: 640, height: 640, borderRadius: "50%",
            background: `radial-gradient(ellipse at center, ${m.accentGlow} 0%, ${m.accentGlow.replace("0.15","0.05")} 40%, transparent 70%)`,
            animation: "areaCandle 6s infinite ease-in-out",
          }}
        />
        <div
          style={{
            position: "absolute", bottom: "-20%", left: "20%",
            width: 360, height: 360, borderRadius: "50%",
            background: `radial-gradient(ellipse at center, ${m.accentGlow} 0%, transparent 70%)`,
            animation: "areaCandle 8s infinite ease-in-out",
            animationDelay: "-3s",
          }}
        />
        <style>{`
          @keyframes areaCandle {
            0%,100% { opacity: 0.5; transform: translate(-50%,0) scale(1); }
            50% { opacity: 0.85; transform: translate(-50%,0) scale(1.05); }
          }
        `}</style>
      </div>
    );
  }

  // brainstorm
  return (
    <div className={className} style={base} aria-hidden>
      <div
        style={{
          position: "absolute", inset: 0,
          backgroundImage: `radial-gradient(circle, ${m.accentGlow.replace("0.15","0.10")} 1px, transparent 1px)`,
          backgroundSize: "26px 26px",
          animation: "areaGrid 4s infinite ease-in-out",
        }}
      />
      <style>{`
        @keyframes areaGrid {
          0%,100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
