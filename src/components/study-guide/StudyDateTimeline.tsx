import type { KeyDate } from "@/components/mindmap/types";

export default function StudyDateTimeline({ dates }: { dates: KeyDate[] }) {
  if (!dates || dates.length === 0) return null;
  return (
    <div className="my-4 -mx-1">
      <div
        className="flex items-stretch overflow-x-auto pb-2 px-1 gap-0 scrollbar-thin"
        style={{ scrollbarWidth: "thin" }}
      >
        {dates.map((d, i) => (
          <div key={i} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center min-w-[88px] px-1">
              <span className="text-[11px] font-bold font-ui text-primary tracking-wide">
                {d.date}
              </span>
              <div
                className="w-2.5 h-2.5 rounded-full my-1.5"
                style={{ background: "hsl(var(--primary))" }}
              />
              <span className="text-[10px] text-muted-foreground/80 text-center leading-tight font-body line-clamp-3">
                {d.event}
              </span>
            </div>
            {i < dates.length - 1 && (
              <div
                className="h-0.5 w-6 self-center mt-[-22px]"
                style={{ background: "hsl(var(--primary) / 0.25)" }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
