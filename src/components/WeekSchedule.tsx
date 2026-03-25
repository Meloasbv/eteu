import { useState, useEffect } from "react";
import Reminders from "@/components/Reminders";

type Evt = {
  id: string;
  name: string;
  start: string;
  end: string;
  location?: string;
  color: string;
  textColor: string;
  icon: string;
  custom?: boolean;
};

const COLOR_OPTIONS = [
  { bg: "#a855f7", text: "#ffffff", label: "Roxo" },
  { bg: "#7ecfe0", text: "#1a4a55", label: "Azul" },
  { bg: "#C8553D", text: "#ffffff", label: "Vermelho" },
  { bg: "#c8b820", text: "#2a2000", label: "Amarelo" },
  { bg: "#6B8E6B", text: "#ffffff", label: "Verde" },
  { bg: "#f9a8c9", text: "#5a1a35", label: "Rosa" },
  { bg: "#1a1a1a", text: "#ffffff", label: "Preto" },
  { bg: "#4A7C8C", text: "#ffffff", label: "Teal" },
];

const ICON_OPTIONS = ["📌","🙏","🎯","🌹","🥗","⛪","🔬","🕯️","📖","💪","🎵","☕","🏃","✍️","💼","🧘","🎉","📞"];

const DAYS_BASE = [
  { label: "DOM", date: "22", full: "Domingo, 22 de março" },
  { label: "SEG", date: "23", full: "Segunda, 23 de março" },
  { label: "TER", date: "24", full: "Terça, 24 de março" },
  { label: "QUA", date: "25", full: "Quarta, 25 de março" },
  { label: "QUI", date: "26", full: "Quinta, 26 de março" },
  { label: "SEX", date: "27", full: "Sexta, 27 de março" },
  { label: "SAB", date: "28", full: "Sábado, 28 de março" },
];

const DEFAULT_EVENTS: Record<number, Evt[]> = {
  0: [{ id:"d0-0", name:"Culto", start:"19:00", end:"21:00", location:"Igreja", color:"#1a1a1a", textColor:"#ffffff", icon:"🙏" }],
  1: [
    { id:"d1-0", name:"Feriado", start:"09:00", end:"12:00", color:"#f0ece3", textColor:"#6a5a48", icon:"🏖️" },
    { id:"d1-1", name:"Almoço", start:"12:00", end:"13:00", location:"Casa verde", color:"#c8dfc8", textColor:"#2a4a2a", icon:"🥗" },
    { id:"d1-2", name:"Tracks", start:"15:30", end:"17:30", color:"#7ecfe0", textColor:"#1a4a55", icon:"🎯" },
  ],
  2: [
    { id:"d2-0", name:"Cantares: Jornada do amor", start:"09:00", end:"12:00", color:"#a855f7", textColor:"#ffffff", icon:"🌹" },
    { id:"d2-1", name:"Almoço", start:"12:00", end:"13:00", location:"Casa verde", color:"#c8dfc8", textColor:"#2a4a2a", icon:"🥗" },
    { id:"d2-2", name:"Tracks", start:"15:30", end:"17:30", color:"#7ecfe0", textColor:"#1a4a55", icon:"🎯" },
    { id:"d2-3", name:"Turno", start:"18:00", end:"22:00", location:"Igreja", color:"#c8b820", textColor:"#2a2000", icon:"⛪" },
  ],
  3: [
    { id:"d3-0", name:"Cantares: Jornada do amor", start:"09:00", end:"12:00", color:"#a855f7", textColor:"#ffffff", icon:"🌹" },
    { id:"d3-1", name:"Laboratório", start:"17:00", end:"19:00", location:"Igreja", color:"#C8553D", textColor:"#ffffff", icon:"🔬" },
    { id:"d3-2", name:"Turno", start:"20:00", end:"22:00", location:"Igreja", color:"#c8b820", textColor:"#2a2000", icon:"⛪" },
  ],
  4: [
    { id:"d4-0", name:"Cantares: Jornada do amor", start:"09:00", end:"12:00", color:"#a855f7", textColor:"#ffffff", icon:"🌹" },
    { id:"d4-1", name:"Almoço", start:"12:00", end:"13:00", location:"Casa verde", color:"#c8dfc8", textColor:"#2a4a2a", icon:"🥗" },
    { id:"d4-2", name:"Turno", start:"18:00", end:"22:00", location:"Igreja", color:"#c8b820", textColor:"#2a2000", icon:"⛪" },
  ],
  5: [
    { id:"d5-0", name:"Cantares: Jornada do amor", start:"09:00", end:"12:00", color:"#a855f7", textColor:"#ffffff", icon:"🌹" },
    { id:"d5-1", name:"Almoço", start:"12:00", end:"13:00", location:"Casa verde", color:"#c8dfc8", textColor:"#2a4a2a", icon:"🥗" },
    { id:"d5-2", name:"Vigília", start:"22:00", end:"23:59", location:"Igreja", color:"#f9a8c9", textColor:"#5a1a35", icon:"🕯️" },
  ],
  6: [],
};

