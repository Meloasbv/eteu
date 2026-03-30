import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { useEffect, useCallback, useRef } from "react";
import { BibleRefHighlight, setupBibleRefListeners } from "@/lib/bibleRefExtension";

// ── Highlight colors config ──
const HIGHLIGHT_COLORS = [
  { name: "gold", color: "rgba(196,164,106,0.3)", label: "🟡" },
  { name: "green", color: "rgba(106,156,90,0.3)", label: "🟢" },
  { name: "red", color: "rgba(180,100,100,0.3)", label: "🔴" },
  { name: "blue", color: "rgba(100,140,200,0.3)", label: "🔵" },
];

interface RichTextEditorProps {
  content: string; // HTML string
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  onVerseClick?: () => void;
  onRecordClick?: () => void;
  onBibleRefClick?: (ref: string) => void;
  isRecording?: boolean;
  disabled?: boolean;
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Comece a escrever...",
  minHeight = "calc(100dvh - 300px)",
  onVerseClick,
  onRecordClick,
  onBibleRefClick,
  isRecording = false,
  disabled = false,
}: RichTextEditorProps) {
  const isExternalUpdate = useRef(false);
  const onBibleRefClickRef = useRef(onBibleRefClick);
  onBibleRefClickRef.current = onBibleRefClick;

  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: "rounded-xl border border-border shadow-elegant max-w-full h-auto my-3",
          loading: "lazy",
        },
      }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
      BibleRefHighlight,
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      if (!isExternalUpdate.current) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor-content",
        style: `min-height: ${minHeight}; outline: none; font-family: Georgia, 'Crimson Text', serif; font-size: 15px; line-height: 1.75; padding: 0;`,
      },
    },
  });

  // Sync external content changes (e.g. AI replace)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      isExternalUpdate.current = true;
      editor.commands.setContent(content, { emitUpdate: false });
      isExternalUpdate.current = false;
    }
  }, [content, editor]);

  // Setup Bible reference hover + click listeners
  useEffect(() => {
    const container = editorRef.current;
    if (!container) return;
    return setupBibleRefListeners(container, (ref) => {
      onBibleRefClickRef.current?.(ref);
    });
  }, [editor]);

  const handleUndo = useCallback(() => editor?.chain().focus().undo().run(), [editor]);
  const handleRedo = useCallback(() => editor?.chain().focus().redo().run(), [editor]);
  const toggleBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor]);
  const toggleItalic = useCallback(() => editor?.chain().focus().toggleItalic().run(), [editor]);
  const toggleUnderline = useCallback(() => editor?.chain().focus().toggleUnderline().run(), [editor]);
  const toggleStrike = useCallback(() => editor?.chain().focus().toggleStrike().run(), [editor]);
  const toggleH2 = useCallback(() => editor?.chain().focus().toggleHeading({ level: 2 }).run(), [editor]);
  const toggleH3 = useCallback(() => editor?.chain().focus().toggleHeading({ level: 3 }).run(), [editor]);
  const toggleBlockquote = useCallback(() => editor?.chain().focus().toggleBlockquote().run(), [editor]);
  const toggleBulletList = useCallback(() => editor?.chain().focus().toggleBulletList().run(), [editor]);
  const toggleOrderedList = useCallback(() => editor?.chain().focus().toggleOrderedList().run(), [editor]);

  const setHighlight = useCallback((color: string) => {
    if (!editor) return;
    if (editor.isActive("highlight", { color })) {
      editor.chain().focus().unsetHighlight().run();
    } else {
      editor.chain().focus().setHighlight({ color }).run();
    }
  }, [editor]);

  const wordCount = editor?.storage.characterCount?.words() ?? 0;

  const handleImagePaste = useCallback((event: React.ClipboardEvent) => {
    if (disabled || !editor) return;

    const clipboard = event.clipboardData;
    if (!clipboard) return;

    const itemFiles = Array.from(clipboard.items || [])
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => !!file);

    const directFiles = Array.from(clipboard.files || []).filter((file) =>
      file.type.startsWith("image/")
    );

    const files = [...itemFiles, ...directFiles].filter(
      (file, index, arr) =>
        arr.findIndex((f) => f.name === file.name && f.size === file.size && f.type === file.type) === index
    );

    if (!files.length) return;

    event.preventDefault();

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const src = typeof reader.result === "string" ? reader.result : null;
        if (!src) return;
        editor.chain().focus().setImage({ src, alt: file.name || "Imagem colada" }).run();
      };
      reader.readAsDataURL(file);
    });
  }, [disabled, editor]);

  if (!editor) return null;

  const BtnTool = ({ active, onClick, children, title, className = "" }: {
    active?: boolean; onClick: () => void; children: React.ReactNode; title: string; className?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded-md border-none cursor-pointer flex items-center justify-center text-sm transition-all duration-150
        ${active ? "bg-primary/15 text-primary font-bold" : "bg-transparent text-muted-foreground hover:bg-accent/10 hover:text-foreground"}
        ${className}`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      {/* ── Sticky Toolbars ── */}
      <div className="sticky top-0 z-20 bg-background border-b border-border-subtle">
        {/* ── Toolbar Line 1: Undo/Redo + Text formatting ── */}
        <div className="flex items-center gap-0.5 px-4 py-2 overflow-x-auto no-scrollbar">
          <BtnTool onClick={handleUndo} title="Desfazer (Ctrl+Z)">↩</BtnTool>
          <BtnTool onClick={handleRedo} title="Refazer (Ctrl+Shift+Z)">↪</BtnTool>
          <div className="w-px h-5 bg-border-subtle mx-1" />
          <BtnTool active={editor.isActive("bold")} onClick={toggleBold} title="Negrito (Ctrl+B)">
            <strong>B</strong>
          </BtnTool>
          <BtnTool active={editor.isActive("italic")} onClick={toggleItalic} title="Itálico (Ctrl+I)">
            <em>I</em>
          </BtnTool>
          <BtnTool active={editor.isActive("underline")} onClick={toggleUnderline} title="Sublinhado (Ctrl+U)">
            <span className="underline">U</span>
          </BtnTool>
          <BtnTool active={editor.isActive("strike")} onClick={toggleStrike} title="Tachado">
            <span className="line-through">S</span>
          </BtnTool>
          <div className="w-px h-5 bg-border-subtle mx-1" />
          <BtnTool active={editor.isActive("heading", { level: 2 })} onClick={toggleH2} title="Título">
            H2
          </BtnTool>
          <BtnTool active={editor.isActive("heading", { level: 3 })} onClick={toggleH3} title="Subtítulo">
            H3
          </BtnTool>
          <BtnTool active={editor.isActive("blockquote")} onClick={toggleBlockquote} title="Citação">
            ❝
          </BtnTool>
          <div className="w-px h-5 bg-border-subtle mx-1" />
          <BtnTool active={editor.isActive("bulletList")} onClick={toggleBulletList} title="Lista">
            •≡
          </BtnTool>
          <BtnTool active={editor.isActive("orderedList")} onClick={toggleOrderedList} title="Lista numerada">
            1.
          </BtnTool>
        </div>

        {/* ── Toolbar Line 2: Highlights + tools ── */}
        <div className="flex items-center gap-1 px-4 py-1.5 border-t border-border-subtle/50">
          {HIGHLIGHT_COLORS.map(h => (
            <button
              key={h.name}
              type="button"
              onClick={() => setHighlight(h.color)}
              title={`Destaque ${h.name}`}
              className={`w-7 h-7 rounded-md border-none cursor-pointer text-base flex items-center justify-center transition-all duration-150
                ${editor.isActive("highlight", { color: h.color }) ? "ring-2 ring-primary scale-110" : "hover:scale-110"}`}
            >
              {h.label}
            </button>
          ))}
          <div className="w-px h-5 bg-border-subtle mx-1" />
          {onRecordClick && (
            <button
              type="button"
              onClick={onRecordClick}
              title={isRecording ? "Parar gravação" : "Gravar áudio"}
              className={`w-8 h-8 rounded-md border-none cursor-pointer flex items-center justify-center text-sm transition-all duration-150
                ${isRecording ? "bg-destructive/15 text-destructive animate-pulse" : "bg-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {isRecording ? "⏹" : "🎙️"}
            </button>
          )}
          <div className="flex-1" />
          {onVerseClick && (
            <button
              type="button"
              onClick={onVerseClick}
              className="px-3 py-1.5 rounded-full border border-border text-muted-foreground font-display text-[9px] tracking-[2px] uppercase cursor-pointer
                hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200"
            >
              📖 Versículo
            </button>
          )}
          <span className="text-[11px] text-muted-foreground font-mono ml-2">{wordCount}w</span>
        </div>
      </div>

      {/* ── Editor content ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-36" ref={editorRef}>
        <EditorContent editor={editor} onPaste={handleImagePaste} />

        {/* ── Floating Bubble Menu on selection ── */}
        <BubbleMenu editor={editor} tippyOptions={{ duration: 150, placement: "top" }}>
          <div className="flex items-center gap-0.5 bg-card border border-border rounded-xl shadow-elegant-lg px-1.5 py-1 animate-fade-in">
            <BtnTool active={editor.isActive("bold")} onClick={toggleBold} title="Negrito">
              <strong>B</strong>
            </BtnTool>
            <BtnTool active={editor.isActive("italic")} onClick={toggleItalic} title="Itálico">
              <em>I</em>
            </BtnTool>
            <BtnTool active={editor.isActive("underline")} onClick={toggleUnderline} title="Sublinhado">
              <span className="underline">U</span>
            </BtnTool>
            <BtnTool active={editor.isActive("strike")} onClick={toggleStrike} title="Tachado">
              <span className="line-through">S</span>
            </BtnTool>
            <div className="w-px h-5 bg-border-subtle mx-0.5" />
            <BtnTool active={editor.isActive("heading", { level: 2 })} onClick={toggleH2} title="Título">
              H2
            </BtnTool>
            <BtnTool active={editor.isActive("heading", { level: 3 })} onClick={toggleH3} title="Subtítulo">
              H3
            </BtnTool>
            <BtnTool active={editor.isActive("blockquote")} onClick={toggleBlockquote} title="Citação">
              ❝
            </BtnTool>
            <div className="w-px h-5 bg-border-subtle mx-0.5" />
            {HIGHLIGHT_COLORS.map(h => (
              <button
                key={h.name}
                type="button"
                onClick={() => setHighlight(h.color)}
                title={`Destaque ${h.name}`}
                className={`w-7 h-7 rounded-md border-none cursor-pointer text-sm flex items-center justify-center transition-all duration-150
                  ${editor.isActive("highlight", { color: h.color }) ? "ring-2 ring-primary scale-110" : "hover:scale-110"}`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </BubbleMenu>
      </div>
    </div>
  );
}

// Export for use in inserting verse programmatically
export function insertVerseIntoEditor(
  editorRef: ReturnType<typeof useEditor>,
  reference: string,
  text: string
) {
  if (!editorRef) return;
  editorRef
    .chain()
    .focus()
    .insertContent(`<blockquote><p><strong>[${reference}]</strong></p><p><em>${text}</em></p></blockquote>`)
    .run();
}
