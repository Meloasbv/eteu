import { Loader2 } from "lucide-react";
import { FOCUS_PALETTE as P } from "./types";

interface Props {
  data: { message: string };
}

export default function LoadingArtifact({ data }: Props) {
  return (
    <div
      className="rounded-2xl px-4 sm:px-5 py-4 focus-artifact-enter"
      style={{
        background: "rgba(17, 22, 29, 0.5)",
        border: `1px dashed ${P.primary}33`,
        backdropFilter: "blur(6px)",
      }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <Loader2 size={13} className="animate-spin" style={{ color: P.primary }} />
        <p className="text-[11px] font-bold uppercase tracking-[2px]" style={{ color: P.primary }}>
          {data.message}
        </p>
      </div>
      <div className="space-y-2">
        <div
          className="h-3 rounded animate-pulse"
          style={{ background: `${P.primary}10`, width: "80%" }}
        />
        <div
          className="h-3 rounded animate-pulse"
          style={{ background: `${P.primary}10`, width: "55%", animationDelay: "150ms" }}
        />
        <div
          className="h-3 rounded animate-pulse"
          style={{ background: `${P.primary}10`, width: "70%", animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
