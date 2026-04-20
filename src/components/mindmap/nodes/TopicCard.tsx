import { Handle, Position } from "@xyflow/react";
import { BookOpen, Loader2, Sparkles } from "lucide-react";
import { getCategoryColor } from "../types";

interface TopicCardData {
  label: string;
  summary?: string;
  category?: string;
  hasNote?: boolean;
  childCount?: number;
  verseCount?: number;
  nodeId?: string;
  selected?: boolean;
  isKey?: boolean;
  pageRef?: number;
  sourceSlides?: number[];
  imageUrl?: string;
  imageLoading?: boolean;
}

function formatRange(slides?: number[], page?: number): string {
  if (slides && slides.length > 0) {
    const sorted = [...slides].sort((a, b) => a - b);
    const min = sorted[0], max = sorted[sorted.length - 1];
    return min === max ? `Sl. ${min}` : `Sl. ${min}-${max}`;
  }
  if (page) return `Sl. ${page}`;
  return "";
}

export default function TopicCard({ data }: { data: TopicCardData }) {
  const catColor = getCategoryColor(data.category);

  return (
    <div
      className="w-[280px] rounded-[14px] transition-all hover:-translate-y-[1px] cursor-pointer relative"
      style={{
        background: "#1e1a14",
        border: data.selected ? `3px solid #c4a46a` : `1px solid rgba(196,164,106,0.18)`,
        borderLeft: `4px solid ${catColor}`,
        boxShadow: data.selected
          ? "0 0 20px rgba(196,164,106,0.15)"
          : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: catColor, width: 6, height: 6, opacity: 0.5 }} />
      <Handle type="target" position={Position.Left} style={{ background: catColor, width: 6, height: 6, opacity: 0.5 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: catColor, width: 6, height: 6, opacity: 0.5 }} />
      <Handle type="source" position={Position.Right} style={{ background: catColor, width: 6, height: 6, opacity: 0.5 }} />

      <div className="p-4 pb-3">
        {/* Image (key cards only) */}
        {(data.imageUrl || data.imageLoading) && (
          <div className="w-full h-[120px] rounded-[10px] overflow-hidden mb-3 relative"
            style={{ background: "#0f0d0a", border: "1px solid rgba(196,164,106,0.15)" }}>
            {data.imageUrl ? (
              <img src={data.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 size={16} className="animate-spin" style={{ color: "#c4a46a" }} />
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-2 mb-2">
          <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: catColor }} />
          <p className="font-display text-[16px] font-semibold flex-1" style={{ color: "#ede4d3", lineHeight: 1.3 }}>
            {data.label}
          </p>
          {data.hasNote && <BookOpen size={14} style={{ color: "#c4a46a", flexShrink: 0, marginTop: 2 }} />}
        </div>

        {/* Summary */}
        {data.summary && (
          <p className="font-body text-[13px] italic mb-2"
            style={{ color: "#c4b89e", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {data.summary}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {formatRange(data.sourceSlides, data.pageRef) && (
            <span className="text-[10.5px] font-sans font-medium tracking-[0.5px]" style={{ color: "#c4a46a" }}>
              {formatRange(data.sourceSlides, data.pageRef)}
            </span>
          )}
          {(data.childCount ?? 0) > 0 && (
            <>
              <span className="text-[10px]" style={{ color: "#5c5347" }}>·</span>
              <span className="text-[10.5px] font-sans font-medium tracking-[0.5px]" style={{ color: "#8a7d6a" }}>
                {data.childCount} pts
              </span>
            </>
          )}
          {(data.verseCount ?? 0) > 0 && (
            <>
              <span className="text-[10px]" style={{ color: "#5c5347" }}>·</span>
              <span className="text-[10.5px] font-sans font-medium tracking-[0.5px]" style={{ color: "#8a7d6a" }}>
                {data.verseCount} vers
              </span>
            </>
          )}
          {data.hasNote && (
            <span
              className="ml-auto inline-flex items-center gap-1 text-[10px] font-sans font-semibold tracking-[0.5px] px-1.5 py-0.5 rounded"
              style={{
                background: "rgba(196,164,106,0.08)",
                color: "#c4a46a",
                border: "1px solid rgba(196,164,106,0.18)",
              }}
            >
              <Sparkles size={9} /> Aprofundar
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
