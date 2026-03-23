import { useState } from "react";

type Evt = { name: string; start: string; end: string; location?: string; color: string; textColor: string; icon?: string };

const DAYS: { label: string; date: string; full: string; events: Evt[] }[] = [
  {
    label: "DOM", date: "22", full: "Domingo, 22 de março",
    events: [
      { name: "Culto", start: "19:00", end: "21:00", location: "Igreja", color: "#1a1a1a", textColor: "#ffffff", icon: "🙏" },
    ],
  },
  {
    label: "SEG", date: "23", full: "Segunda, 23 de março",
    events: [
      { name: "Feriado", start: "09:00", end: "12:00", color: "#f0ece3", textColor: "#6a5a48", icon: "🏖️" },
      { name: "Almoço", start: "12:00", end: "13:00", location: "Casa verde", color: "#c8dfc8", textColor: "#2a4a2a", icon: "🥗" },
      { name: "Tracks", start: "15:30", end: "17:30", color: "#7ecfe0", textColor: "#1a4a55", icon: "🎯" },
    ],
  },
  {
    label: "TER", date: "24", full: "Terça, 24 de março",
    events: [
      { name: "Cantares: Jornada do amor", start: "09:00", end: "12:00", color: "#a855f7", textColor: "#ffffff", icon: "🌹" },
      { name: "Almoço", start: "12:00", end: "13:00", location: "Casa verde", color: "#c8dfc8", textColor: "#2a4a2a", icon: "🥗" },
      { name: "Tracks", start: "15:30", end: "17:30", color: "#7ecfe0", textColor: "#1a4a55", icon: "🎯" },
      { name: "Turno", start: "18:00", end: "22:00", location: "Igreja", color: "#c8b820", textColor: "#2a2000", icon: "⛪" },
    ],
  },
  {
    label: "QUA", date: "25", full: "Quarta, 25 de março",
    events: [
      { name: "Cantares: Jornada do amor", start: "09:00", end: "12:00", color: "#a855f7", textColor: "#ffffff", icon: "🌹" },
      { name: "Laboratório", start: "17:00", end: "19:00", location: "Igreja", color: "#C8553D", textColor: "#ffffff", icon: "🔬" },
      { name: "Turno", start: "20:00", end: "22:00", location: "Igreja", color: "#c8b820", textColor: "#2a2000", icon: "⛪" },
    ],
  },
  {
    label: "QUI", date: "26", full: "Quinta, 26 de março",
    events: [
      { name: "Cantares: Jornada do amor", start: "09:00", end: "12:00", color: "#a855f7", textColor: "#ffffff", icon: "🌹" },
      { name: "Almoço", start: "12:00", end: "13:00", location: "Casa verde", color: "#c8dfc8", textColor: "#2a4a2a", icon: "🥗" },
      { name: "Turno", start: "18:00", end: "22:00", location: "Igreja", color: "#c8b820", textColor: "#2a2000", icon: "⛪" },
    ],
  },
  {
    label: "SEX", date: "27", full: "Sexta, 27 de março",
    events: [
      { name: "Cantares: Jornada do amor", start: "09:00", end: "12:00", color: "#a855f7", textColor: "#ffffff", icon: "🌹" },
      { name: "Almoço", start: "12:00", end: "13:00", location: "Casa verde", color: "#c8dfc8", textColor: "#2a4a2a", icon: "🥗" },
      { name: "Vigília", start: "22:00", end: "23:59", location: "Igreja", color: "#f9a8c9", textColor: "#5a1a35", icon: "🕯️" },
    ],
  },
  {
    label: "SAB", date: "28", full: "Sábado, 28 de março",
    events: [],
  },
];

export default function WeekSchedule() {
  const [selected, setSelected] = useState(1);
  const day = DAYS[selected];

  return (
    <div style={{ padding: "28px 0 40px" }}>
      {/* Header */}
      <div style={{ padding: "0 20px 20px" }}>
        <h2 style={{ fontSize: 24, fontWeight: 300, color: "#e8d8b8", letterSpacing: 1 }}>
          📅 Agenda da Semana
        </h2>
        <p style={{ fontSize: 13, color: "#6a5a48", marginTop: 4 }}>22 a 28 de março</p>
      </div>

      {/* Day selector pills */}
      <div style={{ padding: "0 16px 24px", overflowX: "auto", display: "flex", gap: 8 }}>
        {DAYS.map((d, i) => {
          const isActive = i === selected;
          const hasEvents = d.events.length > 0;
          return (
            <button key={i} onClick={() => setSelected(i)} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "10px 14px", borderRadius: 14, cursor: "pointer",
              border: `1px solid ${isActive ? "rgba(200,170,100,.5)" : "rgba(200,180,140,.1)"}`,
              background: isActive
                ? "linear-gradient(135deg,rgba(200,170,100,.18),rgba(180,140,80,.08))"
                : "rgba(255,255,255,.025)",
              minWidth: 52, flexShrink: 0, transition: "all .2s ease",
              fontFamily: "inherit",
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
                color: isActive ? "#C8A55C" : "#7a6a58" }}>
                {d.label}
              </span>
              <span style={{ fontSize: 18, fontWeight: 600, color: isActive ? "#e8d8b8" : "#a09078", marginTop: 2 }}>
                {d.date}
              </span>
              <div style={{
                width: 5, height: 5, borderRadius: "50%", marginTop: 5,
                background: hasEvents ? (isActive ? "#C8A55C" : "rgba(200,180,140,.3)") : "transparent",
              }} />
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      <div style={{ padding: "0 16px" }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#c4b498", marginBottom: 16, letterSpacing: 0.5 }}>
          {day.full}
        </div>

        {day.events.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "40px 20px",
            border: "1px dashed rgba(200,180,140,.1)", borderRadius: 16,
            color: "#5a4a38", fontSize: 14,
          }}>
            Sem eventos agendados
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {day.events.map((ev, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "stretch", gap: 0,
                borderRadius: 14, overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,.25)",
              }}>
                <div style={{ width: 5, background: ev.color, flexShrink: 0 }} />
                <div style={{
                  flex: 1, padding: "14px 16px",
                  background: "rgba(255,255,255,.03)",
                  border: "1px solid rgba(200,180,140,.07)",
                  borderLeft: "none", borderRadius: "0 14px 14px 0",
                  display: "flex", alignItems: "center", gap: 14,
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                    background: ev.color + "22",
                    border: `1px solid ${ev.color}40`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20,
                  }}>
                    {ev.icon ?? "📌"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 15, fontWeight: 600, color: "#e8d8b8",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {ev.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: ev.color === "#1a1a1a" ? "#a09078" : ev.color,
                        background: ev.color + "18",
                        padding: "2px 8px", borderRadius: 6,
                        border: `1px solid ${ev.color}30`,
                      }}>
                        {ev.start} → {ev.end}
                      </span>
                      {ev.location && (
                        <span style={{ fontSize: 12, color: "#7a6a58" }}>
                          📍 {ev.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {day.events.length > 0 && (
          <div style={{ marginTop: 16, fontSize: 12, color: "#5a4a38", textAlign: "right" }}>
            {day.events.length} {day.events.length === 1 ? "evento" : "eventos"} neste dia
          </div>
        )}
      </div>
    </div>
  );
}
