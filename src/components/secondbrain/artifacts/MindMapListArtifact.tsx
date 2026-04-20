import { useEffect, useState } from "react";
import { Brain, Loader2, Plus, FileUp, ExternalLink } from "lucide-react";
import { ArtifactShell, ArtifactAction } from "./ArtifactShell";
import { FOCUS_PALETTE as P } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { openFocusTool } from "@/lib/focusTools";

interface MapRow {
  id: string;
  title: string;
  source_type: string | null;
  updated_at: string;
  nodes: any;
}

interface Props {
  data: { topic?: string };
  userCodeId: string;
  sendAsUser: (text: string) => void;
}

const fmtAgo = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86_400_000);
  if (d > 1) return `há ${d} dias`;
  if (d === 1) return "ontem";
  const h = Math.floor(ms / 3_600_000);
  if (h >= 1) return `há ${h}h`;
  const m = Math.floor(ms / 60_000);
  return m <= 1 ? "agora" : `há ${m}min`;
};

export default function MindMapListArtifact({ data, userCodeId, sendAsUser }: Props) {
  const [maps, setMaps] = useState<MapRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: rows, error } = await supabase
        .from("mind_maps")
        .select("id,title,source_type,updated_at,nodes")
        .eq("user_code_id", userCodeId)
        .order("updated_at", { ascending: false })
        .limit(6);
      if (error) {
        console.error(error);
        if (alive) setMaps([]);
        return;
      }
      if (alive) setMaps((rows as MapRow[]) ?? []);
    })();
    return () => {
      alive = false;
    };
  }, [userCodeId]);

  const openMap = (m: MapRow) => openFocusTool({ tool: "mindmap-open", mapId: m.id });

  return (
    <ArtifactShell
      icon={<Brain size={13} />}
      label="Seus estudos"
      badge={maps ? `${maps.length}` : undefined}
    >
      {!maps ? (
        <div className="flex items-center gap-2 py-3 text-[13px]" style={{ color: P.textDim }}>
          <Loader2 size={13} className="animate-spin" /> Carregando seus estudos…
        </div>
      ) : maps.length === 0 ? (
        <p className="text-[13px] mb-4" style={{ color: P.textDim }}>
          Nenhum estudo ainda. Suba um PDF ou crie um mapa para começar.
        </p>
      ) : (
        <div className="space-y-2 mb-4">
          {maps.map((m) => {
            const nodeCount = Array.isArray(m.nodes) ? m.nodes.length : 0;
            const isAi = m.source_type === "ai";
            return (
              <button
                key={m.id}
                onClick={() => openMap(m)}
                className="w-full flex items-center justify-between gap-3 p-3 rounded-xl text-left transition-all hover:translate-y-[-1px] active:scale-[0.99]"
                style={{
                  background: `${P.primary}06`,
                  border: `1px solid ${P.primary}14`,
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-bold truncate" style={{ color: P.text }}>
                    {m.title}
                  </p>
                  <p className="text-[10.5px] mt-0.5" style={{ color: P.textDim }}>
                    {isAi ? "Estudo guiado" : `${nodeCount} nodes · Manual`} · {fmtAgo(m.updated_at)}
                  </p>
                </div>
                <ExternalLink size={13} style={{ color: P.primary }} />
              </button>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <ArtifactAction onClick={() => openFocusTool({ tool: "mindmap" })} variant="primary">
          <Plus size={11} /> Novo · Upload PDF
        </ArtifactAction>
        <ArtifactAction onClick={() => openFocusTool({ tool: "mindmap" })}>
          <FileUp size={11} /> Abrir biblioteca
        </ArtifactAction>
      </div>
    </ArtifactShell>
  );
}
