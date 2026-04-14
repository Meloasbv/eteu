import { BookOpen, Flame, Calendar, PenLine, Sun, Moon, LogOut, Brain, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

type Tab = "leitura" | "devocional" | "agenda" | "anotacoes" | "biblioteca" | "mapamental";

interface Props {
  tab: Tab;
  setTab: (t: Tab) => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  onLogout: () => void;
}

const NAV_ITEMS: { key: Tab; icon: React.ElementType; label: string }[] = [
  { key: "leitura", icon: BookOpen, label: "Plano de Leitura" },
  { key: "devocional", icon: Flame, label: "Devocionais" },
  { key: "mapamental", icon: Brain, label: "Mapa Mental" },
  { key: "agenda", icon: Calendar, label: "Agenda" },
  { key: "anotacoes", icon: PenLine, label: "Estudo" },
];

export default function DesktopSidebar({ tab, setTab, theme, setTheme, onLogout }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className="hidden lg:flex flex-col h-screen sticky top-0 border-r border-border/40 transition-all duration-300 bg-card/50 backdrop-blur-sm"
      style={{ width: collapsed ? 64 : 240 }}
    >
      {/* Brand */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        {!collapsed && (
          <div className="animate-fade-in">
            <p className="text-[9px] tracking-[3px] uppercase text-muted-foreground font-ui">Fascinação · 2026A</p>
            <h2 className="text-[15px] font-bold text-foreground font-display tracking-wide mt-0.5">Estudo Tudo Em Um</h2>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <div className="h-px bg-border/30 mx-3" />

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        <p className={`text-[9px] tracking-[2px] uppercase text-muted-foreground/50 font-ui px-2 mb-2 ${collapsed ? "hidden" : ""}`}>
          Navegação
        </p>
        {NAV_ITEMS.map(item => {
          const isActive = tab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-ui transition-all duration-200
                ${isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent"
                }`}
            >
              <item.icon size={18} strokeWidth={isActive ? 2 : 1.5} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="h-px bg-border/30 mx-3" />

      {/* Bottom actions */}
      <div className="px-2 py-3 space-y-0.5">
        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-ui text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all border border-transparent"
        >
          {theme === "light" ? <Moon size={18} strokeWidth={1.5} /> : <Sun size={18} strokeWidth={1.5} />}
          {!collapsed && <span>{theme === "light" ? "Modo escuro" : "Modo claro"}</span>}
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-ui text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all border border-transparent"
        >
          <LogOut size={18} strokeWidth={1.5} />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
