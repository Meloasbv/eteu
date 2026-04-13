import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import Reminders from "@/components/Reminders";

type Evt = {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  start: string;
  end: string;
  location?: string;
  color: string;
  textColor: string;
  icon: string;
  repeat?: "none" | "daily" | "weekly" | "monthly";
};

const COLOR_OPTIONS = [
  { bg: "hsl(var(--primary))", text: "#ffffff", label: "Dourado" },
  { bg: "#a855f7", text: "#ffffff", label: "Roxo" },
  { bg: "#7ecfe0", text: "#1a4a55", label: "Azul" },
  { bg: "#C8553D", text: "#ffffff", label: "Vermelho" },
  { bg: "#6B8E6B", text: "#ffffff", label: "Verde" },
  { bg: "#f9a8c9", text: "#5a1a35", label: "Rosa" },
  { bg: "#4A7C8C", text: "#ffffff", label: "Teal" },
  { bg: "#1a1a1a", text: "#ffffff", label: "Preto" },
];

const ICON_OPTIONS = ["📌","🙏","🎯","🌹","🥗","⛪","🔬","🕯️","📖","💪","🎵","☕","🏃","✍️","💼","🧘","🎉","📞","🛒","🏠","📚","💡"];

const STORAGE_KEY = "fascinacao-agenda-events";
const DAYS_PT = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const emptyForm = (date: string): { name: string; start: string; end: string; location: string; icon: string; color: string; textColor: string; date: string; repeat: "none" | "daily" | "weekly" | "monthly" } => ({
  name: "", start: "08:00", end: "09:00",
  location: "", icon: "📌",
  color: COLOR_OPTIONS[0].bg, textColor: COLOR_OPTIONS[0].text,
  date, repeat: "none",
});

