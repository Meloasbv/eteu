import { useState, useCallback, useMemo, useEffect } from "react";
import { Copy, Check, ExternalLink, X, Globe, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShareDialogProps {
  mapId: string | null;
  title: string;
  isPublic: boolean;
  publicSlug: string | null;
  onClose: () => void;
  onUpdate: (isPublic: boolean, slug: string | null) => void;
  onEnsureSaved?: () => Promise<string | null>;
}

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 40);
  const rand = Math.random().toString(36).substring(2, 5);
  return `${base}-${rand}`;
}

export default function ShareDialog({ mapId, title, isPublic, publicSlug, onClose, onUpdate, onEnsureSaved }: ShareDialogProps) {
  const [sharing, setSharing] = useState(isPublic);
  const [slug, setSlug] = useState(publicSlug);
  const [resolvedMapId, setResolvedMapId] = useState<string | null>(mapId);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setResolvedMapId(mapId);
  }, [mapId]);

  useEffect(() => {
    setSharing(isPublic);
    setSlug(publicSlug);
  }, [isPublic, publicSlug]);

  const publicUrl = useMemo(() => {
    if (!slug) return "";
    return `${window.location.origin}/m/${slug}`;
  }, [slug]);

  const togglePublic = useCallback(async () => {
    setLoading(true);
    try {
      let effectiveMapId = resolvedMapId;

      if (!effectiveMapId && onEnsureSaved) {
        effectiveMapId = await onEnsureSaved();
        if (effectiveMapId) {
          setResolvedMapId(effectiveMapId);
        }
      }

      if (!effectiveMapId) {
        throw new Error("Salve o mapa antes de compartilhar.");
      }

      const { data: currentMap, error: readError } = await supabase
        .from("mind_maps")
        .select("study_notes")
        .eq("id", effectiveMapId)
        .maybeSingle();

      if (readError) throw readError;
      if (!currentMap) throw new Error("Não foi possível localizar o mapa salvo.");

      const currentStudyNotes = (currentMap.study_notes as Record<string, unknown> | null) ?? {};

      if (!sharing) {
        const newSlug = slug || generateSlug(title);
        const { error: updateError } = await supabase
          .from("mind_maps")
          .update({
            study_notes: {
              ...currentStudyNotes,
              is_public: true,
              public_slug: newSlug,
              shared_at: new Date().toISOString(),
            } as any,
          })
          .eq("id", effectiveMapId);

        if (updateError) throw updateError;

        setSlug(newSlug);
        setSharing(true);
        onUpdate(true, newSlug);
        toast.success("Mapa publicado!");
      } else {
        const { error: updateError } = await supabase
          .from("mind_maps")
          .update({
            study_notes: {
              ...currentStudyNotes,
              is_public: false,
              public_slug: null,
            } as any,
          })
          .eq("id", effectiveMapId);

        if (updateError) throw updateError;

        setSlug(null);
        setSharing(false);
        onUpdate(false, null);
        toast.success("Mapa tornado privado.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar compartilhamento.");
    } finally {
      setLoading(false);
    }
  }, [resolvedMapId, onEnsureSaved, sharing, slug, title, onUpdate]);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  }, [publicUrl]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl animate-scale-in"
        style={{ background: "#1e1a14", border: "1px solid rgba(196,164,106,0.2)" }}
      >
        <div className="flex items-center justify-between p-5 pb-3">
          <h3 className="font-display text-lg font-semibold" style={{ color: "#ede4d3" }}>
            Compartilhar "{title}"
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <X size={18} style={{ color: "#8a7d6a" }} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          <button
            onClick={togglePublic}
            disabled={loading}
            className="w-full flex items-center gap-3 p-4 rounded-xl transition-all"
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
                {sharing ? "Qualquer pessoa com o link pode visualizar" : "Apenas você tem acesso"}
              </p>
            </div>
            <div
              className="w-10 h-6 rounded-full relative transition-all"
              style={{ background: sharing ? "#c4a46a" : "rgba(92,83,71,0.3)" }}
            >
              <div
                className="absolute top-1 w-4 h-4 rounded-full transition-all"
                style={{
                  background: "#1e1a14",
                  left: sharing ? 20 : 4,
                }}
              />
            </div>
          </button>

          {sharing && slug && (
            <div className="space-y-2">
              <p className="text-[11px] font-sans uppercase tracking-[1.5px]" style={{ color: "#5c5347" }}>
                Link público
              </p>
              <div
                className="flex items-center gap-2 p-3 rounded-xl"
                style={{ background: "rgba(15,13,10,0.6)", border: "1px solid rgba(92,83,71,0.2)" }}
              >
                <span className="text-[12px] font-mono truncate flex-1" style={{ color: "#c4b89e" }}>
                  {publicUrl}
                </span>
                <button
                  onClick={copyLink}
                  className="p-2 rounded-lg transition-colors hover:bg-white/5 flex-shrink-0"
                >
                  {copied
                    ? <Check size={14} style={{ color: "#8b9e7a" }} />
                    : <Copy size={14} style={{ color: "#c4a46a" }} />}
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg transition-colors hover:bg-white/5 flex-shrink-0"
                >
                  <ExternalLink size={14} style={{ color: "#8a7d6a" }} />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
