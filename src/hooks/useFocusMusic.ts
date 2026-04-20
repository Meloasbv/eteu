import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type FocusTrackKey = "lofi" | "piano" | "ambient" | "custom";

export const FOCUS_TRACKS: Record<Exclude<FocusTrackKey, "custom">, { id: string; label: string; emoji: string }> = {
  lofi: { id: "jfKfPfyJRdk", label: "Lo-fi", emoji: "🌙" },
  piano: { id: "4xDzrJKXOOY", label: "Piano", emoji: "🎹" }, // Peaceful piano (embeddable)
  ambient: { id: "DWcJFNfaw9c", label: "Ambient", emoji: "🌌" },
};

/** Extract YouTube video ID from various URL formats */
export function extractYoutubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
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
 * YouTube iframe controller for Focus Mode music.
 * Uses postMessage IFrame API (no extra script load required).
 * Track switching uses loadVideoById to avoid iframe reloads.
 */
export function useFocusMusic(active: boolean) {
  const [trackKey, setTrackKey] = useState<FocusTrackKey>("lofi");
  const [customVideoId, setCustomVideoId] = useState<string>(() => {
    try { return localStorage.getItem("focus-custom-yt") || ""; } catch { return ""; }
  });
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(60);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);

  const currentVideoId = useMemo(() => {
    if (trackKey === "custom") return customVideoId || FOCUS_TRACKS.lofi.id;
    return FOCUS_TRACKS[trackKey].id;
  }, [trackKey, customVideoId]);

  const post = useCallback((func: string, args: any[] = []) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  }, []);

  // Listen for player ready/state events from YouTube
  useEffect(() => {
    if (!active) return;
    const onMsg = (e: MessageEvent) => {
      if (typeof e.data !== "string") return;
      try {
        const data = JSON.parse(e.data);
        if (data.event === "onReady" || data.info === "ready") {
          readyRef.current = true;
          post("setVolume", [volume]);
          post("playVideo");
          setPlaying(true);
        }
      } catch {}
    };
    window.addEventListener("message", onMsg);
    // Subscribe to events from iframe
    const t = setTimeout(() => {
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: "listening" }), "*");
      }
    }, 600);
    return () => { window.removeEventListener("message", onMsg); clearTimeout(t); };
  }, [active, post, volume]);

  // Initial autoplay attempt
  useEffect(() => {
    if (!active) {
      post("pauseVideo");
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => {
      post("playVideo");
      post("setVolume", [volume]);
      setPlaying(true);
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const toggle = useCallback(() => {
    if (playing) { post("pauseVideo"); setPlaying(false); }
    else { post("playVideo"); setPlaying(true); }
  }, [playing, post]);

  const setTrack = useCallback((k: FocusTrackKey) => {
    const id = k === "custom" ? customVideoId : FOCUS_TRACKS[k as Exclude<FocusTrackKey, "custom">].id;
    if (!id) return;
    setTrackKey(k);
    // Use loadVideoById to switch without reloading iframe (avoids losing player state)
    post("loadVideoById", [{ videoId: id, startSeconds: 0 }]);
    setTimeout(() => { post("setVolume", [volume]); post("playVideo"); }, 200);
    setPlaying(true);
  }, [customVideoId, post, volume]);

  const setCustom = useCallback((urlOrId: string) => {
    const id = extractYoutubeId(urlOrId);
    if (!id) return false;
    setCustomVideoId(id);
    try { localStorage.setItem("focus-custom-yt", id); } catch {}
    setTrackKey("custom");
    post("loadVideoById", [{ videoId: id, startSeconds: 0 }]);
    setTimeout(() => { post("setVolume", [volume]); post("playVideo"); }, 200);
    setPlaying(true);
    return true;
  }, [post, volume]);

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
