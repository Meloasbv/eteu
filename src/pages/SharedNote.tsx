import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function SharedNote() {
  const { slug } = useParams<{ slug: string }>();
  const [note, setNote] = useState<{ texto: string; categoria: string; updated_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }

    const load = async () => {
      // Find the share record
      const { data: share, error: shareErr } = await (supabase as any)
        .from("note_shares")
        .select("note_id")
        .eq("slug", slug)
        .maybeSingle();

      if (shareErr || !share) { setNotFound(true); setLoading(false); return; }

      // Load the note
      const { data: noteData, error: noteErr } = await (supabase as any)
        .from("notes")
        .select("texto, categoria, updated_at")
        .eq("id", share.note_id)
        .maybeSingle();

      if (noteErr || !noteData) { setNotFound(true); setLoading(false); return; }

      setNote(noteData);
      setLoading(false);
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground font-body text-sm animate-pulse">Carregando...</div>
      </div>
    );
  }

  if (notFound || !note) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <span className="text-4xl">📝</span>
        <p className="text-foreground font-display text-lg">Nota não encontrada</p>
        <p className="text-muted-foreground font-body text-sm">Este link pode ter expirado ou sido removido.</p>
      </div>
    );
  }

  // Extract title from content
  const stripped = note.texto.replace(/<[^>]*>/g, "").trim();
  const title = stripped.split("\n")[0]?.trim().replace(/^#{1,3}\s*/, "") || "Sem título";

  const MONTHS_FULL = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const d = new Date(note.updated_at);
  const dateStr = `${d.getDate()} de ${MONTHS_FULL[d.getMonth()]} de ${d.getFullYear()}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <p className="font-display text-[9px] tracking-[4px] uppercase text-muted-foreground mb-2">
          Nota compartilhada
        </p>
        <h1 className="font-display text-2xl text-foreground mb-2">{title}</h1>
        <p className="font-body text-sm text-muted-foreground italic mb-8">{dateStr}</p>

        <hr className="border-border-subtle mb-8" />

        {/* Content */}
        <div
          className="prose prose-invert max-w-none font-body text-base leading-relaxed text-foreground
            [&_h2]:font-display [&_h2]:text-lg [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3
            [&_h3]:font-display [&_h3]:text-base [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2
            [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
            [&_strong]:text-foreground [&_em]:text-foreground/80
            [&_img]:rounded-xl [&_img]:border [&_img]:border-border [&_img]:shadow-elegant [&_img]:max-w-full"
          dangerouslySetInnerHTML={{ __html: note.texto }}
        />

        <hr className="border-border-subtle mt-12 mb-6" />
        <p className="text-center text-muted-foreground font-display text-[9px] tracking-[3px] uppercase">
          Material de Estudo Bíblico
        </p>
      </div>
    </div>
  );
}
