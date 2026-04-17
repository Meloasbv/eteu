import { Handle, Position } from "@xyflow/react";

interface HighlightCardData {
  label: string;
  pageRef?: number;
}

export default function HighlightCard({ data }: { data: HighlightCardData }) {
  return (
    <div
      className="w-[220px] rounded-[12px] transition-all hover:cursor-default relative"
      style={{
        background: "rgba(196,164,106,0.04)",
        border: "1px dashed rgba(196,164,106,0.25)",
        padding: "14px 18px",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: "rgba(196,164,106,0.3)", width: 5, height: 5 }} />
      <Handle type="target" position={Position.Left} style={{ background: "rgba(196,164,106,0.3)", width: 5, height: 5 }} />

      {/* Opening quote */}
      <span
        className="absolute top-1 left-3 font-body text-[28px] select-none pointer-events-none"
        style={{ color: "rgba(196,164,106,0.2)", lineHeight: 1 }}
      >
        "
      </span>

      <p
        className="font-body text-[14px] italic font-medium"
        style={{ color: "#d4b87a", lineHeight: 1.5 }}
      >
        {data.label}
      </p>

      {/* Closing quote */}
      <span
        className="absolute bottom-0 right-3 font-body text-[28px] select-none pointer-events-none"
        style={{ color: "rgba(196,164,106,0.2)", lineHeight: 1 }}
      >
        "
      </span>

      {data.pageRef && (
        <div className="mt-2 pt-2 flex justify-end" style={{ borderTop: "1px dashed rgba(196,164,106,0.12)" }}>
          <span className="text-[9.5px] font-sans font-medium tracking-[1px] uppercase" style={{ color: "#c4a46a" }}>
            slide {data.pageRef}
          </span>
        </div>
      )}
    </div>
  );
}
