import { useState, useCallback, useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import ImageExt from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  X, Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading2, Heading3, List, ListOrdered, Quote, ImagePlus,
  Sparkles, BookOpen, Loader2, MessageSquare, HelpCircle, FileText, Languages,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MindMapCardEditorProps {
  nodeId: string;
  title: string;
  content: string; // HTML
  onSave: (nodeId: string, title: string, content: string) => void;
  onClose: () => void;
}

type AIAction = "comment" | "context" | "meaning" | "question" | "summary";

const AI_ACTIONS: { action: AIAction; icon: React.ElementType; label: string }[] = [
  { action: "comment", icon: MessageSquare, label: "Comentário" },
  { action: "context", icon: BookOpen, label: "Contexto bíblico" },
  { action: "meaning", icon: Languages, label: "Significado original" },
  { action: "question", icon: HelpCircle, label: "Pergunta de reflexão" },
  { action: "summary", icon: FileText, label: "Resumir" },
];

export default function MindMapCardEditor({ nodeId, title: initialTitle, content: initialContent, onSave, onClose }: MindMapCardEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [verseQuery, setVerseQuery] = useState("");
  const [verseLoading, setVerseLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showVerseInput, setShowVerseInput] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      ImageExt.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: "rounded-lg border border-border/30 max-w-full h-auto my-2",
          loading: "lazy",
        },
      }),
      Placeholder.configure({ placeholder: "Escreva suas anotações..." }),
    ],
    content: initialContent || "",
    editorProps: {
      attributes: {
        class: "tiptap-editor-content",
        style: "min-height: 200px; outline: none; font-family: Georgia, 'Crimson Text', serif; font-size: 14px; line-height: 1.7; padding: 0;",
      },
    },
  });

  useEffect(() => { titleRef.current?.focus(); }, []);

  // Save on close
  const handleSave = useCallback(() => {
    onSave(nodeId, title || "Nota", editor?.getHTML() || "");
    onClose();
  }, [nodeId, title, editor, onSave, onClose]);

  // Fetch verse
  const fetchVerse = useCallback(async () => {
    if (!verseQuery.trim() || !editor) return;
    setVerseLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verse-ai", {
        body: { reference: verseQuery.trim() },
      });
      if (error) throw error;
      const text = data?.text || data?.result || "Versículo não encontrado.";
      editor.chain().focus().insertContent(
        `<blockquote><p><strong>📖 ${verseQuery.trim()}</strong></p><p><em>${text}</em></p></blockquote>`
      ).run();
      setVerseQuery("");
      setShowVerseInput(false);
    } catch (e: any) {
      editor.chain().focus().insertContent(`<p><em>Erro ao buscar versículo: ${e.message}</em></p>`).run();
    } finally {
      setVerseLoading(false);
    }
  }, [verseQuery, editor]);

  // AI action
  const handleAI = useCallback(async (action: AIAction) => {
    if (!editor) return;
    const selectedText = editor.state.selection.empty
      ? editor.getText().slice(0, 500)
      : editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, " ");
    if (!selectedText.trim()) return;

    setAiLoading(true);
    setShowAI(false);
    try {
      const { data, error } = await supabase.functions.invoke("selection-ai", {
        body: { action, selectedText },
      });
      if (error) throw error;
      const result = data?.result || "Sem resultado.";
      const label = AI_ACTIONS.find(a => a.action === action)?.label || "IA";
      editor.chain().focus().insertContent(
        `<blockquote><p><strong>[${label}]</strong></p><p><em>${result.replace(/\n/g, "<br/>")}</em></p></blockquote>`
      ).run();
    } catch (e: any) {
      editor.chain().focus().insertContent(`<p><em>Erro IA: ${e.message}</em></p>`).run();
    } finally {
      setAiLoading(false);
    }
  }, [editor]);

  // Insert image
  const insertImage = useCallback(() => {
    if (!editor || !imageUrl.trim()) return;
    editor.chain().focus().setImage({ src: imageUrl.trim(), alt: "Imagem" }).run();
    setImageUrl("");
    setShowImageInput(false);
  }, [editor, imageUrl]);

  // Handle paste images
  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    if (!editor) return;
    const files = Array.from(event.clipboardData?.items || [])
      .filter(i => i.type.startsWith("image/"))
      .map(i => i.getAsFile())
      .filter((f): f is File => !!f);
    if (!files.length) return;
    event.preventDefault();
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          editor.chain().focus().setImage({ src: reader.result, alt: file.name }).run();
        }
      };
      reader.readAsDataURL(file);
    });
  }, [editor]);

  if (!editor) return null;

  const BtnTool = ({ active, onClick, children, title: t }: {
    active?: boolean; onClick: () => void; children: React.ReactNode; title: string;
  }) => (
    <button type="button" onClick={onClick} title={t}
      className={`w-7 h-7 rounded-md flex items-center justify-center transition-all
        ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"}`}>
      {children}
    </button>
  );

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-[640px] max-h-[85vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "hsl(var(--border) / 0.3)" }}>
          <input ref={titleRef} value={title} onChange={e => setTitle(e.target.value)}
            className="bg-transparent text-lg font-display font-semibold text-foreground flex-1 outline-none"
            placeholder="Título da nota" />
          <div className="flex items-center gap-1 ml-3">
            <button onClick={handleSave}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/15 text-primary hover:bg-primary/25 transition-colors">
              Salvar
            </button>
            <button onClick={handleSave} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-4 py-2 border-b overflow-x-auto no-scrollbar" style={{ borderColor: "hsl(var(--border) / 0.2)" }}>
          <BtnTool active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito">
            <Bold size={14} />
          </BtnTool>
          <BtnTool active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Itálico">
            <Italic size={14} />
          </BtnTool>
          <BtnTool active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sublinhado">
            <UnderlineIcon size={14} />
          </BtnTool>
          <BtnTool active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Tachado">
            <Strikethrough size={14} />
          </BtnTool>
          <div className="w-px h-5 mx-1" style={{ background: "hsl(var(--border) / 0.3)" }} />
          <BtnTool active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Título">
            <Heading2 size={14} />
          </BtnTool>
          <BtnTool active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Subtítulo">
            <Heading3 size={14} />
          </BtnTool>
          <BtnTool active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista">
            <List size={14} />
          </BtnTool>
          <BtnTool active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
            <ListOrdered size={14} />
          </BtnTool>
          <BtnTool active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Citação">
            <Quote size={14} />
          </BtnTool>
          <div className="w-px h-5 mx-1" style={{ background: "hsl(var(--border) / 0.3)" }} />
          <BtnTool active={showImageInput} onClick={() => { setShowImageInput(!showImageInput); setShowVerseInput(false); setShowAI(false); }} title="Inserir imagem">
            <ImagePlus size={14} />
          </BtnTool>
          <BtnTool active={showVerseInput} onClick={() => { setShowVerseInput(!showVerseInput); setShowImageInput(false); setShowAI(false); }} title="Buscar versículo">
            <BookOpen size={14} />
          </BtnTool>
          <button onClick={() => { setShowAI(!showAI); setShowVerseInput(false); setShowImageInput(false); }}
            className={`flex items-center gap-1 px-2 h-7 rounded-md text-xs font-semibold transition-all
              ${showAI || aiLoading ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"}`}>
            {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            IA
          </button>
        </div>

        {/* Sub-toolbars */}
        {showVerseInput && (
          <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: "hsl(var(--border) / 0.2)", background: "hsl(var(--background))" }}>
            <BookOpen size={14} className="text-primary shrink-0" />
            <input value={verseQuery} onChange={e => setVerseQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") fetchVerse(); }}
              className="flex-1 bg-transparent text-sm text-foreground outline-none" placeholder="Ex: João 3:16, Sl 23..." />
            <button onClick={fetchVerse} disabled={verseLoading}
              className="px-3 py-1 rounded-lg text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors disabled:opacity-50">
              {verseLoading ? <Loader2 size={12} className="animate-spin" /> : "Buscar"}
            </button>
          </div>
        )}
        {showImageInput && (
          <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: "hsl(var(--border) / 0.2)", background: "hsl(var(--background))" }}>
            <ImagePlus size={14} className="text-primary shrink-0" />
            <input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") insertImage(); }}
              className="flex-1 bg-transparent text-sm text-foreground outline-none" placeholder="Cole a URL da imagem..." />
            <button onClick={insertImage}
              className="px-3 py-1 rounded-lg text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors">
              Inserir
            </button>
            <span className="text-[10px] text-muted-foreground/50">ou cole (Ctrl+V) uma imagem</span>
          </div>
        )}
        {showAI && (
          <div className="flex items-center gap-1.5 px-4 py-2 border-b overflow-x-auto no-scrollbar" style={{ borderColor: "hsl(var(--border) / 0.2)", background: "hsl(var(--background))" }}>
            <span className="text-[10px] text-muted-foreground/50 mr-1 shrink-0">✨ Selecione texto ou use o conteúdo:</span>
            {AI_ACTIONS.map(a => (
              <button key={a.action} onClick={() => handleAI(a.action)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0">
                <a.icon size={12} />
                {a.label}
              </button>
            ))}
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 overflow-y-auto px-5 py-4" onPaste={handlePaste}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
