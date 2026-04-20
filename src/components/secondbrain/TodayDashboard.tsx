import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Brain, BookOpen, Flame, Bell, Sparkles, Target, ChevronRight } from "lucide-react";
import { useParaItems } from "@/hooks/useParaLinks";

interface Props {
  userCodeId: string;
  todayReadings?: string[];
  todayDevotionalRef?: string;
  todayDevotionalVerse?: string;
  onJumpToCapture: () => void;
  onJumpToPara: () => void;
}

interface Reminder {
  id: string;
  title: string;
  reminder_datetime: string;
  category: string;
}

interface RecentThought {
  id: string;
  content: string;
  type: string;
  created_at: string;
}

export default function TodayDashboard({
  userCodeId, todayReadings, todayDevotionalRef, todayDevotionalVerse, onJumpToCapture, onJumpToPara,
}: Props) {
  const { items: paraItems } = useParaItems(userCodeId);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [recentThoughts, setRecentThoughts] = useState<RecentThought[]>([]);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const in7 = new Date(now.getTime() + 7 * 86400000);
      const { data: rem } = await supabase
        .from("reminders")
        .select("id,title,reminder_datetime,category")
        .eq("user_code_id", userCodeId)
        .eq("active", true)
        .gte("reminder_datetime", now.toISOString())
        .lte("reminder_datetime", in7.toISOString())
        .order("reminder_datetime", { ascending: true })
        .limit(5);
      setReminders((rem as any) || []);

      const { data: th } = await supabase
        .from("thoughts")
        .select("id,content,type,created_at")
        .eq("user_code_id", userCodeId)
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(3);
      setRecentThoughts((th as any) || []);
    })();
  }, [userCodeId]);

  const projectsSoon = paraItems
    .filter(p => p.kind === "project" && p.status === "active" && p.deadline)
    .map(p => ({ ...p, days: Math.ceil((new Date(p.deadline!).getTime() - Date.now()) / 86400000) }))
    .filter(p => p.days <= 14)
    .sort((a, b) => a.days - b.days)
    .slice(0, 4);

  const todayName = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-3 space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[3px] text-muted-foreground/60 font-ui">Hoje</p>
          <h2 className="text-lg font-bold font-display tracking-wide capitalize">{todayName}</h2>
        </div>
      </div>

      {/* Reading + Devotional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card icon={<BookOpen size={14} className="text-primary" />} title="Leitura de Hoje">
          {todayReadings && todayReadings.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {todayReadings.map((r, i) => (
                <span key={i} className="px-2 py-1 rounded-md text-[11px] font-body bg-primary/8 text-primary/85 border border-primary/15">{r}</span>
              ))}
            </div>
          ) : (
            <p className="text-xs italic text-muted-foreground/60">Sem leitura programada hoje</p>
          )}
        </Card>

        <Card icon={<Flame size={14} className="text-fire" />} title="Devocional do Dia">
          {todayDevotionalRef ? (
            <>
              <p className="text-[11px] font-bold text-primary/85 font-ui">{todayDevotionalRef}</p>
              {todayDevotionalVerse && <p className="text-xs italic text-foreground/70 mt-1 font-body line-clamp-2">"{todayDevotionalVerse}"</p>}
            </>
          ) : (
            <p className="text-xs italic text-muted-foreground/60">Sem devocional para hoje</p>
          )}
        </Card>
      </div>

      {/* Reminders */}
      <Card icon={<Bell size={14} className="text-primary" />} title="Próximos Lembretes (7 dias)">
        {reminders.length === 0 ? (
          <p className="text-xs italic text-muted-foreground/60">Nada agendado</p>
        ) : (
          <div className="space-y-1.5">
            {reminders.map(r => {
              const d = new Date(r.reminder_datetime);
              return (
                <div key={r.id} className="flex items-center gap-2 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70 w-20 shrink-0 font-ui">
                    {d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </span>
                  <span className="text-foreground/80 font-body truncate">{r.title}</span>
                  <span className="text-muted-foreground/50 text-[10px] ml-auto shrink-0">
                    {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Recent thoughts */}
      <Card icon={<Brain size={14} className="text-primary" />} title="Últimos Pensamentos" action={
        <button onClick={onJumpToCapture} className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline font-ui inline-flex items-center gap-1">
          <Sparkles size={11} /> Capturar
        </button>
      }>
        {recentThoughts.length === 0 ? (
          <p className="text-xs italic text-muted-foreground/60">Capture seu primeiro pensamento</p>
        ) : (
          <div className="space-y-1.5">
            {recentThoughts.map(t => (
              <p key={t.id} className="text-xs text-foreground/75 font-body line-clamp-2 border-l-2 border-primary/30 pl-2">{t.content}</p>
            ))}
          </div>
        )}
      </Card>

      {/* PARA projects with deadlines */}
      <Card icon={<Target size={14} className="text-primary" />} title="Projetos Ativos" action={
        <button onClick={onJumpToPara} className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline font-ui inline-flex items-center gap-1">
          PARA <ChevronRight size={11} />
        </button>
      }>
        {projectsSoon.length === 0 ? (
          <p className="text-xs italic text-muted-foreground/60">Nenhum projeto com prazo nos próximos 14 dias</p>
        ) : (
          <div className="space-y-1.5">
            {projectsSoon.map(p => (
              <div key={p.id} className="flex items-center gap-2 text-xs">
                <span className="text-base">{p.icon || "🎯"}</span>
                <span className="flex-1 text-foreground/85 font-body truncate">{p.title}</span>
                <span className="text-[10px] font-bold uppercase font-ui shrink-0" style={{ color: p.days < 0 ? "hsl(var(--destructive))" : p.days <= 3 ? "#d4854a" : "hsl(var(--muted-foreground))" }}>
                  {p.days < 0 ? `${Math.abs(p.days)}d atraso` : p.days === 0 ? "hoje" : `${p.days}d`}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Card({ icon, title, children, action }: { icon: React.ReactNode; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl p-3 bg-card border border-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {icon}
          <h4 className="text-[10px] uppercase tracking-[2px] font-bold text-muted-foreground/70 font-ui">{title}</h4>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
