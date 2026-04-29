import { useState, useCallback, useMemo } from "react";
import { Copy, Check, ExternalLink, X, Globe, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  sessionId: string;
  title: string;
  isPublic: boolean;
  publicSlug: string | null;
  onClose: () => void;
  onUpdate: (isPublic: boolean, slug: string | null) => void;
}

function generateSlug(title: string): string {
  const base = (title || "estudo")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 40);
  const rand = Math.random().toString(36).substring(2, 6);
  return `${base || "estudo"}-${rand}`;
}

export default function ShareStudyDialog({ sessionId, title, isPublic, publicSlug, onClose, onUpdate }: Props) {
  const [sharing, setSharing] = useState(isPublic);
  const [slug, setSlug] = useState(publicSlug);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const publicUrl = useMemo(() => slug ? `${window.location.origin}/estudo/${slug}` : "", [slug]);

  const togglePublic = useCallback(async () => {
    setLoading(true);
    try {
      if (!sharing) {
        const newSlug = slug || generateSlug(title);
        const { error } = await supabase
          .from("study_sessions")
          .update({ is_public: true, public_slug: newSlug, shared_at: new Date().toISOString() })
          .eq("id", sessionId);
        if (error) throw error;
        setSlug(newSlug); setSharing(true);
        onUpdate(true, newSlug);
        toast.success("Estudo publicado!");
      } else {
        const { error } = await supabase
          .from("study_sessions")
          .update({ is_public: false })
          .eq("id", sessionId);
        if (error) throw error;
        setSharing(false);
        onUpdate(false, slug);
        toast.success("Estudo tornado privado.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar.");
    } finally {
      setLoading(false);
    }
  }, [sharing, slug, title, sessionId, onUpdate]);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  }, [publicUrl]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 rounded-2xl animate-scale-in" style={{ background: "#1e1a14", border: "1px solid rgba(196,164,106,0.2)" }}>
        <div className="flex items-center justify-between p-5 pb-3">
          <h3 className="font-display text-lg font-semibold truncate pr-3" style={{ color: "#ede4d3" }}>
            Compartilhar estudo
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <X size={18} style={{ color: "#8a7d6a" }} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          <button
            onClick={togglePublic}
            disabled={loading}
            className="w-full flex items-center gap-3 p-4 rounded-xl transition-all disabled:opacity-60"
            style={{
              background: sharing ? "rgba(196,164,106,0.08)" : "rgba(92,83,71,0.1)",
              border: `1px solid ${sharing ? "rgba(196,164,106,0.25)" : "rgba(92,83,71,0.2)"}`,
            }}
          >
            {sharing ? <Globe size={18} style={{ color: "#c4a46a" }} /> : <Lock size={18} style={{ color: "#5c5347" }} />}
            <div className="text-left flex-1">
              <p className="text-sm font-sans font-semibold" style={{ color: sharing ? "#c4a46a" : "#8a7d6a" }}>
                {sharing ? "Público · somente leitura" : "Privado"}
              </p>
              <p className="text-[11px] font-sans" style={{ color: "#5c5347" }}>
                {sharing ? "Qualquer pessoa com o link pode ler o estudo" : "Apenas você tem acesso"}
              </p>
            </div>
            <div className="w-10 h-6 rounded-full relative transition-all" style={{ background: sharing ? "#c4a46a" : "rgba(92,83,71,0.3)" }}>
              <div className="absolute top-1 w-4 h-4 rounded-full transition-all" style={{ background: "#1e1a14", left: sharing ? 20 : 4 }} />
            </div>
          </button>

          {sharing && slug && (
            <div className="space-y-2">
              <p className="text-[11px] font-sans uppercase tracking-[1.5px]" style={{ color: "#5c5347" }}>Link público</p>
              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(15,13,10,0.6)", border: "1px solid rgba(92,83,71,0.2)" }}>
                <span className="text-[12px] font-mono truncate flex-1" style={{ color: "#c4b89e" }}>{publicUrl}</span>
                <button onClick={copyLink} className="p-2 rounded-lg transition-colors hover:bg-white/5 flex-shrink-0">
                  {copied ? <Check size={14} style={{ color: "#8b9e7a" }} /> : <Copy size={14} style={{ color: "#c4a46a" }} />}
                </button>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg transition-colors hover:bg-white/5 flex-shrink-0">
                  <ExternalLink size={14} style={{ color: "#8a7d6a" }} />
                </a>
              </div>
              <p className="text-[10px] font-sans" style={{ color: "#5c5347" }}>
                Alterações no estudo aparecerão automaticamente no link compartilhado.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
