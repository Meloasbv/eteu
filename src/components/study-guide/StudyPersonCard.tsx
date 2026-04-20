import type { KeyPerson } from "@/components/mindmap/types";

export default function StudyPersonCard({ person }: { person: KeyPerson }) {
  const initials = person.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="flex gap-3 p-3.5 rounded-xl my-2"
      style={{
        background: "hsl(var(--primary) / 0.04)",
        border: "1px solid hsl(var(--primary) / 0.12)",
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-display"
        style={{
          background: "hsl(var(--primary) / 0.1)",
          color: "hsl(var(--primary))",
        }}
      >
        {initials || "·"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[15px] font-semibold text-foreground leading-tight">
          {person.name}
        </p>
        <p className="text-[12px] italic text-primary/70 mb-1.5">{person.role}</p>
        {person.points && person.points.length > 0 && (
          <ul className="space-y-1 mt-1.5">
            {person.points.map((pt, i) => (
              <li
                key={i}
                className="text-[13px] font-body text-foreground/80 leading-snug pl-3 relative"
              >
                <span
                  className="absolute left-0 top-[7px] w-1 h-1 rounded-full"
                  style={{ background: "hsl(var(--primary) / 0.5)" }}
                />
                {pt}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