export default function WeekSchedule({ userCodeId }: { userCodeId: string }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(formatDate(today));
  const [events, setEvents] = useState<Evt[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm(formatDate(today)));
  const [view, setView] = useState<"month" | "week">("month");

  // Load events
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setEvents(JSON.parse(saved));
    } catch {}
  }, []);

  const saveEvents = (updated: Evt[]) => {
    setEvents(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  };

  const addEvent = () => {
    if (!form.name.trim()) return;
    const id = `evt-${Date.now()}`;
    const newEv: Evt = { ...form, id };
    const updated = [...events, newEv].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.start.localeCompare(b.start);
    });
    saveEvents(updated);
    setShowModal(false);
    setForm(emptyForm(selectedDate));
  };

  const removeEvent = (id: string) => {
    saveEvents(events.filter(e => e.id !== id));
    setDeleteId(null);
  };

  // Get events for a specific date (including repeating)
  const getEventsForDate = (dateStr: string) => {
    const target = new Date(dateStr + "T00:00:00");
    return events.filter(ev => {
      if (ev.date === dateStr) return true;
      if (!ev.repeat || ev.repeat === "none") return false;
      const evDate = new Date(ev.date + "T00:00:00");
      if (evDate > target) return false;
      if (ev.repeat === "daily") return true;
      if (ev.repeat === "weekly") return evDate.getDay() === target.getDay();
      if (ev.repeat === "monthly") return evDate.getDate() === target.getDate();
      return false;
    });
  };

  const selectedEvents = useMemo(() => 
    getEventsForDate(selectedDate).sort((a, b) => a.start.localeCompare(b.start)),
    [events, selectedDate]
  );

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfWeek(currentYear, currentMonth);
  const todayStr = formatDate(today);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0); }
    else setCurrentMonth(m => m + 1);
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Selected date display
  const selDate = new Date(selectedDate + "T00:00:00");
  const selDayName = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"][selDate.getDay()];

  // Get current time for "next event" indicator
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isSelectedToday = selectedDate === todayStr;

  let nextEventId: string | null = null;
  if (isSelectedToday) {
    for (const ev of selectedEvents) {
      const [h, m] = ev.start.split(":").map(Number);
      if (h * 60 + m >= nowMinutes) { nextEventId = ev.id; break; }
    }
  }

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[22px] font-body font-bold text-foreground">Agenda</h2>
            <p className="text-[12px] text-muted-foreground font-ui mt-0.5">Organize sua semana</p>
          </div>
          <button
            onClick={() => { setForm(emptyForm(selectedDate)); setShowModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-ui text-[11px] tracking-wider uppercase font-semibold transition-all active:scale-95"
            style={{
              background: 'hsl(var(--primary) / 0.12)',
              border: '1px solid hsl(var(--primary) / 0.3)',
              color: 'hsl(var(--primary))',
            }}
          >
            <Plus size={14} /> Novo
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="mx-4 rounded-2xl border border-border bg-card overflow-hidden">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
          <button onClick={prevMonth} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <span className="text-[15px] font-body font-bold text-foreground">
              {MONTHS_PT[currentMonth]}
            </span>
            <span className="text-[13px] text-muted-foreground ml-1.5 font-ui">{currentYear}</span>
          </div>
          <button onClick={nextMonth} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 px-3 pt-2">
          {DAYS_PT.map(d => (
            <div key={d} className="text-center text-[9px] font-ui tracking-wider uppercase text-muted-foreground py-1.5">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px px-3 pb-3">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} className="aspect-square" />;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const dayEvents = getEventsForDate(dateStr);
            const hasEvents = dayEvents.length > 0;

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(dateStr)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative
                  ${isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : ""}
                  ${isToday && !isSelected ? "bg-primary/10" : ""}
                  active:scale-90`}
              >
                <span className={`text-[13px] font-medium
                  ${isToday ? "text-primary font-bold" : isSelected ? "text-foreground" : "text-foreground/70"}`}>
                  {day}
                </span>
                {hasEvents && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((ev, ei) => (
                      <span key={ei} className="w-1 h-1 rounded-full" style={{ background: ev.color }} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[16px] font-body font-bold text-foreground">{selDayName}</h3>
            <p className="text-[12px] text-muted-foreground font-ui">
              {selDate.getDate()} de {MONTHS_PT[selDate.getMonth()]}
            </p>
          </div>
          <span className="text-[11px] text-muted-foreground font-ui">
            {selectedEvents.length} {selectedEvents.length === 1 ? "evento" : "eventos"}
          </span>
        </div>

        {selectedEvents.length === 0 ? (
          <div className="text-center py-10 rounded-2xl border border-dashed border-border/50">
            <p className="text-muted-foreground text-[14px]">Nenhum evento</p>
            <button
              onClick={() => { setForm(emptyForm(selectedDate)); setShowModal(true); }}
              className="mt-3 px-5 py-2 rounded-xl text-[12px] font-ui font-semibold text-primary transition-all active:scale-95"
              style={{ background: 'hsl(var(--primary) / 0.08)', border: '1px solid hsl(var(--primary) / 0.2)' }}
            >
              + Adicionar evento
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedEvents.map(ev => {
              const isNext = ev.id === nextEventId;
              return (
                <div key={ev.id} className="flex items-stretch rounded-xl overflow-hidden transition-all"
                  style={{
                    boxShadow: isNext ? `0 4px 16px ${ev.color}30` : 'var(--shadow)',
                    transform: isNext ? 'scale(1.01)' : 'scale(1)',
                  }}>
                  <div style={{ width: isNext ? 5 : 4, background: ev.color, flexShrink: 0 }} />
                  <div className="flex-1 p-3.5 flex items-center gap-3"
                    style={{
                      background: isNext ? `hsl(var(--card))` : 'hsl(var(--card) / 0.8)',
                      border: `1px solid ${isNext ? ev.color + '40' : 'hsl(var(--border))'}`,
                      borderLeft: 'none',
                      borderRadius: '0 12px 12px 0',
                    }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                      style={{ background: ev.color + '15', border: `1px solid ${ev.color}30` }}>
                      {ev.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-foreground truncate">{ev.name}</span>
                        {isNext && (
                          <span className="text-[8px] font-ui font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{ color: ev.color, background: ev.color + '15', border: `1px solid ${ev.color}25` }}>
                            Próximo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground font-ui">
                        <span className="flex items-center gap-1"><Clock size={10} /> {ev.start} – {ev.end}</span>
                        {ev.location && <span className="flex items-center gap-1"><MapPin size={10} /> {ev.location}</span>}
                      </div>
                    </div>
                    <button onClick={() => setDeleteId(ev.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-destructive/50 hover:text-destructive hover:bg-destructive/10 transition-all shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reminders */}
      <div className="px-4 mt-6">
        <Reminders userCodeId={userCodeId} />
      </div>

      {/* ── ADD MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center"
          onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setForm(emptyForm(selectedDate)); } }}>
          <div className="w-full max-w-lg bg-card border-t border-border rounded-t-3xl p-5 pb-10 max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-ui tracking-[2px] uppercase text-muted-foreground font-semibold">Novo evento</p>
                <p className="text-[13px] text-foreground font-body mt-0.5">{selDayName}, {selDate.getDate()} de {MONTHS_PT[selDate.getMonth()]}</p>
              </div>
              <button onClick={() => { setShowModal(false); setForm(emptyForm(selectedDate)); }}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground text-lg">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-ui tracking-wider uppercase text-muted-foreground font-semibold block mb-1.5">Nome *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Reunião de célula"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-[14px] font-body outline-none focus:border-primary transition-colors" />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[11px] font-ui tracking-wider uppercase text-muted-foreground font-semibold block mb-1.5">Início</label>
                  <input type="time" value={form.start} onChange={e => setForm(p => ({ ...p, start: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-[14px] font-body outline-none focus:border-primary transition-colors" />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-ui tracking-wider uppercase text-muted-foreground font-semibold block mb-1.5">Fim</label>
                  <input type="time" value={form.end} onChange={e => setForm(p => ({ ...p, end: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-[14px] font-body outline-none focus:border-primary transition-colors" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-ui tracking-wider uppercase text-muted-foreground font-semibold block mb-1.5">Local (opcional)</label>
                <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                  placeholder="Ex: Igreja, Casa, Online…"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-[14px] font-body outline-none focus:border-primary transition-colors" />
              </div>

              <div>
                <label className="text-[11px] font-ui tracking-wider uppercase text-muted-foreground font-semibold block mb-1.5">Repetir</label>
                <div className="flex gap-2">
                  {([["none","Nunca"],["daily","Diário"],["weekly","Semanal"],["monthly","Mensal"]] as const).map(([key, label]) => (
                    <button key={key} onClick={() => setForm(p => ({ ...p, repeat: key }))}
                      className="flex-1 py-2 rounded-lg text-[11px] font-ui font-semibold transition-all"
                      style={{
                        background: form.repeat === key ? 'hsl(var(--primary) / 0.12)' : 'hsl(var(--background))',
                        border: `1px solid ${form.repeat === key ? 'hsl(var(--primary) / 0.4)' : 'hsl(var(--border))'}`,
                        color: form.repeat === key ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-ui tracking-wider uppercase text-muted-foreground font-semibold block mb-2">Ícone</label>
                <div className="flex flex-wrap gap-1.5">
                  {ICON_OPTIONS.map(ic => (
                    <button key={ic} onClick={() => setForm(p => ({ ...p, icon: ic }))}
                      className="w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all"
                      style={{
                        border: `1px solid ${form.icon === ic ? 'hsl(var(--primary) / 0.5)' : 'hsl(var(--border))'}`,
                        background: form.icon === ic ? 'hsl(var(--primary) / 0.12)' : 'transparent',
                      }}>{ic}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-ui tracking-wider uppercase text-muted-foreground font-semibold block mb-2">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c.bg} onClick={() => setForm(p => ({ ...p, color: c.bg, textColor: c.text }))}
                      className="w-8 h-8 rounded-lg transition-all"
                      style={{
                        background: c.bg,
                        border: form.color === c.bg ? '2px solid hsl(var(--foreground))' : '2px solid transparent',
                        boxShadow: form.color === c.bg ? '0 0 0 1px hsl(var(--border))' : 'none',
                      }} />
                  ))}
                </div>
              </div>

              {/* Preview */}
              {form.name && (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-background/50">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                    style={{ background: form.color + '15', border: `1px solid ${form.color}30` }}>
                    {form.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold text-foreground">{form.name}</p>
                    <p className="text-[11px] text-muted-foreground font-ui">{form.start} – {form.end}{form.location ? ` · ${form.location}` : ""}</p>
                  </div>
                  <div className="w-1 h-9 rounded-full" style={{ background: form.color }} />
                </div>
              )}

              <button onClick={addEvent} disabled={!form.name.trim()}
                className="w-full py-3 rounded-xl font-ui text-[12px] tracking-wider uppercase font-semibold transition-all active:scale-[0.97]"
                style={{
                  background: form.name.trim() ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--muted) / 0.3)',
                  border: `1px solid ${form.name.trim() ? 'hsl(var(--primary) / 0.4)' : 'hsl(var(--border))'}`,
                  color: form.name.trim() ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                  cursor: form.name.trim() ? 'pointer' : 'not-allowed',
                }}>
                Adicionar evento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-5">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-xs w-full text-center animate-scale-in">
            <div className="text-3xl mb-3">🗑️</div>
            <h3 className="text-[16px] font-bold text-foreground mb-2">Remover evento?</h3>
            <p className="text-[13px] text-muted-foreground mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground font-ui text-[13px] transition-all active:scale-95">
                Cancelar
              </button>
              <button onClick={() => removeEvent(deleteId)}
                className="flex-1 py-2.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive font-ui text-[13px] font-semibold transition-all active:scale-95">
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
