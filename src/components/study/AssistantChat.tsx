import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Search, BookOpen, Image, History, Copy, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import ChatMessage from "./ChatMessage";
import SuggestionCards from "./SuggestionCards";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
}

const STORAGE_KEY = "fascinacao_study_conversations";
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/study-chat`;

export default function AssistantChat({ userCodeId }: { userCodeId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setConversations(JSON.parse(saved));
    } catch {}
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Save conversation
  const saveConversation = useCallback((msgs: Message[]) => {
    if (msgs.length < 2) return;
    const title = msgs[0].content.slice(0, 60) + (msgs[0].content.length > 60 ? "…" : "");
    const id = activeConvId || Date.now().toString();

    setConversations(prev => {
      const existing = prev.filter(c => c.id !== id);
      const updated = [{ id, title, createdAt: new Date().toISOString(), messages: msgs }, ...existing];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 50))); } catch {}
      return updated;
    });
    if (!activeConvId) setActiveConvId(id);
  }, [activeConvId]);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: userMessage.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setIsLoading(true);

    // Reset textarea height
    if (inputRef.current) inputRef.current.style.height = "48px";

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMsgs }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Erro na conexão");
      }

      if (!resp.body) throw new Error("Stream não disponível");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save after streaming completes
      setMessages(prev => {
        saveConversation(prev);
        return prev;
      });
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `❌ ${e.message || "Não foi possível conectar ao assistente."}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, saveConversation]);

  const regenerate = useCallback(() => {
    const lastUserIdx = [...messages].reverse().findIndex(m => m.role === "user");
    if (lastUserIdx === -1) return;
    const idx = messages.length - 1 - lastUserIdx;
    const lastUserMsg = messages[idx].content;
    setMessages(messages.slice(0, idx));
    setTimeout(() => sendMessage(lastUserMsg), 100);
  }, [messages, sendMessage]);

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copiado ✓");
  };

  const saveToNotebook = (content: string) => {
    try {
      const notes = JSON.parse(localStorage.getItem("fascinacao_study_notes") || "[]");
      const now = new Date().toISOString();
      notes.unshift({
        id: Date.now().toString(),
        title: content.slice(0, 50) + "…",
        content: content,
        category: "Pessoal",
        wordCount: content.split(/\s+/).length,
        createdAt: now,
        updatedAt: now,
      });
      localStorage.setItem("fascinacao_study_notes", JSON.stringify(notes));
      toast.success("Salvo no Caderno ✓");
    } catch {
      toast.error("Erro ao salvar");
    }
  };

  const loadConversation = (conv: Conversation) => {
    setMessages(conv.messages);
    setActiveConvId(conv.id);
    setShowHistory(false);
  };

  const newConversation = () => {
    setMessages([]);
    setActiveConvId(null);
  };

  const deleteConversation = (id: string) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
    if (activeConvId === id) newConversation();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "48px";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const shortcuts = [
    { icon: <Search size={14} />, label: "Exegese", action: () => { setInput("Faça uma exegese de "); inputRef.current?.focus(); } },
    { icon: <BookOpen size={14} />, label: "Versículo", action: () => { setInput("Busque o versículo "); inputRef.current?.focus(); } },
    { icon: <Image size={14} />, label: "Imagem", action: () => { setInput("Pesquise uma imagem sobre "); inputRef.current?.focus(); } },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 relative"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.03) 0%, transparent 60%)' }}>
      {/* History button */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          onClick={newConversation}
          className="text-[10.5px] font-ui tracking-[1.5px] uppercase font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          + Nova conversa
        </button>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1.5 text-[10.5px] font-ui tracking-[1.5px] uppercase font-semibold text-muted-foreground hover:text-primary transition-colors"
        >
          <History size={13} /> Histórico
        </button>
      </div>

      {/* History panel */}
      {showHistory && (
        <div className="absolute inset-0 z-30 bg-background/95 backdrop-blur-sm overflow-y-auto p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-body text-lg font-bold text-foreground">Histórico</h3>
            <button onClick={() => setShowHistory(false)} className="text-muted-foreground text-xl">✕</button>
          </div>
          {conversations.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center mt-8">Nenhuma conversa salva</p>
          ) : (
            <div className="space-y-2">
              {conversations.map(conv => (
                <div key={conv.id} className="flex items-center gap-2">
                  <button
                    onClick={() => loadConversation(conv)}
                    className="flex-1 text-left p-3 rounded-xl transition-all active:scale-[0.98]"
                    style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  >
                    <span className="text-sm font-semibold text-foreground line-clamp-1">{conv.title}</span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      {new Date(conv.createdAt).toLocaleDateString("pt-BR")} · {conv.messages.length} msgs
                    </span>
                  </button>
                  <button
                    onClick={() => deleteConversation(conv.id)}
                    className="w-8 h-8 flex items-center justify-center text-destructive text-sm shrink-0"
                  >🗑️</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-48 scroll-smooth">
        {messages.length === 0 ? (
          <SuggestionCards onSelect={sendMessage} />
        ) : (
          <div className="space-y-5 py-3">
            {messages.map((msg, i) => (
              <ChatMessage
                key={i}
                message={msg}
                onCopy={() => copyMessage(msg.content)}
                onSave={() => saveToNotebook(msg.content)}
                onRegenerate={msg.role === "assistant" && i === messages.length - 1 ? regenerate : undefined}
              />
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-1.5 p-4 rounded-2xl max-w-[90%]" style={{ background: 'hsl(var(--card))' }}>
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area — sticky at bottom, respects parent width */}
      <div className="sticky bottom-0 z-20 backdrop-blur-xl border-t px-4 pt-2 pb-[env(safe-area-inset-bottom,8px)] lg:pb-3"
        style={{ background: 'hsl(var(--background) / 0.92)', borderColor: 'hsl(var(--border) / 0.5)' }}>
        {/* Shortcuts */}
        <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar pl-1">
          {shortcuts.map((s, i) => (
            <button
              key={i}
              onClick={s.action}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-[10.5px] font-semibold tracking-[1.5px] uppercase font-ui shrink-0 transition-all active:scale-95"
              style={{
                background: 'hsl(var(--primary) / 0.06)',
                border: '1px solid hsl(var(--primary) / 0.15)',
                color: 'hsl(var(--primary))',
              }}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* Input row */}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Pergunte sobre a Bíblia…"
            className="flex-1 resize-none rounded-2xl px-4 py-3 text-[15px] placeholder:italic transition-all"
            style={{
              fontFamily: "'Crimson Text', Georgia, serif",
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--foreground))',
              height: '48px',
              maxHeight: '120px',
              outline: 'none',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'hsl(var(--primary))'; e.target.style.boxShadow = '0 0 0 3px hsl(var(--primary) / 0.1)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'hsl(var(--border))'; e.target.style.boxShadow = 'none'; }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-30"
            style={{ background: 'hsl(var(--primary))' }}
          >
            <Send size={18} className="text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
