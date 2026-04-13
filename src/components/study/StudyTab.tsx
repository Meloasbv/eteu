import { useState } from "react";
import AssistantChat from "./AssistantChat";
import NotebookList from "./NotebookList";

export default function StudyTab({ userCodeId }: { userCodeId: string }) {
  const [section, setSection] = useState<"assistant" | "notebook">("assistant");

  return (
    <div className="flex flex-col h-full">
      {/* Toggle */}
      <div className="flex gap-0.5 mx-4 mt-3 p-1 rounded-xl"
        style={{ background: 'hsl(var(--background-secondary))', border: '1px solid hsl(var(--border) / 0.5)' }}>
        <button
          onClick={() => setSection("assistant")}
          className="flex-1 py-2.5 rounded-[10px] text-[11px] font-semibold tracking-[2px] uppercase font-ui transition-all"
          style={{
            background: section === "assistant"
              ? 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.08))'
              : 'transparent',
            border: section === "assistant" ? '1px solid hsl(var(--primary) / 0.3)' : '1px solid transparent',
            color: section === "assistant" ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.5)',
            boxShadow: section === "assistant" ? '0 0 12px hsl(var(--primary) / 0.08)' : 'none',
          }}
        >
          💬 Assistente
        </button>
        <button
          onClick={() => setSection("notebook")}
          className="flex-1 py-2.5 rounded-[10px] text-[11px] font-semibold tracking-[2px] uppercase font-ui transition-all"
          style={{
            background: section === "notebook"
              ? 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.08))'
              : 'transparent',
            border: section === "notebook" ? '1px solid hsl(var(--primary) / 0.3)' : '1px solid transparent',
            color: section === "notebook" ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.5)',
            boxShadow: section === "notebook" ? '0 0 12px hsl(var(--primary) / 0.08)' : 'none',
          }}
        >
          📓 Caderno
        </button>
      </div>

      {section === "assistant" ? (
        <AssistantChat userCodeId={userCodeId} />
      ) : (
        <NotebookList userCodeId={userCodeId} />
      )}
    </div>
  );
}
