import { useCallback, useEffect, useRef, useState } from "react";

export type FocusTrackKey = "lofi" | "piano" | "ambient";

export const FOCUS_TRACKS: Record<FocusTrackKey, { id: string; label: string; emoji: string }> = {
  lofi: { id: "jfKfPfyJRdk", label: "Lo-fi Reflexão", emoji: "🌙" },
  piano: { id: "y7e-GC6oGhg", label: "Piano Sacro", emoji: "🎹" },
  ambient: { id: "DWcJFNfaw9c", label: "Ambient Deep Focus", emoji: "🌌" },
};

/**
 * Lazy YouTube iframe controller for Focus Mode music.
 * Uses postMessage IFrame API (no extra script load required).
 */
export function useFocusMusic(active: boolean) {
  const [trackKey, setTrackKey] = useState<FocusTrackKey>("lofi");
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(60); // 0-100
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const post = useCallback((func: string, args: any[] = []) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  }, []);

  // When focus mode opens, autoplay; when it closes, pause
  useEffect(() => {
    if (active) {
      // Tiny delay so iframe mounts
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
    if (playing) {
      post("pauseVideo");
      setPlaying(false);
    } else {
      post("playVideo");
      setPlaying(true);
    }
  }, [playing, post]);

  const setTrack = useCallback((k: FocusTrackKey) => {
    setTrackKey(k);
    setPlaying(true);
  }, []);

  const changeVolume = useCallback((v: number) => {
    setVolume(v);
    post("setVolume", [v]);
  }, [post]);

  const skip = useCallback(() => {
    const keys = Object.keys(FOCUS_TRACKS) as FocusTrackKey[];
    const idx = keys.indexOf(trackKey);
    setTrack(keys[(idx + 1) % keys.length]);
  }, [trackKey, setTrack]);

  return { iframeRef, trackKey, playing, volume, toggle, setTrack, skip, changeVolume };
}
