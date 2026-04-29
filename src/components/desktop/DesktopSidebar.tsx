import { BookOpen, Flame, NotebookPen, Brain, Sun, Moon, LogOut, ChevronLeft, ChevronRight, Zap, Mic, Settings } from "lucide-react";
import { useState } from "react";

type Tab = "leitura" | "devocional" | "anotacoes" | "biblioteca" | "cerebro" | "agente";

interface Props {
  tab: Tab;
  setTab: (t: Tab) => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  onLogout: () => void;
  onOpenFocus?: () => void;
  focusActive?: boolean;
}

type NavItem = { key: Tab; icon: React.ElementType; label: string };

const PRIMARY: NavItem[] = [
  { key: "anotacoes", icon: NotebookPen, label: "Caderno" },
  { key: "leitura", icon: BookOpen, label: "Leitura" },
  { key: "devocional", icon: Flame, label: "Devocionais" },
  { key: "cerebro", icon: Brain, label: "Segundo Cérebro" },
];

const TOOLS: NavItem[] = [
  { key: "agente", icon: Mic, label: "Agente IA" },
];

export default function DesktopSidebar({ tab, setTab, theme, setTheme, onLogout, onOpenFocus, focusActive }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className="hidden lg:flex flex-col h-screen sticky top-0 transition-all duration-300"
      style={{
        width: collapsed ? 60 : 232,
        background: "hsl(var(--sidebar-background))",
        color: "hsl(var(--sidebar-foreground))",
        borderRight: "1px solid hsl(var(--sidebar-border))",
      }}
    >
      {/* Brand */}
      <div className="px-3 pt-4 pb-3 flex items-center justify-between">
        {!collapsed && (
          <div className="px-2 animate-fade-in">
            <p className="text-[9px] tracking-[2.5px] uppercase font-ui" style={{ color: "hsl(var(--sidebar-foreground) / 0.45)" }}>
              Caderno · 2026
            </p>
            <h2 className="text-[14px] font-semibold font-display tracking-wide mt-0.5" style={{ color: "hsl(var(--sidebar-primary))" }}>
              Estudo
            </h2>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-7 h-7 rounded-md flex items-center justify-center transition-all hover:bg-white/5"
          style={{ color: "hsl(var(--sidebar-foreground) / 0.7)" }}
          aria-label={collapsed ? "Expandir" : "Recolher"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Modo Foco */}
      {onOpenFocus && (
        <div className="px-2 pt-1 pb-2">
          <button
            onClick={onOpenFocus}
            className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[12px] font-ui transition-all ${
              focusActive ? "bg-white/10" : "hover:bg-white/5"
            }`}
            style={{ color: "hsl(var(--sidebar-foreground))" }}
            title="Modo Foco"
          >
            <Zap size={15} strokeWidth={1.8} className="shrink-0 opacity-80" />
            {!collapsed && <span className="truncate">Modo Foco</span>}
          </button>
        </div>
      )}

      <SectionLabel collapsed={collapsed}>Principal</SectionLabel>
      <nav className="px-2 space-y-px">
        {PRIMARY.map(item => (
          <NavBtn key={item.key} item={item} active={tab === item.key} collapsed={collapsed} onClick={() => setTab(item.key)} />
        ))}
      </nav>

      <SectionLabel collapsed={collapsed}>Ferramentas</SectionLabel>
      <nav className="px-2 space-y-px">
        {TOOLS.map(item => (
          <NavBtn key={item.key} item={item} active={tab === item.key} collapsed={collapsed} onClick={() => setTab(item.key)} />
        ))}
      </nav>

      <div className="flex-1" />

      {/* Bottom actions */}
      <div className="px-2 py-3 space-y-px" style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}>
        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[12px] font-ui transition-all hover:bg-white/5"
          style={{ color: "hsl(var(--sidebar-foreground) / 0.85)" }}
        >
          {theme === "light" ? <Moon size={15} strokeWidth={1.6} /> : <Sun size={15} strokeWidth={1.6} />}
          {!collapsed && <span>{theme === "light" ? "Modo escuro" : "Modo claro"}</span>}
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[12px] font-ui transition-all hover:bg-white/5"
          style={{ color: "hsl(var(--sidebar-foreground) / 0.85)" }}
        >
          <LogOut size={15} strokeWidth={1.6} />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}

function SectionLabel({ collapsed, children }: { collapsed: boolean; children: React.ReactNode }) {
  if (collapsed) return <div className="h-3" />;
  return (
    <p
      className="text-[9px] tracking-[2.2px] uppercase font-ui px-4 mt-3 mb-1"
      style={{ color: "hsl(var(--sidebar-foreground) / 0.4)" }}
    >
      {children}
    </p>
  );
}

function NavBtn({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: { key: string; icon: React.ElementType; label: string };
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[12.5px] font-ui transition-all"
      style={{
        background: active ? "hsl(var(--sidebar-primary))" : "transparent",
        color: active ? "hsl(var(--sidebar-primary-foreground))" : "hsl(var(--sidebar-foreground))",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "hsl(var(--sidebar-accent))";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
      title={item.label}
    >
      <Icon size={15} strokeWidth={active ? 2 : 1.6} className="shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </button>
  );
}
