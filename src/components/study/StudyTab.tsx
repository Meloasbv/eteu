import { useState, lazy, Suspense } from "react";
import { NotebookPen, BookOpen, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import NotebookList from "./NotebookList";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

const MindMapTab = lazy(() => import("@/components/mindmap/MindMapTab"));

type SubTab = "caderno" | "estudo";

export default function StudyTab({ userCodeId }: { userCodeId: string }) {
  const isMobile = useIsMobile();
  const [subTab, setSubTab] = useState<SubTab>("caderno");

  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        {/* Sub-tab bar */}
        <div className="flex gap-1 px-3 py-2 border-b border-border/30">
          <button
            onClick={() => setSubTab("caderno")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-ui transition-all ${
              subTab === "caderno"
                ? "bg-primary/10 text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <NotebookPen size={13} /> Caderno
          </button>
          <button
            onClick={() => setSubTab("estudo")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-ui transition-all ${
              subTab === "estudo"
                ? "bg-primary/10 text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen size={13} /> Estudo Guiado
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {subTab === "caderno" && <NotebookList userCodeId={userCodeId} />}
          {subTab === "estudo" && (
            <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" size={20} /></div>}>
              <MindMapTab userCodeId={userCodeId} />
            </Suspense>
          )}
        </div>
      </div>
    );
  }

  // Desktop: split resizable panels
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={50} minSize={30}>
        <div className="h-full overflow-y-auto">
          <NotebookList userCodeId={userCodeId} />
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50} minSize={30}>
        <div className="h-full overflow-y-auto">
          <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" size={20} /></div>}>
            <MindMapTab userCodeId={userCodeId} />
          </Suspense>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
