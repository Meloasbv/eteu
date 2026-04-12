import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, MoreVertical, Check, Send, ImagePlus } from "lucide-react";
import RichTextEditor, { insertVerseIntoEditor } from "@/components/RichTextEditor";
import BibleContextPanel from "@/components/BibleContextPanel";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import type { StudyNote } from "./NotebookList";


const CATEGORIES = ["Exegese", "Teologia", "Sermões", "Devocionais", "Aulas", "Pessoal"];

interface Props {
  note: StudyNote;
  onUpdate: (note: StudyNote) => void;
  onBack: () => void;
  onDelete: () => void;
}

interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function NoteEditor({ note, onUpdate, onBack, onDelete }: Props) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [category, setCategory] = useState(note.category);
  const [showMenu, setShowMenu] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Bible context panel
  const [bibleRef, setBibleRef] = useState("");
  const [bibleOpen, setBibleOpen] = useState(false);

  // AI Chat
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Image upload
  const imageInputRef = useRef<HTMLInputElement>(null);

  const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;

  const save = useCallback(() => {
    onUpdate({
      ...note,
      title,
      content,
      category,
      wordCount,
      updatedAt: new Date().toISOString(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [note, title, content, category, wordCount, onUpdate]);

  // Autosave with debounce
  useEffect(() => {
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(save, 2000);
    return () => clearTimeout(saveTimeout.current);
  }, [title, content, category]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const handleBibleRefClick = useCallback((ref: string) => {
    setBibleRef(ref);
    setBibleOpen(true);
  }, []);

  const handleInsertVerse = useCallback((ref: string, text: string) => {
    const verseHtml = `<blockquote><p><strong>[${ref}]</strong></p><p><em>${text}</em></p></blockquote>`;
    setContent(prev => prev + verseHtml);
  }, []);

  const handleShare = async () => {
    const text = content.replace(/<[^>]*>/g, '');
    if (navigator.share) {
      try { await navigator.share({ title, text }); } catch {}
    } else {
      navigator.clipboard.writeText(text);
    }
    setShowMenu(false);
  };

  // AI Chat - send message
  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const newMessages: AIChatMessage[] = [...chatMessages, { role: "user", content: userMsg }];
    setChatMessages(newMessages);
    setChatLoading(true);

    try {
      const plainContent = content.replace(/<[^>]*>/g, '').slice(0, 3000);
      const systemContext = `O usuário está editando uma nota com o título "${title}" e categoria "${category}". O conteúdo atual da nota é:\n\n${plainContent}\n\nVocê pode ajudar a editar, expandir, corrigir ou adicionar conteúdo à nota. Quando sugerir texto para adicionar, use formatação markdown. Seja direto e objetivo.`;

      const { data, error } = await supabase.functions.invoke("study-chat", {
        body: {
          messages: [
            { role: "system", content: systemContext },
            ...newMessages.map(m => ({ role: m.role, content: m.content })),
          ],
        },
      });

      if (error || data?.error) {
        setChatMessages(prev => [...prev, { role: "assistant", content: "Erro ao processar. Tente novamente." }]);
      } else {
        setChatMessages(prev => [...prev, { role: "assistant", content: data.result || "Sem resposta." }]);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Erro de conexão." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Apply AI suggestion to note
  const applyToNote = (text: string) => {
    // Convert markdown-ish text to basic HTML and append
    const html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
      .replace(/\n/g, '<br/>');
    setContent(prev => prev + '<br/>' + html);
  };

  // Image upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        const src = typeof reader.result === "string" ? reader.result : null;
        if (!src) return;
        const imgHtml = `<img src="${src}" alt="${file.name}" class="rounded-xl border border-border shadow-elegant max-w-full h-auto my-3" loading="lazy" />`;
        setContent(prev => prev + imgHtml);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <button onClick={() => { save(); onBack(); }} className="w-10 h-10 flex items-center justify-center text-muted-foreground">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-[11px] text-success font-ui animate-fade-in">
              <Check size={12} /> Salvo
            </span>
          )}
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="w-10 h-10 flex items-center justify-center text-muted-foreground">
              <MoreVertical size={18} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-xl shadow-lg z-30 py-1 animate-fade-in"
                style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                <button onClick={handleShare} className="w-full text-left px-4 py-2.5 text-sm font-ui text-foreground hover:bg-accent/10">📤 Compartilhar</button>
                <button onClick={() => { navigator.clipboard.writeText(content.replace(/<[^>]*>/g, '')); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-ui text-foreground hover:bg-accent/10">📋 Copiar tudo</button>
                <button onClick={() => { onDelete(); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-ui text-destructive hover:bg-destructive/10">🗑️ Excluir</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Title input */}
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Título do Estudo"
        className="mx-4 mt-3 text-xl font-body font-bold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
      />

      {/* Category selector */}
      <div className="flex gap-2 px-4 mt-2 overflow-x-auto no-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="px-3 py-1 rounded-xl text-[10px] font-ui font-semibold uppercase tracking-wider shrink-0 transition-all"
            style={{
              background: category === cat ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.08)',
              color: category === cat ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Editor + Image button row */}
      <div className="flex items-center gap-2 px-4 mt-2">
        <button
          onClick={() => imageInputRef.current?.click()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-ui font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all border border-border/50"
        >
          <ImagePlus size={14} /> Imagem
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
        />
        <button
          onClick={() => setShowChat(!showChat)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-ui font-semibold transition-all border border-border/50"
          style={{
            color: showChat ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
            background: showChat ? 'hsl(var(--primary) / 0.1)' : 'transparent',
          }}
        >
          ✨ IA Chat
        </button>
        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground font-ui">{wordCount} palavras</span>
      </div>

      {/* Editor */}
      <div className={`${showChat ? 'flex-[2]' : 'flex-1'} mt-2 overflow-hidden min-h-0`}>
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="Comece a escrever seu estudo…"
          minHeight={showChat ? "200px" : "calc(100dvh - 320px)"}
          onBibleRefClick={handleBibleRefClick}
        />
      </div>

      {/* AI Chat Panel */}
      {showChat && (
        <div className="flex-1 min-h-[200px] max-h-[45vh] flex flex-col border-t border-border/50" style={{ background: 'hsl(var(--background))' }}>
          {/* Chat header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
            <span className="text-[11px] font-ui font-semibold uppercase tracking-wider text-primary">✨ Assistente da Nota</span>
            <button onClick={() => setShowChat(false)} className="text-[11px] text-muted-foreground hover:text-foreground">✕</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center py-6">
                <p className="text-[13px] text-muted-foreground italic">
                  Peça para a IA editar, expandir ou adicionar conteúdo à sua nota.
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                  {["Corrija o texto", "Expanda o último parágrafo", "Adicione uma conclusão", "Resuma a nota"].map(s => (
                    <button
                      key={s}
                      onClick={() => { setChatInput(s); }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-ui text-muted-foreground hover:text-primary transition-all"
                      style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-[16px_16px_4px_16px]"
                      : "rounded-[16px_16px_16px_4px]"
                  }`}
                  style={{
                    background: msg.role === "user"
                      ? 'hsl(var(--primary) / 0.12)'
                      : 'hsl(var(--card))',
                    border: `1px solid ${msg.role === "user" ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--border))'}`,
                    color: 'hsl(var(--foreground))',
                  }}
                >
                  {msg.role === "assistant" ? (
                    <div className="space-y-1">
                      <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_h2]:text-[15px] [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-[14px] [&_h3]:font-semibold [&_ul]:my-1 [&_li]:my-0.5 [&_strong]:text-primary [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      <button
                        onClick={() => applyToNote(msg.content)}
                        className="mt-1.5 text-[10px] font-ui font-semibold text-primary hover:underline"
                      >
                        📝 Aplicar na nota
                      </button>
                    </div>
                  ) : (
                    <span>{msg.content}</span>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl" style={{ background: 'hsl(var(--card))' }}>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-border/30">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
              placeholder="Peça para editar a nota..."
              className="flex-1 px-3 py-2 rounded-xl text-[13px] font-ui bg-transparent outline-none placeholder:text-muted-foreground/50"
              style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            />
            <button
              onClick={sendChatMessage}
              disabled={!chatInput.trim() || chatLoading}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
              style={{ background: 'hsl(var(--primary))' }}
            >
              <Send size={16} className="text-primary-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Bible Context Panel */}
      <BibleContextPanel
        open={bibleOpen}
        reference={bibleRef}
        onClose={() => setBibleOpen(false)}
        onInsertVerse={handleInsertVerse}
      />
    </div>
  );
}
