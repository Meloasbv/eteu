import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff, Copy, Save, Trash2, Maximize2, Minimize2, Radio } from "lucide-react";
import { ArtifactShell, ArtifactAction } from "./ArtifactShell";
import { FOCUS_PALETTE as P } from "./types";
import { haptic } from "@/hooks/useHaptic";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  data: { autoStart?: boolean; presentMode?: boolean };
  userCodeId: string;
  sendAsUser: (text: string) => void;
}

/**
 * Live transcription artifact — uses Web Speech API (pt-BR) to listen
 * and write what is being said in real time. "Apresentar" mode enlarges
 * the text for projection / sharing.
 */
export default function TranscriptionArtifact({ data, userCodeId }: Props) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [committed, setCommitted] = useState("");
  const [interim, setInterim] = useState("");
  const [present, setPresent] = useState(!!data.presentMode);
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);

  // Init recognition
  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event: any) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript + " ";
        else interimText += r[0].transcript;
      }
      if (finalText) {
        setCommitted((prev) => (prev ? prev + " " : "") + finalText.trim());
      }
      setInterim(interimText);
    };
    rec.onerror = (e: any) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      console.warn("Speech error:", e.error);
    };
    rec.onend = () => {
      if (shouldRestartRef.current) {
        try {
          rec.start();
        } catch {}
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = rec;
    return () => {
      shouldRestartRef.current = false;
      try {
        rec.stop();
      } catch {}
    };
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    haptic("medium");
    shouldRestartRef.current = true;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {}
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    haptic("light");
    shouldRestartRef.current = false;
    try {
      recognitionRef.current.stop();
    } catch {}
    setListening(false);
  }, []);

  // Auto-start
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (data.autoStart && !autoStartedRef.current && supported) {
      autoStartedRef.current = true;
      setTimeout(() => start(), 300);
    }
  }, [data.autoStart, supported, start]);

  // Auto-scroll
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [committed, interim]);

  const fullText = committed + (interim ? " " + interim : "");

  const copy = async () => {
    if (!fullText.trim()) return;
    try {
      await navigator.clipboard.writeText(committed.trim());
      toast({ title: "Transcrição copiada" });
      haptic("light");
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  const save = async () => {
    if (!committed.trim() || !userCodeId) return;
    try {
      const { error } = await supabase.from("notes").insert({
        user_code_id: userCodeId,
        texto: `<h2>Transcrição</h2><p>${committed.trim().replace(/\n/g, "</p><p>")}</p>`,
        categoria: "Transcrição",
      });
      if (error) throw error;
      toast({ title: "Salvo no Caderno ✓" });
      haptic("medium");
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" });
    }
  };

  const clear = () => {
    setCommitted("");
    setInterim("");
    haptic("light");
  };

  if (!supported) {
    return (
      <ArtifactShell icon={<Radio size={13} />} label="Transcrição ao vivo">
        <p className="text-[13.5px]" style={{ color: P.textDim }}>
          Seu navegador não suporta reconhecimento de voz. Use Chrome, Edge ou Safari recentes.
        </p>
      </ArtifactShell>
    );
  }

  return (
    <ArtifactShell
      icon={<Radio size={13} />}
      label={listening ? "Ouvindo…" : "Transcrição ao vivo"}
      badge={listening ? "REC" : "Pronto"}
    >
      <div
        ref={bodyRef}
        className="relative rounded-xl px-4 py-4 mb-3 overflow-y-auto"
        style={{
          background: present ? "#000" : P.surfaceLight,
          border: `1px solid ${P.border}`,
          minHeight: present ? "60vh" : 180,
          maxHeight: present ? "70vh" : 320,
          fontFamily: "'Crimson Text', Georgia, serif",
          fontSize: present ? 28 : 16,
          lineHeight: present ? 1.5 : 1.75,
          color: present ? "#f5e9c8" : P.text,
          letterSpacing: present ? "0.01em" : 0,
        }}
        aria-live="polite"
      >
        {!fullText.trim() && (
          <p
            className="italic"
            style={{ color: P.textFaint, fontSize: present ? 18 : 14 }}
          >
            {listening
              ? "Fale algo… o texto aparecerá aqui em tempo real."
              : "Pressione o microfone para começar a transcrição."}
          </p>
        )}
        {committed && <span>{committed}</span>}
        {interim && (
          <span style={{ opacity: 0.55, fontStyle: "italic" }}> {interim}</span>
        )}
        {listening && (
          <span
            className="inline-block w-[2px] h-[1em] ml-0.5 align-middle"
            style={{
              background: P.primary,
              animation: "trCaret 1s steps(2) infinite",
            }}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {!listening ? (
          <ArtifactAction onClick={start} variant="primary">
            <Mic size={11} /> Ouvir
          </ArtifactAction>
        ) : (
          <ArtifactAction onClick={stop} variant="primary">
            <MicOff size={11} /> Parar
          </ArtifactAction>
        )}
        <ArtifactAction onClick={() => setPresent((p) => !p)}>
          {present ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
          {present ? " Sair" : " Apresentar"}
        </ArtifactAction>
        <ArtifactAction onClick={copy}>
          <Copy size={11} /> Copiar
        </ArtifactAction>
        <ArtifactAction onClick={save}>
          <Save size={11} /> Salvar nota
        </ArtifactAction>
        <ArtifactAction onClick={clear}>
          <Trash2 size={11} /> Limpar
        </ArtifactAction>
      </div>

      <style>{`
        @keyframes trCaret { 0%,100% { opacity: 1 } 50% { opacity: 0 } }
      `}</style>
    </ArtifactShell>
  );
}