const STORAGE_KEY = "week-schedule-events";

const emptyForm = () => ({
  name: "", start: "08:00", end: "09:00",
  location: "", icon: "📌",
  color: COLOR_OPTIONS[0].bg, textColor: COLOR_OPTIONS[0].text,
});

export default function WeekSchedule({ userCodeId }: { userCodeId: string }) {
  const [selected, setSelected] = useState(1);
  const [events, setEvents] = useState<Record<number, Evt[]>>(DEFAULT_EVENTS);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const custom: Evt[] = JSON.parse(saved);
        setEvents(prev => {
          const next = { ...prev };
          custom.forEach(ev => {
            const di = ev.id.startsWith("c") ? parseInt(ev.id.split("-")[1]) : -1;
            if (di >= 0 && di <= 6) {
              if (!next[di]) next[di] = [];
              if (!next[di].find(e => e.id === ev.id)) next[di] = [...next[di], ev];
            }
          });
          return next;
        });
      }
    } catch {}
  }, []);

  const saveCustom = (updated: Record<number, Evt[]>) => {
    const custom = Object.entries(updated).flatMap(([, evs]) =>
      evs.filter(e => e.custom)
    );
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(custom)); } catch {}
  };

  const addEvent = () => {
    if (!form.name.trim()) return;
    const id = `c-${selected}-${Date.now()}`;
    const newEv: Evt = { ...form, id, custom: true };
    setEvents(prev => {
      const next = { ...prev, [selected]: [...(prev[selected] || []), newEv]
        .sort((a, b) => a.start.localeCompare(b.start)) };
      saveCustom(next);
      return next;
    });
    setShowModal(false);
    setForm(emptyForm());
  };

  const removeEvent = (dayIdx: number, id: string) => {
    setEvents(prev => {
      const next = { ...prev, [dayIdx]: prev[dayIdx].filter(e => e.id !== id) };
      saveCustom(next);
      return next;
    });
    setDeleteId(null);
  };

  const day = DAYS_BASE[selected];
  const dayEvents = events[selected] || [];

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1px solid rgba(200,180,140,.15)",
    background: "rgba(255,255,255,.04)", color: "#e8d8b8",
    fontSize: 14, fontFamily: "inherit", outline: "none",
  };

  return (
    <div style={{ padding: "28px 0 40px" }}>
      {/* Header */}
      <div style={{ padding: "0 20px 20px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 300, color: "#e8d8b8", letterSpacing: 1 }}>📅 Agenda da Semana</h2>
          <p style={{ fontSize: 13, color: "#6a5a48", marginTop: 4 }}>22 a 28 de março</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          marginTop: 4, padding: "9px 16px", borderRadius: 12,
          border: "1px solid rgba(200,170,100,.4)",
          background: "linear-gradient(135deg,rgba(200,170,100,.15),rgba(180,140,80,.06))",
          color: "#C8A55C", fontSize: 13, fontWeight: 600, cursor: "pointer",
          fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
        }}>
          + Novo
        </button>
      </div>

      {/* Day pills */}
      <div style={{ padding: "0 16px 24px", overflowX: "auto", display: "flex", gap: 8 }}>
        {DAYS_BASE.map((d, i) => {
          const isActive = i === selected;
          const count = (events[i] || []).length;
          return (
            <button key={i} onClick={() => setSelected(i)} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "10px 14px", borderRadius: 14, cursor: "pointer", minWidth: 52, flexShrink: 0,
              border: `1px solid ${isActive ? "rgba(200,170,100,.5)" : "rgba(200,180,140,.1)"}`,
              background: isActive
                ? "linear-gradient(135deg,rgba(200,170,100,.18),rgba(180,140,80,.08))"
                : "rgba(255,255,255,.025)",
              transition: "all .2s", fontFamily: "inherit",
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
                color: isActive ? "#C8A55C" : "#7a6a58" }}>{d.label}</span>
              <span style={{ fontSize: 18, fontWeight: 600, color: isActive ? "#e8d8b8" : "#a09078", marginTop: 2 }}>{d.date}</span>
              <div style={{ width: 5, height: 5, borderRadius: "50%", marginTop: 5,
                background: count > 0 ? (isActive ? "#C8A55C" : "rgba(200,180,140,.3)") : "transparent" }} />
            </button>
          );
        })}
      </div>

      {/* Day detail */}
      <div style={{ padding: "0 16px" }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#c4b498", marginBottom: 16, letterSpacing: 0.5 }}>
          {day.full}
        </div>

        {dayEvents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px",
            border: "1px dashed rgba(200,180,140,.1)", borderRadius: 16, color: "#5a4a38", fontSize: 14 }}>
            Sem eventos agendados
            <div style={{ marginTop: 12 }}>
              <button onClick={() => setShowModal(true)} style={{
                padding: "8px 18px", borderRadius: 10, border: "1px solid rgba(200,170,100,.3)",
                background: "rgba(200,170,100,.08)", color: "#C8A55C", fontSize: 13,
                cursor: "pointer", fontFamily: "inherit",
              }}>+ Adicionar evento</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {dayEvents.map(ev => (
              <div key={ev.id} style={{ display: "flex", alignItems: "stretch", borderRadius: 14, overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,.25)", position: "relative" }}>
                <div style={{ width: 5, background: ev.color, flexShrink: 0 }} />
                <div style={{ flex: 1, padding: "14px 16px",
                  background: "rgba(255,255,255,.03)", border: "1px solid rgba(200,180,140,.07)",
                  borderLeft: "none", borderRadius: "0 14px 14px 0",
                  display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                    background: ev.color + "22", border: `1px solid ${ev.color}40`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                    {ev.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#e8d8b8",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {ev.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#C8A55C",
                        background: "rgba(200,165,92,.1)", padding: "2px 8px", borderRadius: 6,
                        border: "1px solid rgba(200,165,92,.2)" }}>
                        {ev.start} → {ev.end}
                      </span>
                      {ev.location && <span style={{ fontSize: 12, color: "#7a6a58" }}>📍 {ev.location}</span>}
                    </div>
                  </div>
                  {ev.custom && (
                    <button onClick={() => setDeleteId(ev.id)} style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      border: "1px solid rgba(200,80,60,.25)", background: "rgba(200,80,60,.08)",
                      color: "#C8553D", cursor: "pointer", fontSize: 14,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>×</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {dayEvents.length > 0 && (
          <div style={{ marginTop: 16, fontSize: 12, color: "#5a4a38", textAlign: "right" }}>
            {dayEvents.length} {dayEvents.length === 1 ? "evento" : "eventos"} neste dia
          </div>
        )}

        {/* ── REMINDERS SECTION ── */}
        <Reminders userCodeId={userCodeId} />
      </div>

      {/* ── ADD MODAL ── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,.7)", display: "flex", alignItems: "flex-end",
          justifyContent: "center" }}
          onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setForm(emptyForm()); } }}>
          <div style={{ width: "100%", maxWidth: 480,
            background: "linear-gradient(160deg,#232018,#1e1a14)",
            border: "1px solid rgba(200,180,140,.12)", borderRadius: "20px 20px 0 0",
            padding: "24px 20px 36px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: "#8a7a60", letterSpacing: 3, textTransform: "uppercase", fontWeight: 600 }}>Novo evento</div>
                <div style={{ fontSize: 15, color: "#c4b498", marginTop: 3 }}>{day.full}</div>
              </div>
              <button onClick={() => { setShowModal(false); setForm(emptyForm()); }} style={{
                width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(200,180,140,.15)",
                background: "rgba(200,180,140,.06)", color: "#a09078", cursor: "pointer", fontSize: 18,
              }}>×</button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#8a7a60", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 6 }}>
                Nome *
              </label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Reunião de célula" style={inputStyle} />
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: "#8a7a60", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 6 }}>
                  Início
                </label>
                <input type="time" value={form.start} onChange={e => setForm(p => ({ ...p, start: e.target.value }))}
                  style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: "#8a7a60", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 6 }}>
                  Fim
                </label>
                <input type="time" value={form.end} onChange={e => setForm(p => ({ ...p, end: e.target.value }))}
                  style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#8a7a60", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 6 }}>
                Local (opcional)
              </label>
              <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                placeholder="Ex: Igreja, Casa, Online…" style={inputStyle} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#8a7a60", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 8 }}>
                Ícone
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {ICON_OPTIONS.map(ic => (
                  <button key={ic} onClick={() => setForm(p => ({ ...p, icon: ic }))} style={{
                    width: 38, height: 38, borderRadius: 10, fontSize: 18, cursor: "pointer",
                    border: `1px solid ${form.icon === ic ? "rgba(200,170,100,.6)" : "rgba(200,180,140,.12)"}`,
                    background: form.icon === ic ? "rgba(200,170,100,.15)" : "rgba(255,255,255,.03)",
                  }}>{ic}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: "#8a7a60", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 8 }}>
                Cor
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {COLOR_OPTIONS.map(c => (
                  <button key={c.bg} onClick={() => setForm(p => ({ ...p, color: c.bg, textColor: c.text }))} style={{
                    width: 36, height: 36, borderRadius: 10, background: c.bg, cursor: "pointer",
                    border: `2px solid ${form.color === c.bg ? "#e8d8b8" : "transparent"}`,
                    boxShadow: form.color === c.bg ? "0 0 0 1px rgba(200,180,140,.3)" : "none",
                  }} />
                ))}
              </div>
            </div>

            {form.name && (
              <div style={{ marginBottom: 20, padding: "12px 14px", borderRadius: 12,
                background: "rgba(255,255,255,.025)", border: "1px solid rgba(200,180,140,.08)",
                display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: form.color + "22", border: `1px solid ${form.color}40`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  {form.icon}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e8d8b8" }}>{form.name}</div>
                  <div style={{ fontSize: 12, color: "#7a6a58", marginTop: 2 }}>
                    {form.start} → {form.end}{form.location ? ` · ${form.location}` : ""}
                  </div>
                </div>
                <div style={{ width: 4, height: "100%", minHeight: 36, borderRadius: 4, background: form.color, marginLeft: "auto", flexShrink: 0 }} />
              </div>
            )}

            <button onClick={addEvent} disabled={!form.name.trim()} style={{
              width: "100%", padding: "13px", borderRadius: 12,
              cursor: form.name.trim() ? "pointer" : "not-allowed",
              background: form.name.trim()
                ? "linear-gradient(135deg,rgba(200,170,100,.3),rgba(180,140,80,.15))"
                : "rgba(200,180,140,.05)",
              color: form.name.trim() ? "#e8d8b8" : "#5a4a38",
              fontSize: 15, fontWeight: 600, fontFamily: "inherit",
              border: `1px solid ${form.name.trim() ? "rgba(200,170,100,.4)" : "rgba(200,180,140,.08)"}`,
            }}>
              Adicionar evento
            </button>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#232018", border: "1px solid rgba(200,80,60,.2)",
            borderRadius: 16, padding: "24px 20px", maxWidth: 320, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#e8d8b8", marginBottom: 8 }}>Remover evento?</div>
            <div style={{ fontSize: 13, color: "#7a6a58", marginBottom: 20 }}>Esta ação não pode ser desfeita.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{
                flex: 1, padding: "10px", borderRadius: 10, border: "1px solid rgba(200,180,140,.15)",
                background: "rgba(200,180,140,.06)", color: "#a09078", cursor: "pointer", fontFamily: "inherit", fontSize: 14,
              }}>Cancelar</button>
              <button onClick={() => removeEvent(selected, deleteId)} style={{
                flex: 1, padding: "10px", borderRadius: 10, border: "1px solid rgba(200,80,60,.3)",
                background: "rgba(200,80,60,.12)", color: "#e07060", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600,
              }}>Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
