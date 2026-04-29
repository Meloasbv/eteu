import { useEffect, useRef } from "react";

/** Desenha waveform em tempo real num canvas a partir de um MediaStream. */
export function useWaveform(canvas: HTMLCanvasElement | null, stream: MediaStream | null, color = "#d4a94a") {
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!canvas || !stream) return;
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    const audioCtx: AudioContext = new AC();
    ctxRef.current = audioCtx;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    const ctx2d = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;

    function fit() {
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
    }
    fit();
    const onResize = () => fit();
    window.addEventListener("resize", onResize);

    const render = () => {
      if (!canvas) return;
      analyser.getByteFrequencyData(data);
      const W = canvas.width;
      const H = canvas.height;
      ctx2d.clearRect(0, 0, W, H);
      const bars = data.length;
      const barW = (W / bars) * 0.6;
      const gap = (W / bars) * 0.4;
      for (let i = 0; i < bars; i++) {
        const v = data[i] / 255;
        const h = Math.max(2 * dpr, v * H * 0.85);
        const x = i * (barW + gap);
        const y = (H - h) / 2;
        ctx2d.fillStyle = color.startsWith("#")
          ? hexAlpha(color, 0.35 + v * 0.55)
          : color;
        roundRect(ctx2d, x, y, barW, h, barW / 2);
      }
      rafRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { source.disconnect(); } catch {}
      try { analyser.disconnect(); } catch {}
      try { audioCtx.close(); } catch {}
    };
  }, [canvas, stream, color]);
}

function hexAlpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}
