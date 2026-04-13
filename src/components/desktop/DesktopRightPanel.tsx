import { Trophy, Flame, BookOpen, Clock, Star, TrendingUp } from "lucide-react";

interface Props {
  totalProgress: number;
  weekProgress: number;
  activeWeek: number;
  totalWeeks: number;
  checked: Record<string, boolean>;
  todayVerse?: string;
  todayRef?: string;
  streakDays: number;
}

export default function DesktopRightPanel({
  totalProgress, weekProgress, activeWeek, totalWeeks, checked, todayVerse, todayRef, streakDays,
}: Props) {
  // Count completed days
  const completedDays = Object.values(checked).filter(Boolean).length;

  return (
    <aside className="hidden xl:flex flex-col h-screen sticky top-0 w-[280px] border-l border-border/40 bg-card/30 backdrop-blur-sm overflow-y-auto no-scrollbar">
      <div className="p-5 space-y-5">
        {/* Weekly Progress */}
        <div className="rounded-2xl p-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border)/0.4)' }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-primary/60" />
            <p className="text-[10px] tracking-[2px] uppercase text-muted-foreground font-ui font-medium">Progresso Semanal</p>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-[32px] font-bold text-foreground font-display leading-none">
              {Math.round(weekProgress * 100)}%
            </span>
            <span className="text-[11px] text-muted-foreground font-ui pb-1">Semana {activeWeek + 1}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-border/40 mt-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${weekProgress * 100}%`,
                background: weekProgress >= 1 ? 'hsl(var(--success))' : 'hsl(var(--primary))',
              }}
            />
          </div>
        </div>

        {/* Overall Progress */}
        <div className="rounded-2xl p-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border)/0.4)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={14} className="text-primary/60" />
            <p className="text-[10px] tracking-[2px] uppercase text-muted-foreground font-ui font-medium">Progresso Total</p>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-[28px] font-bold text-foreground font-display leading-none">
              {Math.round(totalProgress * 100)}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-border/40 mt-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${totalProgress * 100}%`, background: 'hsl(var(--primary))' }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard icon={<Flame size={16} />} label="Sequência" value={`${streakDays}d`} color="var(--fire)" />
          <StatCard icon={<BookOpen size={16} />} label="Dias lidos" value={`${completedDays}`} color="var(--primary)" />
        </div>

        {/* Verse of the day */}
        {todayVerse && (
          <div className="rounded-2xl p-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border)/0.4)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Star size={14} className="text-primary/60" />
              <p className="text-[10px] tracking-[2px] uppercase text-muted-foreground font-ui font-medium">Versículo do Dia</p>
            </div>
            <blockquote className="text-[13px] leading-relaxed text-foreground/70 italic font-serif">
              "{todayVerse}"
            </blockquote>
            {todayRef && (
              <p className="text-[11px] text-primary/70 mt-2 font-ui">— {todayRef}</p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border)/0.4)' }}>
      <div className="flex items-center gap-1.5 mb-1" style={{ color: `hsl(${color})` }}>
        {icon}
      </div>
      <p className="text-[18px] font-bold text-foreground font-display leading-none mt-1">{value}</p>
      <p className="text-[9px] tracking-[1.5px] uppercase text-muted-foreground font-ui mt-1">{label}</p>
    </div>
  );
}
