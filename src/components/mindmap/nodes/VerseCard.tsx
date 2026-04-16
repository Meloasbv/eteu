import { Handle, Position } from "@xyflow/react";
import { BookOpen } from "lucide-react";

export default function VerseCard({ data }: { data: { label: string } }) {
  return (
    <div
      className="rounded-[10px] transition-all hover:cursor-pointer relative inline-flex items-center gap-1.5"
      style={{
        background: "rgba(123,163,201,0.06)",
        border: "1px solid rgba(123,163,201,0.25)",
        padding: "10px 16px",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: "rgba(123,163,201,0.4)", width: 5, height: 5 }} />
      <Handle type="target" position={Position.Left} style={{ background: "rgba(123,163,201,0.4)", width: 5, height: 5 }} />

      <BookOpen size={14} style={{ color: "#7ba3c9", flexShrink: 0 }} />
      <p
        className="font-body text-[13px] italic whitespace-nowrap"
        style={{ color: "#7ba3c9" }}
      >
        {data.label}
      </p>
    </div>
  );
}
