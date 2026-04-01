import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { detectBibleReferences } from "@/lib/bibleRefDetection";
import { setupBibleRefListeners, forceHideTooltip } from "@/lib/bibleRefExtension";

/** Inject bible-ref-detected spans into raw HTML */
function injectBibleRefs(html: string): string {
  return html.replace(/([^<]+)(?=<|$)/g, (textSegment) => {
    const refs = detectBibleReferences(textSegment);
    if (!refs.length) return textSegment;

    let result = textSegment;
    const sorted = [...refs].sort((a, b) => {
      const idxA = textSegment.indexOf(a.fullMatch);
      const idxB = textSegment.indexOf(b.fullMatch);
      return idxB - idxA;
    });

    for (const ref of sorted) {
      const idx = result.indexOf(ref.fullMatch);
      if (idx === -1) continue;
      const before = result.slice(0, idx);
      const after = result.slice(idx + ref.fullMatch.length);
      result = `${before}<span class="bible-ref-detected" data-bible-ref="${ref.normalized}">${ref.fullMatch}</span>${after}`;
    }
    return result;
  });
}

export default function SharedNote() {
  const { slug } = useParams<{ slug: string }>();
  const [note, setNote] = useState<{ texto: string; categoria: string; updated_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }

    const load = async () => {
      const { data: share, error: shareErr } = await (supabase as any)
        .from("note_shares")
        .select("note_id")
        .eq("slug", slug)
        .maybeSingle();

      if (shareErr || !share) { setNotFound(true); setLoading(false); return; }

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

  // Setup bible ref hover/tooltip listeners on content
  useEffect(() => {
    if (!contentRef.current || !note) return;
    const cleanup = setupBibleRefListeners(contentRef.current);
    return () => {
      cleanup();
      forceHideTooltip();
    };
  }, [note]);

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

  // Extract title from content — same logic as BibleNotes noteTitle
  const stripped = note.texto
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h[1-6]|div|li|blockquote)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .trim();
  const lines = stripped.split("\n").map(l => l.trim()).filter(Boolean);
  const title = lines[0]?.replace(/^#{1,3}\s*/, "") || "Sem título";

  const MONTHS_FULL = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const d = new Date(note.updated_at);
  const dateStr = `${d.getDate()} de ${MONTHS_FULL[d.getMonth()]} de ${d.getFullYear()}`;

  // Inject bible references into the HTML content
  const contentWithRefs = injectBibleRefs(note.texto);

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

        {/* Content — uses same tiptap CSS as the editor */}
        <div
          ref={contentRef}
          className="tiptap-editor-content"
          style={{
            fontFamily: "Georgia, 'Crimson Text', serif",
            fontSize: "15px",
            lineHeight: 1.75,
          }}
          dangerouslySetInnerHTML={{ __html: contentWithRefs }}
        />

        <hr className="border-border-subtle mt-12 mb-6" />
        <p className="text-center text-muted-foreground font-display text-[9px] tracking-[3px] uppercase">
          Material de Estudo Bíblico
        </p>
      </div>
    </div>
  );
}
