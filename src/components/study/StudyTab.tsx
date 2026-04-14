import { useState, lazy, Suspense } from "react";
import NotebookList from "./NotebookList";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2, Columns2 } from "lucide-react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

const MindMapTab = lazy(() => import("@/components/mindmap/MindMapTab"));

type Section = "mindmap" | "notebook";

export default function StudyTab({ userCodeId }: { userCodeId: string }) {
  const [section, setSection] = useState<Section>("notebook");
  const [splitMode, setSplitMode] = useState(false);
  const isMobile = useIsMobile();

  const fallback = (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="animate-spin text-primary" size={24} />
    </div>
  );

  const mindMapContent = (
    <Suspense fallback={fallback}>
      <MindMapTab userCodeId={userCodeId} />
    </Suspense>
  );

  const notebookContent = <NotebookList userCodeId={userCodeId} />;

  // Split mode (desktop only)
  if (splitMode && !isMobile) {
    return (
      <div className="flex flex-col h-full">
        {/* Toggle bar */}
        <div className="flex items-center gap-2 mx-4 mt-3">
          <div className="flex-1 flex gap-0.5 p-1 rounded-xl"
            style={{ background: 'hsl(var(--background-secondary))', border: '1px solid hsl(var(--border) / 0.5)' }}>
            <span className="flex-1 py-2.5 rounded-[10px] text-[11px] font-semibold tracking-[2px] uppercase font-ui text-center"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.08))',
                border: '1px solid hsl(var(--primary) / 0.3)',
                color: 'hsl(var(--primary))',
              }}>
              📓 Caderno + 🧠 Mapa
            </span>
          </div>
          <button
            onClick={() => setSplitMode(false)}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: 'hsl(var(--primary) / 0.15)',
              border: '1px solid hsl(var(--primary) / 0.3)',
              color: 'hsl(var(--primary))',
            }}
            title="Sair do modo dividido"
          >
            <Columns2 size={16} />
          </button>
        </div>

        {/* Split panels */}
        <div className="flex-1 min-h-0 mt-2">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={50} minSize={25}>
              <div className="h-full overflow-y-auto">{notebookContent}</div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={25}>
              <div className="h-full overflow-hidden">{mindMapContent}</div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    );
  }

  // Single mode
  return (
    <div className="flex flex-col h-full">
      {/* Toggle */}
      <div className="flex items-center gap-2 mx-4 mt-3">
        <div className="flex-1 flex gap-0.5 p-1 rounded-xl"
          style={{ background: 'hsl(var(--background-secondary))', border: '1px solid hsl(var(--border) / 0.5)' }}>
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
          <button
            onClick={() => setSection("mindmap")}
            className="flex-1 py-2.5 rounded-[10px] text-[11px] font-semibold tracking-[2px] uppercase font-ui transition-all"
            style={{
              background: section === "mindmap"
                ? 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.08))'
                : 'transparent',
              border: section === "mindmap" ? '1px solid hsl(var(--primary) / 0.3)' : '1px solid transparent',
              color: section === "mindmap" ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.5)',
              boxShadow: section === "mindmap" ? '0 0 12px hsl(var(--primary) / 0.08)' : 'none',
            }}
          >
            🧠 Mapa Mental
          </button>
        </div>
        {!isMobile && (
          <button
            onClick={() => setSplitMode(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: 'hsl(var(--muted) / 0.5)',
              border: '1px solid hsl(var(--border) / 0.5)',
              color: 'hsl(var(--muted-foreground))',
            }}
            title="Dividir tela"
          >
            <Columns2 size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {section === "notebook" ? notebookContent : mindMapContent}
      </div>
    </div>
  );
}
