import { useEffect, useState } from "react";
import { Brain, Loader2, ExternalLink, Share2 } from "lucide-react";
import { ArtifactShell, ArtifactAction } from "./ArtifactShell";
import { FOCUS_PALETTE as P } from "./types";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  data: { mapId?: string; title?: string };
  userCodeId: string;
  sendAsUser: (text: string) => void;
}

interface MapRow {
  id: string;
  title: string;
  nodes: any;
  edges: any;
}

export default function MindMapPreviewArtifact({ data, userCodeId, sendAsUser }: Props) {
  const [map, setMap] = useState<MapRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      let q = supabase.from("mind_maps").select("id,title,nodes,edges").eq("user_code_id", userCodeId);
      if (data.mapId) q = q.eq("id", data.mapId);
      else if (data.title) q = q.ilike("title", `%${data.title}%`);
      const { data: rows } = await q.order("updated_at", { ascending: false }).limit(1);
      if (alive) {
        setMap((rows?.[0] as MapRow) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [data.mapId, data.title, userCodeId]);

  const topics: string[] = Array.isArray(map?.nodes)
    ? map!.nodes.filter((n: any) => n?.type === "topic" || n?.data?.label).slice(0, 8).map((n: any) => n?.data?.label || n?.data?.title || "Tópico")
    : [];

  return (
    <ArtifactShell
      icon={<Brain size={13} />}
      label={map?.title || data.title || "Mapa mental"}
      badge={map ? `${(map.nodes as any)?.length ?? 0} nodes` : undefined}
    >
      {loading ? (
        <div className="flex items-center gap-2 py-3 text-[13px]" style={{ color: P.textDim }}>
          <Loader2 size={13} className="animate-spin" /> Carregando preview…
        </div>
      ) : !map ? (
        <p className="text-[13px] mb-4" style={{ color: P.textDim }}>
          Mapa não encontrado. Tente "meus mapas mentais" para listar tudo.
        </p>
      ) : (
        <>
          <div
            className="rounded-xl mb-3 flex flex-wrap items-center justify-center gap-1.5 p-4"
            style={{
              minHeight: 140,
              background: `${P.primary}05`,
              border: `1px dashed ${P.primary}1a`,
            }}
          >
            {topics.length === 0 ? (
              <p className="text-[12px]" style={{ color: P.textFaint }}>
                Mapa vazio — abra para começar a editar.
              </p>
            ) : (
              topics.map((t, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2 py-1 rounded-md"
                  style={{
                    background: i === 0 ? `${P.primary}1a` : `${P.surface}`,
                    color: i === 0 ? P.primary : P.text,
                    border: `1px solid ${i === 0 ? P.primary + "40" : P.border}`,
                  }}
                >
                  {t}
                </span>
              ))
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <ArtifactAction onClick={() => sendAsUser(`abrir mapa em tela cheia: ${map.title}`)} variant="primary">
              <ExternalLink size={11} /> Tela cheia
            </ArtifactAction>
            <ArtifactAction onClick={() => sendAsUser(`compartilhar mapa: ${map.title}`)}>
              <Share2 size={11} /> Compartilhar
            </ArtifactAction>
          </div>
        </>
      )}
    </ArtifactShell>
  );
}
