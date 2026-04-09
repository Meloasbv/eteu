import { useState } from "react";
import { Copy, Save, RefreshCw, BookOpen } from "lucide-react";
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
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}>
      {/* Assistant avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1 mr-2.5">
          <BookOpen size={14} className="text-primary" />
        </div>
      )}

      <div
        onClick={() => !isUser && setShowActions(!showActions)}
        className="relative transition-all"
        style={{
          maxWidth: isUser ? "80%" : "85%",
          background: isUser ? 'hsl(var(--primary) / 0.10)' : 'hsl(var(--card))',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          padding: isUser ? '12px 16px' : '20px',
          border: isUser ? '1px solid hsl(var(--primary) / 0.15)' : '1px solid hsl(var(--border))',
        }}
      >
        {isUser ? (
          <p className="text-[15px] font-body leading-relaxed text-foreground whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none
            prose-headings:font-serif prose-headings:text-foreground
            prose-h2:text-[17px] prose-h2:font-bold prose-h2:mt-6 prose-h2:mb-3 prose-h2:pb-1.5 prose-h2:border-b prose-h2:border-border/40
            prose-h3:text-[15px] prose-h3:font-bold prose-h3:mt-5 prose-h3:mb-2
            prose-p:text-[15px] prose-p:leading-[1.85] prose-p:text-foreground prose-p:font-body prose-p:my-2.5
            prose-strong:text-primary prose-strong:font-bold
            prose-em:text-primary/80 prose-em:italic
            prose-li:text-[15px] prose-li:text-foreground prose-li:leading-[1.8] prose-li:font-body prose-li:my-1
            prose-blockquote:border-l-[3px] prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:bg-primary/5 prose-blockquote:py-3 prose-blockquote:px-4 prose-blockquote:rounded-r-xl prose-blockquote:my-4
            prose-ul:my-3 prose-ol:my-3 prose-ul:space-y-1 prose-ol:space-y-1
            prose-code:text-primary prose-code:bg-primary/8 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[13px]
            prose-hr:border-border/30 prose-hr:my-5
          ">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        {/* Actions for AI messages */}
        {!isUser && showActions && (
          <div className="flex items-center gap-1 mt-4 pt-3 border-t border-border/40 animate-fade-in">
            <button onClick={(e) => { e.stopPropagation(); onCopy(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-ui text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all">
              <Copy size={12} /> Copiar
            </button>
            <button onClick={(e) => { e.stopPropagation(); onSave(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-ui text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all">
              <Save size={12} /> Salvar
            </button>
            {onRegenerate && (
              <button onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-ui text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all">
                <RefreshCw size={12} /> Regenerar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
