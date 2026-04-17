import { Handle, Position } from "@xyflow/react";
import { Loader2 } from "lucide-react";

interface RootData {
  label: string;
  imageUrl?: string;
  imageLoading?: boolean;
}

export default function RootNode({ data }: { data: RootData }) {
  return (
    <div
      className="rounded-[24px] text-center min-w-[260px] max-w-[340px] relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #2a2219, #1e1a14)",
        border: "2px solid #c4a46a",
        boxShadow: "0 0 32px rgba(196,164,106,0.25), 0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      <Handle type="source" position={Position.Bottom}
        className="opacity-0 hover:opacity-100 transition-opacity"
        style={{ background: "#c4a46a", width: 8, height: 8, border: "2px solid #0f0d0a" }} />
      <Handle type="source" position={Position.Right}
        className="opacity-0 hover:opacity-100 transition-opacity"
        style={{ background: "#c4a46a", width: 8, height: 8, border: "2px solid #0f0d0a" }} />

      {(data.imageUrl || data.imageLoading) && (
        <div className="w-full h-[140px] relative" style={{ background: "#0f0d0a" }}>
          {data.imageUrl ? (
            <img src={data.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 size={18} className="animate-spin" style={{ color: "#c4a46a" }} />
            </div>
          )}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(180deg, transparent 50%, rgba(15,13,10,0.85) 100%)" }} />
        </div>
      )}

      <div className="px-8 py-6">
        <p className="font-display text-[22px] font-bold tracking-[1px] uppercase"
          style={{ color: "#ede4d3", lineHeight: 1.3 }}>
          {data.label}
        </p>
      </div>
    </div>
  );
}
