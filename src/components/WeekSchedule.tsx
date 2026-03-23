const WEEK_DAYS = [
  { label: "DOM", date: "22/mar" },
  { label: "SEG", date: "23/mar" },
  { label: "TER", date: "24/mar" },
  { label: "QUA", date: "25/mar" },
  { label: "QUI", date: "26/mar" },
  { label: "SEX", date: "27/mar" },
  { label: "SAB", date: "28/mar" },
];

type Evt = { name: string; start: number; end: number; location?: string; color: string; textColor: string };

const SCHEDULE: Evt[][] = [
  [{ name: "Culto", start: 19, end: 21, location: "Igreja", color: "#1a1a1a", textColor: "#ffffff" }],
  [
    { name: "Feriado", start: 9, end: 12, color: "#f0ece3", textColor: "#6a5a48" },
    { name: "Almoço", start: 12, end: 13, location: "Casa verde", color: "#c8dfc8", textColor: "#2a4a2a" },
    { name: "Tracks", start: 15.5, end: 17.5, color: "#7ecfe0", textColor: "#1a4a55" },
  ],
  [
    { name: "🌹 Cantares: Jornada do amor", start: 9, end: 12, color: "#a855f7", textColor: "#ffffff" },
    { name: "Almoço", start: 12, end: 13, location: "Casa verde", color: "#c8dfc8", textColor: "#2a4a2a" },
    { name: "Tracks", start: 15.5, end: 17.5, color: "#7ecfe0", textColor: "#1a4a55" },
    { name: "Turno", start: 18, end: 22, location: "Igreja", color: "#c8b820", textColor: "#3a3000" },
  ],
  [
    { name: "🌹 Cantares: Jornada do amor", start: 9, end: 12, color: "#a855f7", textColor: "#ffffff" },
    { name: "Laboratório", start: 17, end: 19, location: "Igreja", color: "#C8553D", textColor: "#ffffff" },
    { name: "Turno", start: 20, end: 22, location: "Igreja", color: "#c8b820", textColor: "#3a3000" },
  ],
  [
    { name: "🌹 Cantares: Jornada do amor", start: 9, end: 12, color: "#a855f7", textColor: "#ffffff" },
    { name: "Almoço", start: 12, end: 13, location: "Casa verde", color: "#c8dfc8", textColor: "#2a4a2a" },
    { name: "Turno", start: 18, end: 22, location: "Igreja", color: "#c8b820", textColor: "#3a3000" },
  ],
  [
    { name: "🌹 Cantares: Jornada do amor", start: 9, end: 12, color: "#a855f7", textColor: "#ffffff" },
    { name: "Almoço", start: 12, end: 13, location: "Casa verde", color: "#c8dfc8", textColor: "#2a4a2a" },
    { name: "Vigília", start: 22, end: 24, location: "Igreja", color: "#f9a8c9", textColor: "#5a1a35" },
  ],
  [],
];

const HOUR_START = 8;
const HOUR_END = 24;
const HOUR_H = 52;
const COL_W = 120;
const LABEL_W = 40;

function fmtHour(h: number) {
  const hh = Math.floor(h);
  const mm = (h % 1) * 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export default function WeekSchedule() {
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const totalH = (HOUR_END - HOUR_START) * HOUR_H;

  return (
    <div style={{ padding: "24px 0 40px" }}>
      <div style={{ padding: "0 20px 20px" }}>
        <h2 style={{ fontSize: 24, fontWeight: 300, color: "#e8d8b8", letterSpacing: 1 }}>
          📅 Agenda da Semana
        </h2>
        <p style={{ fontSize: 13, color: "#6a5a48", marginTop: 4 }}>22 a 28 de março</p>
      </div>

      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "75vh" }}>
        <div style={{ minWidth: LABEL_W + COL_W * 7, position: "relative" }}>
          {/* Header */}
          <div style={{
            display: "flex", position: "sticky", top: 0, zIndex: 10,
            background: "#1e1a14", borderBottom: "1px solid rgba(200,180,140,.1)",
          }}>
            <div style={{ width: LABEL_W, flexShrink: 0 }} />
            {WEEK_DAYS.map((d, i) => (
              <div key={i} style={{
                width: COL_W, flexShrink: 0, textAlign: "center",
                padding: "10px 4px",
                borderLeft: "1px solid rgba(200,180,140,.06)",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#a09078", textTransform: "uppercase" }}>
                  {d.label}
                </div>
                <div style={{ fontSize: 12, color: "#6a5a48", marginTop: 2 }}>{d.date}</div>
              </div>
            ))}
          </div>

          {/* Body */}
          <div style={{ display: "flex", position: "relative" }}>
            <div style={{ width: LABEL_W, flexShrink: 0, position: "relative", height: totalH }}>
              {hours.map(h => (
                <div key={h} style={{
                  position: "absolute", top: (h - HOUR_START) * HOUR_H,
                  width: "100%", textAlign: "right",
                  paddingRight: 8, fontSize: 11, color: "#6a5a48",
                  transform: "translateY(-6px)",
                }}>
                  {String(h).padStart(2, "0")}
                </div>
              ))}
            </div>

            {WEEK_DAYS.map((_, ci) => (
              <div key={ci} style={{
                width: COL_W, flexShrink: 0, position: "relative", height: totalH,
                borderLeft: "1px solid rgba(200,180,140,.06)",
              }}>
                {hours.map(h => (
                  <div key={h} style={{
                    position: "absolute", top: (h - HOUR_START) * HOUR_H,
                    width: "100%", height: 1,
                    background: "rgba(200,180,140,.06)",
                  }} />
                ))}

                {SCHEDULE[ci].map((ev, ei) => {
                  const top = (ev.start - HOUR_START) * HOUR_H;
                  const height = (ev.end - ev.start) * HOUR_H;
                  return (
                    <div key={ei} style={{
                      position: "absolute",
                      top: top + 2, left: 3, right: 3,
                      height: height - 4,
                      borderRadius: 8,
                      background: ev.color,
                      padding: "6px 8px",
                      overflow: "hidden",
                      boxShadow: "0 2px 8px rgba(0,0,0,.3)",
                      zIndex: 2,
                    }}>
                      <div style={{
                        fontSize: 11, fontWeight: 700,
                        color: ev.textColor, lineHeight: 1.3,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {ev.name}
                      </div>
                      <div style={{ fontSize: 10, color: ev.textColor, opacity: 0.75, marginTop: 2 }}>
                        {fmtHour(ev.start)}h às {fmtHour(ev.end)}h
                      </div>
                      {ev.location && height > 40 && (
                        <div style={{ fontSize: 10, color: ev.textColor, opacity: 0.6, marginTop: 1 }}>
                          ({ev.location})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
