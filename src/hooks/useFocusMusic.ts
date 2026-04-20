import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type FocusTrackKey = "lofi" | "piano" | "ambient" | "custom";

export const FOCUS_TRACKS: Record<Exclude<FocusTrackKey, "custom">, { id: string; label: string; emoji: string }> = {
  lofi: { id: "jfKfPfyJRdk", label: "Lo-fi Reflexão", emoji: "🌙" },
  piano: { id: "y7e-GC6oGhg", label: "Piano Sacro", emoji: "🎹" },
  ambient: { id: "DWcJFNfaw9c", label: "Ambient Deep Focus", emoji: "🌌" },
};

/** Extract YouTube video ID from various URL formats */
export function extractYoutubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  // Already an ID (11 chars, no slashes)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

/**
 * Lazy YouTube iframe controller for Focus Mode music.
 * Uses postMessage IFrame API (no extra script load required).
 */
export function useFocusMusic(active: boolean) {
  const [trackKey, setTrackKey] = useState<FocusTrackKey>("lofi");
  const [customVideoId, setCustomVideoId] = useState<string>(() => {
    try { return localStorage.getItem("focus-custom-yt") || ""; } catch { return ""; }
  });
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(60);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const currentVideoId = useMemo(() => {
    if (trackKey === "custom") return customVideoId || FOCUS_TRACKS.lofi.id;
    return FOCUS_TRACKS[trackKey].id;
  }, [trackKey, customVideoId]);

  const post = useCallback((func: string, args: any[] = []) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  }, []);

  useEffect(() => {
    if (active) {
      const t = setTimeout(() => {
        post("playVideo");
        post("setVolume", [volume]);
        setPlaying(true);
      }, 400);
      return () => clearTimeout(t);
    } else {
      post("pauseVideo");
      setPlaying(false);
    }
  }, [active, post, volume]);

  const toggle = useCallback(() => {
    if (playing) { post("pauseVideo"); setPlaying(false); }
    else { post("playVideo"); setPlaying(true); }
  }, [playing, post]);

  const setTrack = useCallback((k: FocusTrackKey) => {
    setTrackKey(k);
    setPlaying(true);
  }, []);

  const setCustom = useCallback((urlOrId: string) => {
    const id = extractYoutubeId(urlOrId);
    if (!id) return false;
    setCustomVideoId(id);
    try { localStorage.setItem("focus-custom-yt", id); } catch {}
    setTrackKey("custom");
    setPlaying(true);
    return true;
  }, []);

  const changeVolume = useCallback((v: number) => {
    setVolume(v);
    post("setVolume", [v]);
  }, [post]);

  const skip = useCallback(() => {
    const keys: FocusTrackKey[] = ["lofi", "piano", "ambient"];
    const idx = keys.indexOf(trackKey as any);
    setTrack(keys[(idx + 1) % keys.length]);
  }, [trackKey, setTrack]);

  return {
    iframeRef, trackKey, customVideoId, currentVideoId,
    playing, volume, toggle, setTrack, setCustom, skip, changeVolume,
  };
}
