import { Handle, Position } from "@xyflow/react";

export default function RootNode({ data }: { data: { label: string } }) {
  return (
    <div
      className="px-8 py-6 rounded-[24px] text-center min-w-[240px] max-w-[320px] relative"
      style={{
        background: "linear-gradient(135deg, #2a2219, #1e1a14)",
        border: "2px solid #c4a46a",
        boxShadow: "0 0 32px rgba(196,164,106,0.25), 0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      <Handle
        type="source"
        position={Position.Bottom}
        className="opacity-0 hover:opacity-100 transition-opacity"
        style={{ background: "#c4a46a", width: 8, height: 8, border: "2px solid #0f0d0a" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="opacity-0 hover:opacity-100 transition-opacity"
        style={{ background: "#c4a46a", width: 8, height: 8, border: "2px solid #0f0d0a" }}
      />
      <p
        className="font-display text-[22px] font-bold tracking-[1px] uppercase"
        style={{ color: "#ede4d3", lineHeight: 1.3 }}
      >
        {data.label}
      </p>
    </div>
  );
}
