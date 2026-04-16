import { Handle, Position } from "@xyflow/react";
import { BookOpen } from "lucide-react";
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
        {/* Header */}
        <div className="flex items-start gap-2 mb-2">
          <div
            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
            style={{ background: catColor }}
          />
          <p
            className="font-display text-[16px] font-semibold flex-1"
            style={{ color: "#ede4d3", lineHeight: 1.3 }}
          >
            {data.label}
          </p>
          {data.hasNote && (
            <BookOpen size={14} style={{ color: "#c4a46a", flexShrink: 0, marginTop: 2 }} />
          )}
        </div>

        {/* Summary */}
        {data.summary && (
          <p
            className="font-body text-[13px] italic mb-2"
            style={{
              color: "#c4b89e",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {data.summary}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-3">
          {(data.childCount ?? 0) > 0 && (
            <span
              className="text-[10.5px] font-sans font-medium tracking-[1px] uppercase"
              style={{ color: "#8a7d6a" }}
            >
              {data.childCount} sub-cards
            </span>
          )}
          {(data.verseCount ?? 0) > 0 && (
            <span
              className="text-[10.5px] font-sans font-medium tracking-[1px] uppercase"
              style={{ color: "#8a7d6a" }}
            >
              {data.verseCount} versículos
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
