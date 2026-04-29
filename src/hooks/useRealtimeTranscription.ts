import { useEffect, useRef, useState, useCallback } from "react";
import type { TranscriptSegment } from "@/components/agent/types";

interface State {
  supported: boolean;
  listening: boolean;
  segments: TranscriptSegment[];
  interim: string;
  error: string | null;
}

/** Web Speech API com restart automático quando termina inesperadamente. */
export function useRealtimeTranscription(opts?: { onFinalSegment?: (s: TranscriptSegment) => void }) {
  const [state, setState] = useState<State>({
    supported: true, listening: false, segments: [], interim: "", error: null,
  });
  const recRef = useRef<any>(null);
  const startedAtRef = useRef<number>(0);
  const shouldRestartRef = useRef(false);
  const onFinalRef = useRef(opts?.onFinalSegment);
  onFinalRef.current = opts?.onFinalSegment;

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setState((s) => ({ ...s, supported: false }));
      return;
    }
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      let interim = "";
      const finals: TranscriptSegment[] = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const text = r[0].transcript;
        if (r.isFinal) {
          const seg: TranscriptSegment = {
            id: `seg-${Date.now()}-${i}`,
            text: text.trim(),
            timestamp: Date.now() - startedAtRef.current,
            isFinal: true,
          };
          finals.push(seg);
        } else {
          interim += text;
        }
      }
      setState((s) => ({
        ...s,
        segments: finals.length ? [...s.segments, ...finals] : s.segments,
        interim,
      }));
      finals.forEach((f) => onFinalRef.current?.(f));
    };
    rec.onerror = (e: any) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      console.warn("[useRealtimeTranscription]", e.error);
      setState((s) => ({ ...s, error: e.error }));
    };
    rec.onend = () => {
      if (shouldRestartRef.current) {
        try { rec.start(); } catch {}
      } else {
        setState((s) => ({ ...s, listening: false }));
      }
    };
    recRef.current = rec;
    return () => {
      shouldRestartRef.current = false;
      try { rec.stop(); } catch {}
    };
  }, []);

  const start = useCallback(() => {
    if (!recRef.current) return;
    startedAtRef.current = Date.now();
    shouldRestartRef.current = true;
    setState((s) => ({ ...s, segments: [], interim: "", error: null, listening: true }));
    try { recRef.current.start(); } catch {}
  }, []);

  const stop = useCallback(() => {
    shouldRestartRef.current = false;
    try { recRef.current?.stop(); } catch {}
    setState((s) => ({ ...s, listening: false, interim: "" }));
  }, []);

  const pause = useCallback(() => {
    shouldRestartRef.current = false;
    try { recRef.current?.stop(); } catch {}
    setState((s) => ({ ...s, listening: false }));
  }, []);

  const resume = useCallback(() => {
    if (!recRef.current) return;
    shouldRestartRef.current = true;
    setState((s) => ({ ...s, listening: true }));
    try { recRef.current.start(); } catch {}
  }, []);

  return { ...state, start, stop, pause, resume };
}
