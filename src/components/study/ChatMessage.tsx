import { useState } from "react";
import { Copy, Save, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Props {
  message: { role: "user" | "assistant"; content: string };
  onCopy: () => void;
  onSave: () => void;
  onRegenerate?: () => void;
}

export default function ChatMessage({ message, onCopy, onSave, onRegenerate }: Props) {
  const [showActions, setShowActions] = useState(false);
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        onClick={() => !isUser && setShowActions(!showActions)}
        className="relative transition-all"
        style={{
          maxWidth: isUser ? "85%" : "90%",
          background: isUser ? 'hsl(var(--primary) / 0.12)' : 'hsl(var(--card))',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          padding: isUser ? '12px 16px' : '16px',
          border: isUser ? 'none' : '1px solid hsl(var(--border))',
        }}
      >
        {isUser ? (
          <p className="text-[15px] font-body leading-relaxed text-foreground whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none
            prose-headings:font-body prose-headings:text-foreground prose-headings:text-base prose-headings:font-bold prose-headings:mt-4 prose-headings:mb-2
            prose-p:text-[15px] prose-p:leading-[1.7] prose-p:text-foreground prose-p:font-body prose-p:my-1
            prose-strong:text-primary prose-strong:font-bold
            prose-em:text-primary/80 prose-em:italic
            prose-li:text-[15px] prose-li:text-foreground prose-li:leading-relaxed prose-li:font-body
            prose-blockquote:border-l-[3px] prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:bg-primary/5 prose-blockquote:py-2 prose-blockquote:rounded-r-lg
            prose-ul:my-2 prose-ol:my-2
          ">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        {/* Actions for AI messages */}
        {!isUser && showActions && (
          <div className="flex items-center gap-1 mt-3 pt-2 border-t border-border/50 animate-fade-in">
            <button onClick={(e) => { e.stopPropagation(); onCopy(); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-ui text-muted-foreground hover:text-foreground transition-colors">
              <Copy size={12} /> Copiar
            </button>
            <button onClick={(e) => { e.stopPropagation(); onSave(); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-ui text-muted-foreground hover:text-foreground transition-colors">
              <Save size={12} /> Salvar
            </button>
            {onRegenerate && (
              <button onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-ui text-muted-foreground hover:text-foreground transition-colors">
                <RefreshCw size={12} /> Regenerar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
