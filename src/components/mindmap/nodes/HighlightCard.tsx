import { Handle, Position } from "@xyflow/react";

export default function HighlightCard({ data }: { data: { label: string } }) {
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
    </div>
  );
}
