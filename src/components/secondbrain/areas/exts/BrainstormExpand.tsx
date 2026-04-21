import { AREA_META } from "@/lib/brainAreas";

interface Props {
  expansion: {
    next_steps?: string[];
    related_to?: string[];
    provocation?: string;
  };
}

export default function BrainstormExpand({ expansion }: Props) {
  const m = AREA_META.brainstorm;
  const hasSteps = Array.isArray(expansion.next_steps) && expansion.next_steps.length > 0;
  const hasProv = !!expansion.provocation;

  if (!hasSteps && !hasProv) return null;

  return (
    <section
      className="rounded-lg p-3 mt-1"
      style={{ background: `${m.accent}0e`, border: `1px solid ${m.border}` }}
    >
      <p className="text-[10px] uppercase tracking-wider mb-2 font-bold" style={{ color: m.accent }}>
        ⚡ Expansão
      </p>
      {hasSteps && (
        <>
          <p className="text-[11px] mb-1.5" style={{ color: m.muted }}>Próximos passos sugeridos:</p>
          <ol className="space-y-1 mb-2">
            {expansion.next_steps!.map((s, i) => (
              <li key={i} className="text-[12.5px] flex gap-2" style={{ color: m.text }}>
                <span style={{ color: m.accent }}>{i + 1}.</span> {s}
              </li>
            ))}
          </ol>
        </>
      )}
      {hasProv && (
        <p className="text-[12px] italic mt-2" style={{ color: m.accent }}>
          💭 {expansion.provocation}
        </p>
      )}
    </section>
  );
}
