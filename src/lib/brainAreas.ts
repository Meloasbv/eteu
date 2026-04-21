/**
 * Brain Areas — Thematic environments for the Second Brain.
 * Single source of truth for tokens, type→area mapping, and audio defaults.
 */

export type BrainArea = "reflexao" | "oracao" | "brainstorm";

export type ThoughtType =
  | "problema" | "insight" | "estudo" | "reflexão" | "oração"
  | "decisão" | "emocional" | "ideia" | "pergunta";

export interface AreaMeta {
  id: BrainArea;
  label: string;
  emoji: string;
  tagline: string;
  /** Thought types that belong to this area */
  types: ThoughtType[];
  /** Default type used when the user captures a new thought inside the area */
  defaultType: ThoughtType;
  placeholder: string;
  ctaLabel: string;
  /** Visual tokens (hex / rgba) — also exposed as CSS vars */
  bg: string;
  surface: string;
  accent: string;
  accentGlow: string;
  text: string;
  muted: string;
  border: string;
  /** YouTube video IDs curated as ambient soundtrack options */
  sounds: { id: string; label: string; videoId: string | null }[];
  /** Default sound id */
  defaultSoundId: string;
}

export const AREAS: BrainArea[] = ["reflexao", "oracao", "brainstorm"];

export const AREA_META: Record<BrainArea, AreaMeta> = {
  reflexao: {
    id: "reflexao",
    label: "Reflexão",
    emoji: "🪞",
    tagline: "Calma e clareza para decisões e emoções",
    types: ["emocional", "decisão", "reflexão", "problema"],
    defaultType: "reflexão",
    placeholder: "O que está pesando no seu coração?",
    ctaLabel: "Refletir",
    bg: "#0a0f14",
    surface: "#0f1620",
    accent: "#7ba3c9",
    accentGlow: "rgba(123,163,201,0.15)",
    text: "#b8d0e8",
    muted: "#4a6a85",
    border: "rgba(123,163,201,0.18)",
    sounds: [
      { id: "rain",   label: "Chuva suave",   videoId: "mPZkdNFkNps" },
      { id: "piano",  label: "Piano ambient", videoId: "4xDzrJKXOOY" },
      { id: "nature", label: "Natureza",      videoId: "OdIJ2x3nxzQ" },
      { id: "silence",label: "Silêncio",      videoId: null },
    ],
    defaultSoundId: "piano",
  },
  oracao: {
    id: "oracao",
    label: "Oração",
    emoji: "🙏",
    tagline: "Súplicas, gratidão e intercessão",
    types: ["oração"],
    defaultType: "oração",
    placeholder: "Derrame seu coração diante do Senhor…",
    ctaLabel: "Orar",
    bg: "#0f0a14",
    surface: "#16101e",
    accent: "#b08db5",
    accentGlow: "rgba(176,141,181,0.15)",
    text: "#d4c0d8",
    muted: "#6a5270",
    border: "rgba(176,141,181,0.18)",
    sounds: [
      { id: "worship", label: "Worship instrumental", videoId: "DWcJFNfaw9c" },
      { id: "strings", label: "Cordas suaves",        videoId: "lFcSrYw-ARY" },
      { id: "hymns",   label: "Hinos antigos",        videoId: "1eVw_uAcG2Y" },
      { id: "silence", label: "Silêncio",             videoId: null },
    ],
    defaultSoundId: "worship",
  },
  brainstorm: {
    id: "brainstorm",
    label: "Brainstorm",
    emoji: "⚡",
    tagline: "Ideias, planos e possibilidades",
    types: ["ideia", "pergunta", "estudo", "insight"],
    defaultType: "ideia",
    placeholder: "Lance uma ideia, dúvida ou estratégia…",
    ctaLabel: "Lançar",
    bg: "#0a100a",
    surface: "#0f1810",
    accent: "#10b981",
    accentGlow: "rgba(16,185,129,0.15)",
    text: "#b0e8d0",
    muted: "#3a6b55",
    border: "rgba(16,185,129,0.18)",
    sounds: [
      { id: "lofi",       label: "Lo-fi study",     videoId: "jfKfPfyJRdk" },
      { id: "electronic", label: "Eletrônico calmo", videoId: "WPni755-Krg" },
      { id: "cafe",       label: "Café & conversa",  videoId: "h2zkV-l_TbY" },
      { id: "silence",    label: "Silêncio",         videoId: null },
    ],
    defaultSoundId: "lofi",
  },
};

/** Map a thought.type (legacy) to its area. */
export function typeToArea(type: string | null | undefined): BrainArea {
  if (!type) return "brainstorm";
  for (const a of AREAS) {
    if ((AREA_META[a].types as string[]).includes(type)) return a;
  }
  return "brainstorm";
}

/** Apply this area's tokens as inline CSS variables to a host element. */
export function areaCSSVars(area: BrainArea): React.CSSProperties {
  const m = AREA_META[area];
  return {
    // @ts-expect-error CSS custom props
    "--area-bg": m.bg,
    "--area-surface": m.surface,
    "--area-accent": m.accent,
    "--area-accent-glow": m.accentGlow,
    "--area-text": m.text,
    "--area-muted": m.muted,
    "--area-border": m.border,
  };
}
