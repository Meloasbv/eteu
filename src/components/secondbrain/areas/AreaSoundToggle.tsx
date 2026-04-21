import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, ChevronDown } from "lucide-react";
import { AREA_META, type BrainArea } from "@/lib/brainAreas";
import { haptic } from "@/hooks/useHaptic";

interface Props {
  area: BrainArea;
  pref: { soundId: string; volume: number; muted: boolean; customVideoId?: string } | null;
  setSound: (id: string, customUrl?: string) => boolean | void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
}

export default function AreaSoundToggle({ area, pref, setSound, setVolume, toggleMute }: Props) {
  const [open, setOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const m = AREA_META[area];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const Icon = pref?.muted ? VolumeX : Volume2;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(o => !o); haptic("light"); }}
        className="h-9 px-2.5 rounded-lg flex items-center gap-1.5 transition-all hover:scale-105"
        style={{
          background: "var(--area-surface)",
          border: "1px solid var(--area-border)",
          color: "var(--area-accent)",
          backdropFilter: "blur(8px)",
        }}
        aria-label="Ambiente sonoro"
      >
        <Icon size={14} />
        <ChevronDown size={11} style={{ opacity: 0.6 }} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[260px] rounded-xl p-3 z-50 animate-fade-in"
          style={{
            background: m.surface,
            border: `1px solid ${m.border}`,
            boxShadow: `0 12px 32px -8px rgba(0,0,0,0.5), 0 0 0 1px ${m.accentGlow}`,
          }}
        >
          <p className="text-[10px] uppercase tracking-[2px] mb-2" style={{ color: m.muted }}>
            🎵 Ambiente
          </p>
          <div className="space-y-1 mb-3">
            {m.sounds.map(s => {
              const active = pref?.soundId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => { setSound(s.id); haptic("light"); }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[12px] transition-colors"
                  style={{
                    background: active ? `${m.accent}1a` : "transparent",
                    color: active ? m.accent : m.text,
                    border: `1px solid ${active ? `${m.accent}55` : "transparent"}`,
                  }}
                >
                  <span>{s.label}</span>
                  {active && <span style={{ color: m.accent }}>✓</span>}
                </button>
              );
            })}
            <div className="pt-1">
              <input
                type="text"
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                placeholder="Cole URL do YouTube…"
                className="w-full px-2.5 py-1.5 rounded-md text-[11px] bg-transparent outline-none"
                style={{ border: `1px solid ${m.border}`, color: m.text }}
              />
              {customUrl && (
                <button
                  onClick={() => {
                    const ok = setSound("custom", customUrl);
                    if (ok !== false) { setCustomUrl(""); haptic("medium"); }
                  }}
                  className="mt-1 w-full px-2 py-1 rounded-md text-[11px] font-bold"
                  style={{ background: m.accent, color: m.bg }}
                >
                  Usar essa trilha
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: m.border }}>
            <button
              onClick={() => { toggleMute(); haptic("light"); }}
              className="shrink-0 p-1 rounded"
              style={{ color: m.accent }}
              aria-label={pref?.muted ? "Ativar som" : "Silenciar"}
            >
              <Icon size={14} />
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={pref?.volume ?? 50}
              onChange={e => setVolume(Number(e.target.value))}
              className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: m.accent, background: `${m.accent}22` }}
            />
            <span className="text-[10px] tabular-nums w-7 text-right" style={{ color: m.muted }}>
              {pref?.volume ?? 0}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
