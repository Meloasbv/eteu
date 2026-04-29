import { useCallback, useEffect, useRef, useState } from "react";

/** Grava o microfone via MediaRecorder e devolve um Blob ao parar. */
export function useMediaRecorderAudio() {
  const [recording, setRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const blobResolveRef = useRef<((b: Blob) => void) | null>(null);

  const start = useCallback(async () => {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    setStream(s);
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : MediaRecorder.isTypeSupported("audio/mp4")
      ? "audio/mp4"
      : "";
    const rec = mime ? new MediaRecorder(s, { mimeType: mime }) : new MediaRecorder(s);
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
      blobResolveRef.current?.(blob);
      blobResolveRef.current = null;
      s.getTracks().forEach((t) => t.stop());
      setStream(null);
    };
    rec.start(1000);
    recRef.current = rec;
    setRecording(true);
  }, []);

  const stop = useCallback(() => {
    return new Promise<Blob | null>((resolve) => {
      if (!recRef.current) return resolve(null);
      blobResolveRef.current = resolve;
      try { recRef.current.stop(); } catch { resolve(null); }
      setRecording(false);
    });
  }, []);

  useEffect(() => () => {
    try { recRef.current?.stop(); } catch {}
    stream?.getTracks().forEach((t) => t.stop());
  }, []); // eslint-disable-line

  return { start, stop, recording, stream };
}
