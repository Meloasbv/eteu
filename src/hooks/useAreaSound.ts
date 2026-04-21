import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AREA_META, type BrainArea } from "@/lib/brainAreas";

const STORAGE_KEY = "fascinacao-area-sound-prefs";

type Prefs = Record<BrainArea, { soundId: string; volume: number; muted: boolean; customVideoId?: string }>;

const DEFAULT_PREFS: Prefs = {
  reflexao:   { soundId: AREA_META.reflexao.defaultSoundId,   volume: 50, muted: false },
  oracao:     { soundId: AREA_META.oracao.defaultSoundId,     volume: 40, muted: false },
  brainstorm: { soundId: AREA_META.brainstorm.defaultSoundId, volume: 60, muted: false },
};

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { return DEFAULT_PREFS; }
}

function savePrefs(p: Prefs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

/** Extract YouTube video ID from various URL formats */
export function extractYoutubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/)
    || trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  return m?.[1] ?? null;
}

/**
 * Singleton hidden YouTube iframe controller used for ambient sound
 * across all brain areas. Only one iframe lives at a time per app session.
 */
export function useAreaSound(area: BrainArea | null, active: boolean) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);
  const lastAreaRef = useRef<BrainArea | null>(null);

  const currentPref = area ? prefs[area] : null;

  const resolvedVideoId = useMemo(() => {
    if (!area || !currentPref) return null;
    if (currentPref.soundId === "custom" && currentPref.customVideoId) return currentPref.customVideoId;
    if (currentPref.soundId === "silence") return null;
    const meta = AREA_META[area].sounds.find(s => s.id === currentPref.soundId);
    return meta?.videoId ?? null;
  }, [area, currentPref]);

  const post = useCallback((func: string, args: any[] = []) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  }, []);

  // Listen for ready event from iframe
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (typeof e.data !== "string") return;
      try {
        const data = JSON.parse(e.data);
        if (data.event === "onReady" || data.info === "ready") {
          readyRef.current = true;
        }
      } catch {}
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Crossfade when area or sound changes
  useEffect(() => {
    if (!active || !area || !currentPref) {
      post("pauseVideo");
      return;
    }
    if (currentPref.muted || !resolvedVideoId) {
      post("pauseVideo");
      return;
    }

    const targetVol = currentPref.muted ? 0 : currentPref.volume;
    const isAreaSwitch = lastAreaRef.current !== null && lastAreaRef.current !== area;
    lastAreaRef.current = area;

    if (isAreaSwitch) {
      // Fade out current
      post("setVolume", [0]);
      let v = currentPref.volume;
      const steps = 5;
      let i = 0;
      const fadeOut = setInterval(() => {
        v = Math.max(0, currentPref.volume - (currentPref.volume / steps) * (i + 1));
        post("setVolume", [Math.round(v)]);
        i++;
        if (i >= steps) {
          clearInterval(fadeOut);
          // Load new track + fade in
          post("loadVideoById", [{ videoId: resolvedVideoId, startSeconds: 0 }]);
          let j = 0;
          const fadeIn = setInterval(() => {
            j++;
            post("setVolume", [Math.round((targetVol / steps) * j)]);
            if (j >= steps) clearInterval(fadeIn);
          }, 200);
        }
      }, 100);
    } else {
      // First time / same area: just load + play at target volume
      post("loadVideoById", [{ videoId: resolvedVideoId, startSeconds: 0 }]);
      setTimeout(() => {
        post("setVolume", [targetVol]);
        post("playVideo");
      }, 400);
    }
  }, [active, area, resolvedVideoId, currentPref?.volume, currentPref?.muted, post]);

  // Stop when host disables
  useEffect(() => {
    if (!active) {
      post("pauseVideo");
    }
  }, [active, post]);

  const setSound = useCallback((id: string, customUrl?: string) => {
    if (!area) return;
    let next: Prefs[BrainArea];
    if (id === "custom") {
      const vid = extractYoutubeId(customUrl ?? "");
      if (!vid) return false;
      next = { ...prefs[area], soundId: "custom", customVideoId: vid };
    } else {
      next = { ...prefs[area], soundId: id };
    }
    const updated = { ...prefs, [area]: next };
    setPrefs(updated);
    savePrefs(updated);
    return true;
  }, [area, prefs]);

  const setVolume = useCallback((v: number) => {
    if (!area) return;
    const updated = { ...prefs, [area]: { ...prefs[area], volume: v } };
    setPrefs(updated);
    savePrefs(updated);
    post("setVolume", [v]);
  }, [area, prefs, post]);

  const toggleMute = useCallback(() => {
    if (!area) return;
    const updated = { ...prefs, [area]: { ...prefs[area], muted: !prefs[area].muted } };
    setPrefs(updated);
    savePrefs(updated);
  }, [area, prefs]);

  return {
    iframeRef,
    pref: currentPref,
    resolvedVideoId,
    setSound,
    setVolume,
    toggleMute,
  };
}
