import { useEffect, useState } from "react";
import { Check, Loader2, PenLine, ExternalLink } from "lucide-react";
import { ArtifactShell, ArtifactAction } from "./ArtifactShell";
import { FOCUS_PALETTE as P } from "./types";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  data: { content: string; saved?: boolean; noteId?: string };
  userCodeId: string;
  sendAsUser: (text: string) => void;
}

export default function NoteArtifact({ data, userCodeId, sendAsUser }: Props) {
  const [saving, setSaving] = useState(!data.saved);
  const [noteId, setNoteId] = useState<string | null>(data.noteId ?? null);

  useEffect(() => {
    if (data.saved || !userCodeId) {
      setSaving(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const { data: row, error } = await supabase
          .from("notes")
          .insert({
            user_code_id: userCodeId,
            categoria: "aulas",
            semana: "captura-foco",
            texto: data.content,
          })
          .select("id")
          .single();
        if (error) throw error;
        if (alive) setNoteId(row?.id ?? null);
      } catch (e) {
        console.error("note save failed:", e);
      } finally {
        if (alive) setSaving(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [data.content, data.saved, userCodeId]);

  return (
    <ArtifactShell
      icon={<PenLine size={13} />}
      label="Nota salva"
      badge={saving ? "Salvando…" : "✓ Salvo"}
    >
      <p
        className="text-[14px] leading-[1.7] mb-4 whitespace-pre-wrap"
        style={{ color: P.text, fontFamily: "'Crimson Text', Georgia, serif" }}
      >
        {data.content}
      </p>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span
          className="text-[10px] px-2 py-0.5 rounded-md"
          style={{ background: `${P.primary}10`, color: P.primary, border: `1px solid ${P.primary}26` }}
        >
          captura-foco
        </span>
        {saving && (
          <span className="text-[10px] flex items-center gap-1" style={{ color: P.textDim }}>
            <Loader2 size={10} className="animate-spin" /> sincronizando
          </span>
        )}
        {!saving && (
          <span className="text-[10px] flex items-center gap-1" style={{ color: P.primary }}>
            <Check size={10} /> persistido
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <ArtifactAction
          onClick={() => sendAsUser(`expandir esta nota: ${data.content.slice(0, 80)}`)}
          variant="primary"
        >
          <ExternalLink size={11} /> Expandir
        </ArtifactAction>
      </div>
    </ArtifactShell>
  );
}
