import { useState } from "react";
import AssistantChat from "./AssistantChat";
import NotebookList from "./NotebookList";

export default function StudyTab({ userCodeId }: { userCodeId: string }) {
  const [section, setSection] = useState<"assistant" | "notebook">("assistant");

  return (
    <div className="flex flex-col h-full">
      {/* Toggle */}
      <div className="flex gap-1 mx-4 mt-3 p-1 rounded-2xl" style={{ background: 'hsl(var(--card))' }}>
        <button
          onClick={() => setSection("assistant")}
          className="flex-1 py-2.5 rounded-xl text-[11px] font-semibold tracking-[1.5px] uppercase font-ui transition-all"
          style={{
            background: section === "assistant" ? 'hsl(var(--primary))' : 'transparent',
            color: section === "assistant" ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
          }}
        >
          💬 Assistente
        </button>
        <button
          onClick={() => setSection("notebook")}
          className="flex-1 py-2.5 rounded-xl text-[11px] font-semibold tracking-[1.5px] uppercase font-ui transition-all"
          style={{
            background: section === "notebook" ? 'hsl(var(--primary))' : 'transparent',
            color: section === "notebook" ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
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
