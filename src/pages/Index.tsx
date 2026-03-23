import { useState, useEffect, useCallback, useRef } from "react";
import WeekSchedule from "@/components/WeekSchedule";
import BibleNotes from "@/components/BibleNotes";

// ── DATA ──────────────────────────────────────────────────────────────────────

const WEEKS = [
  {week:1,dates:"24/01 a 30/01",days:[{day:"Sábado",r:["Gn. 1–7","Jó 1–5"]},{day:"Domingo",r:["Gn. 8–13","Jó 6–11"]},{day:"Segunda",r:["Gn. 14–16","Jó 12–18"]},{day:"Terça",r:["Gn. 17–20","Jó 19–24"]},{day:"Quarta",r:["Gn. 21–25","Jó 25–30"]},{day:"Quinta",r:["Gn. 26–31","Jó 31–35"]},{day:"Sexta",r:["Gn. 32–37","Jó 36–42"]}]},
  {week:2,dates:"31/01 a 06/02",days:[{day:"Sábado",r:["Gn. 38–47"]},{day:"Domingo",r:["Gn. 48–50","Ex. 1–11"]},{day:"Segunda",r:["Ex. 12–21","Lv. 1–3"]},{day:"Terça",r:["Ex. 22–30","Lv. 4–6"]},{day:"Quarta",r:["Ex. 31–40","Lv. 7–10"]},{day:"Quinta",r:["Lv. 11–21","Nm. 1–5"]},{day:"Sexta",r:["Lv. 22–27","Nm. 6–10"]}]},
  {week:3,dates:"07/02 a 13/02",days:[{day:"Sábado",r:["Nm. 11–22","Sl. 90"]},{day:"Domingo",r:["Nm. 23–36"]},{day:"Segunda",r:["Dt. 1–14"]},{day:"Terça",r:["Dt. 15–24"]},{day:"Quarta",r:["Dt. 25–34","Sl. 91"]},{day:"Quinta",r:["Js. 1–11"]},{day:"Sexta",r:["Js. 12–21"]}]},
  {week:4,dates:"14/02 a 20/02",days:[{day:"Sábado",r:["Js. 22–24","Jz. 1–5"]},{day:"Domingo",r:["Jz. 6–12"]},{day:"Segunda",r:["Jz. 13–21"]},{day:"Terça",r:["Rt. 1–4","I Sm 1–7"]},{day:"Quarta",r:["I Sm 8–16","Sl. 7, 27, 31, 34, 52"]},{day:"Quinta",r:["I Sm 17–20","Sl. 11, 59"]},{day:"Sexta",r:["I Sm 21–24"]}]},
  {week:5,dates:"21/02 a 27/02",days:[{day:"Sábado",r:["I Sm. 25–27","Sl. 56, 120, 140–142","Sl. 17, 35, 54, 63"]},{day:"Domingo",r:["I Sm. 28–31","Sl. 121, 123–125"]},{day:"Segunda",r:["Sl. 128–130","II Sm. 1–4","Sl. 19, 21"]},{day:"Terça",r:["I Cr. 1–2","Sl. 6, 8–10, 14, 16"]},{day:"Quarta",r:["Sl. 43–45, 49","Sl. 84–85, 87"]},{day:"Quinta",r:["I Cr. 3–6","Sl. 73, 77–78","Sl. 102–104"]},{day:"Sexta",r:["Sl. 81, 88, 92–93","I Cr. 7–10"]}]},
  {week:6,dates:"28/02 a 06/03",days:[{day:"Sábado",r:["II Sm. 5","I Cr. 11–12","Sl. 106, 107, 133"]},{day:"Domingo",r:["I Cr. 13–16","Sl. 1, 2, 15, 22–24"]},{day:"Segunda",r:["Sl. 47, 68","Sl. 89, 96, 100–101","Sl. 105, 132"]},{day:"Terça",r:["II Sm. 6–9; I Cr. 17","Sl. 25, 29, 33, 36, 39"]},{day:"Quarta",r:["I Cr. 18–19","Sl. 20, 50, 53, 60, 75","II Sm. 10"]},{day:"Quinta",r:["I Cr. 20","Sl. 65–67, 69–70"]},{day:"Sexta",r:["II Sm. 11–18","Sl. 32, 51, 86, 122"]}]},
  {week:7,dates:"07/03 a 13/03",days:[{day:"Sábado",r:["Sl. 3–4, 12–13, 28, 55","Sl. 26, 40, 58, 61–62, 64"]},{day:"Domingo",r:["II Sm. 19–23","Sl. 5, 18, 38, 41, 42, 57"]},{day:"Segunda",r:["Sl. 30, 95, 97–99","II Sm. 24","I Cr. 21–22"]},{day:"Terça",r:["I Cr. 23–29","Sl. 108–110"]},{day:"Quarta",r:["Sl. 127, 131, 138–139","Sl. 143–145"]},{day:"Quinta",r:["Sl. 111–118","I Rs. 1–2","Sl. 119:1–80"]},{day:"Sexta",r:["I Rs. 3–4","Sl. 37, 71, 72, 94","Ct. 1–8"]}]},
  {week:8,dates:"14/03 a 20/03",days:[{day:"Sábado",r:["II Cr. 1–3","Sl. 119:81–176"]},{day:"Domingo",r:["Pv. 1–9"]},{day:"Segunda",r:["Pv. 10–18","II Cr. 4–7"]},{day:"Terça",r:["Pv. 19–24","I Rs. 5–6"]},{day:"Quarta",r:["Sl. 134, 136, 146–150","I Rs. 7–8","Pv. 25–31"]},{day:"Quinta",r:["I Rs. 9","II Cr. 8"]},{day:"Sexta",r:["Ec. 1–12"]}]},
  {week:9,dates:"21/03 a 27/03",days:[{day:"Sábado",r:["I Rs. 10–14","II Cr. 9–11","Sl. 82–83"]},{day:"Domingo",r:["I Rs. 15–16","II Cr. 12–19"]},{day:"Segunda",r:["I Rs. 17–22","II Cr. 20–23","Jonas 1–2"]},{day:"Terça",r:["Obadias","II Rs. 1–4","II Cr. 25–26"]},{day:"Quarta",r:["II Rs. 5–13","II Cr. 24"]},{day:"Quinta",r:["Jonas 3–4","II Rs. 14–15","II Cr. 25–26"]},{day:"Sexta",r:["Is. 1–8","Amós 1–3"]}]},
  {week:10,dates:"28/03 a 03/04",days:[{day:"Sábado",r:["Is. 9–12","Amós 4–9"]},{day:"Domingo",r:["Miqueias 1–7","II Cr. 27"]},{day:"Segunda",r:["II Cr. 28","Is. 13–22"]},{day:"Terça",r:["Is. 23–27","II Rs. 16–18"]},{day:"Quarta",r:["Os. 1–4","II Cr. 29–31"]},{day:"Quinta",r:["Os. 5–7","Sl. 48","Is. 28–34"]},{day:"Sexta",r:["Os. 8–14"]}]},
  {week:11,dates:"04/04 a 10/04",days:[{day:"Sábado",r:["Is. 35–41","Sl. 76"]},{day:"Domingo",r:["Is. 42–50","II Rs. 19"]},{day:"Segunda",r:["Sl. 46, 80, 135","Is. 51–56"]},{day:"Terça",r:["Is. 57–66"]},{day:"Quarta",r:["II Rs. 20–23","Naum 1–3","II Cr. 32–33"]},{day:"Quinta",r:["II Cr. 34–35","Sofonias 1–3","Jr. 1–5"]},{day:"Sexta",r:["Jr. 6–17"]}]},
  {week:12,dates:"11/04 a 17/04",days:[{day:"Sábado",r:["Jr. 18–28"]},{day:"Domingo",r:["Jr. 29–38"]},{day:"Segunda",r:["Jr. 39–45","Sl. 74, 79"]},{day:"Terça",r:["Habacuque 1–3","II Rs. 24–25","II Cr. 36"]},{day:"Quarta",r:["Jr. 46–52","Lm. 1–5"]},{day:"Quinta",r:["Ez. 1–12"]},{day:"Sexta",r:["Ez. 13–23"]}]},
  {week:13,dates:"18/04 a 24/04",days:[{day:"Sábado",r:["Ez. 24–33"]},{day:"Domingo",r:["Ez. 34–44"]},{day:"Segunda",r:["Ez. 45–48","Joel 1–3","Daniel 1–3"]},{day:"Terça",r:["Esdras 1–6","Sl. 137","Dn. 4–6"]},{day:"Quarta",r:["Dn. 7–12","Ageu 1–2","Zc. 1–2"]},{day:"Quinta",r:["Zc. 3–14"]},{day:"Sexta",r:["Ester 1–10"]}]},
  {week:14,dates:"25/04 a 01/05",days:[{day:"Sábado",r:["Esdras 7–10","Neemias 1–5"]},{day:"Domingo",r:["Neemias 6–13","Sl. 126"]},{day:"Segunda",r:["Mateus 1–3","Lucas 1–3","Malaquias 1–4"]},{day:"Terça",r:["Jo. 2–5","Lc. 4–5; Mc. 2","João 1; Marcos 1"]},{day:"Quarta",r:["Mt. 5–9","Lc. 6, 7, 11","Mt. 4; Mc. 3"]},{day:"Quinta",r:["Mt. 10–14","Lc. 8–9; Jo 6","Mc. 4–6"]},{day:"Sexta",r:["Mt. 15–18","Mc. 7–9","Jo. 7–8"]}]},
  {week:15,dates:"02/05 a 08/05",days:[{day:"Sábado",r:["Lc. 10, 12–17"]},{day:"Domingo",r:["João 9–12"]},{day:"Segunda",r:["Lc. 18–19","Mt. 19–21","Mc. 10–11"]},{day:"Terça",r:["Mt. 22–26","Mc. 12–14"]},{day:"Quarta",r:["Lc. 20","Jo. 13–16"]},{day:"Quinta",r:["Mt. 27","Jo. 17–19","Mc. 15"]},{day:"Sexta",r:["Mt. 28","Mc. 16","Lc. 21–24"]}]},
  {week:16,dates:"09/05 a 15/05",days:[{day:"Sábado",r:["Jo. 20–21","Atos 1–6"]},{day:"Domingo",r:["Atos 7–16"]},{day:"Segunda",r:["Tiago 1–5","I Ts. 1–5"]},{day:"Terça",r:["Gl. 1–6","I Co. 1–4"]},{day:"Quarta",r:["Atos 17–19"]},{day:"Quinta",r:["II Ts. 1–3"]},{day:"Sexta",r:["I Co. 5–14"]}]},
  {week:17,dates:"16/05 a 22/05",days:[{day:"Sábado",r:["I Co. 15–16","II Co. 1–6"]},{day:"Domingo",r:["II Co. 7–13","Rm. 1–3"]},{day:"Segunda",r:["Atos 20:1–3","Rm. 4–16"]},{day:"Terça",r:["Atos 20:4–38","Atos 21–23"]},{day:"Quarta",r:["Atos 24–28","Cl. 1–4","Filemom"]},{day:"Quinta",r:["Ef. 1–6","Tito 1–3"]},{day:"Sexta",r:["Fp. 1–4","I Tm. 1–6"]}]},
  {week:18,dates:"23/05 a 29/05",days:[{day:"Sábado",r:["I Pe. 1–5","Hb. 1–6"]},{day:"Domingo",r:["Hb. 7–13","II Pe 1–3"]},{day:"Segunda",r:["Judas","I João 1–5"]},{day:"Terça",r:["II Tm. 1–4","II e III João"]},{day:"Quarta",r:["Ap. 1–11"]},{day:"Quinta",r:["Ap. 12–22"]},{day:"Sexta",r:[]}]},
];

const DEVOTIONALS = [
  {
    period: "02/03 a 06/03",
    days: [
      { day: "Segunda", ref: "Hebreus 7:24", summary: "Jesus possui um sacerdócio eterno e imutável — ele sempre vive para interceder por nós." },
      { day: "Terça",   ref: "Salmos 40:6",  summary: "Deus não deseja apenas rituais, mas ouvidos atentos e corações dispostos a obedecer." },
      { day: "Quarta",  ref: "Romanos 1:26", summary: "Reflexão sobre as consequências de abandonar a verdade de Deus e seguir desejos próprios." },
      { day: "Quinta",  ref: "Filipenses 3:8", summary: "Paulo considera tudo perda diante da grandeza de conhecer a Cristo — o maior tesouro." },
      { day: "Sexta",   ref: "2 Samuel 24:24", summary: "Davi se recusa a oferecer a Deus algo que não lhe custou nada. Verdadeira adoração tem preço." },
    ],
  },
  {
    period: "09/03 a 13/03",
    days: [
      { day: "Segunda", ref: "2 Timóteo 2:1",  summary: "Paulo exorta Timóteo a ser fortalecido pela graça que está em Cristo, não por forças próprias." },
      { day: "Terça",   ref: "Hebreus 7:25",   summary: "Cristo é capaz de salvar completamente todos que se aproximam de Deus por meio dele, pois intercede por nós." },
      { day: "Quarta",  ref: "Romanos 8:26",   summary: "O Espírito Santo nos ajuda em nossa fraqueza, intercedendo por nós com gemidos inexprimíveis." },
      { day: "Quinta",  ref: "Ezequiel 22:30", summary: "Deus busca alguém que se coloque na brecha — um intercessor que ore pelo povo e pela terra." },
      { day: "Sexta",   ref: "Tiago 5:16",     summary: "A oração fervorosa do justo tem grande poder — confessem uns aos outros e orem uns pelos outros." },
    ],
  },
  {
    period: "16/03 a 20/03",
    days: [
      { day: "Segunda", ref: "Mateus 5:3",  summary: "\"Bem-aventurados os pobres de espírito.\" O Reino começa com o reconhecimento da nossa necessidade de Deus." },
      { day: "Terça",   ref: "Mateus 5:14", summary: "\"Vós sois a luz do mundo.\" Somos chamados a iluminar o ambiente ao nosso redor com a vida de Cristo." },
      { day: "Quarta",  ref: "Mateus 6:6",  summary: "Orar em segredo, no quarto fechado, para o Pai que vê o que está escondido — intimidade genuína." },
      { day: "Quinta",  ref: "Mateus 6:33", summary: "\"Buscai primeiro o Reino de Deus.\" Quando priorizamos a Deus, tudo mais se ordena." },
      { day: "Sexta",   ref: "Mateus 7:24", summary: "O sábio constrói sobre a rocha — ouvir e praticar a Palavra nos dá fundamento inabalável." },
    ],
  },
  {
    period: "23/03 a 27/03",
    days: [
      { day: "Segunda", ref: "Cantares 2:16", summary: "\"O meu amado é meu e eu sou dele.\" A entrega mútua e o pertencimento no amor de Deus." },
      { day: "Terça",   ref: "Cantares 4:7",  summary: "\"Toda bela és, amada minha, e nenhum defeito há em ti.\" O olhar de Deus sobre sua amada — puro e sem condenação." },
      { day: "Quarta",  ref: "Cantares 4:9",  summary: "\"Roubaste o meu coração.\" A intimidade com Deus como um amor que nos transforma profundamente." },
      { day: "Quinta",  ref: "Cantares 8:6",  summary: "\"Forte como a morte é o amor.\" O amor de Deus é intenso, ardente e inabalável." },
      { day: "Sexta",   ref: "Cantares 8:7",  summary: "\"Nem muitas águas podem apagar o amor.\" Nada tem poder para separar-nos do amor de Deus." },
    ],
  },
  {
    period: "30/03 a 03/04",
    days: [
      { day: "Segunda", ref: "Êxodo 34:6-7",    summary: "Deus proclama seu próprio nome: compassivo, misericordioso, paciente, cheio de amor e fidelidade." },
      { day: "Terça",   ref: "Salmo 145:8-9",   summary: "O Senhor é cheio de graça e compaixão, lento para a ira e grande em amor para com todos." },
      { day: "Quarta",  ref: "Isaías 40:28",    summary: "O Eterno não se cansa nem se fatiga — sua sabedoria é insondável e sua força renova os cansados." },
      { day: "Quinta",  ref: "1 João 4:8",      summary: "\"Deus é amor.\" Não apenas que Deus ama, mas que a própria essência dele é amor." },
      { day: "Sexta",   ref: "Romanos 11:33",   summary: "\"Ó profundidade das riquezas...\" Uma doxologia diante da grandeza incomensurável de Deus." },
    ],
  },
];

const GUIDE_QUESTIONS = [
  { n: "1", q: "O que o texto diz?", detail: "Sobre o que ele fala? Qual o assunto central? Quais os assuntos secundários?" },
  { n: "2", q: "O que essa passagem quer dizer/contar pra mim?", detail: "O que ela significa? O que ela diz sobre Deus? E o que ela diz sobre o homem?" },
  { n: "3", q: "Como isso se aplica à minha vida?", detail: "Há algum mandamento a ser obedecido? Alguma promessa? Algum pecado a confessar? Alguma atitude a mudar?" },
];

const COLORS = ["#C8553D","#E88D67","#D4A574","#B8860B","#6B8E6B","#4A7C8C","#6B5B8A"];
const ABBREVS = ["Sáb","Dom","Seg","Ter","Qua","Qui","Sex"];
const DAY_NAMES = ["Sábado","Domingo","Segunda","Terça","Quarta","Quinta","Sexta"];
const STORAGE_KEY = "bible-plan-2026";
const DEV_DAY_COLORS: Record<string, string> = {
  "Segunda": "#4A7C8C",
  "Terça":   "#6B5B8A",
  "Quarta":  "#C8553D",
  "Quinta":  "#B8860B",
  "Sexta":   "#6B8E6B",
};

// Map JS getDay() (0=Sun) to our day index (0=Sat)
const JS_DAY_TO_INDEX: Record<number, number> = { 6: 0, 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 };

function getTodayReading(checked: Record<string, boolean>) {
  const now = new Date();
  // Plan start: Saturday Jan 24, 2026
  const planStart = new Date(2026, 0, 24); // month is 0-indexed
  const diffMs = now.getTime() - planStart.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0 || diffDays >= 18 * 7) return null;
  const weekIdx = Math.floor(diffDays / 7);
  const dayIdx = diffDays % 7;
  const week = WEEKS[weekIdx];
  if (!week) return null;
  const day = week.days[dayIdx];
  if (!day || !day.r.length) return null;
  const isDone = !!checked[`${weekIdx}-${dayIdx}`];
  return { weekIdx, dayIdx, week, day, isDone };
}

// ── Dashboard helper components ───────────────────────────────────────────────

function DashSection({ title, subtitle, description, children }: {
  title: string; subtitle: string; description: string; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        fontSize: 10, letterSpacing: 3, textTransform: "uppercase",
        color: "#7a6230", fontWeight: 600, marginBottom: 4,
      }}>
        {title}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "#e8d8b8", marginBottom: 2 }}>{subtitle}</div>
      {description && (
        <div style={{ fontSize: 12, color: "#6a5a48", marginBottom: 14, lineHeight: 1.5 }}>{description}</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function DashCard({ icon, title, subtitle, onClick, accent }: {
  icon: string; title: string; subtitle: string; onClick: () => void; accent: string;
}) {
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "16px 16px", borderRadius: 14, cursor: "pointer",
      background: "rgba(255,255,255,.025)",
      border: "1px solid rgba(200,180,140,.08)",
      transition: "all .2s", position: "relative", overflow: "hidden",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.05)"; e.currentTarget.style.borderColor = accent + "40"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.025)"; e.currentTarget.style.borderColor = "rgba(200,180,140,.08)"; }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg,${accent},transparent)`, opacity: 0.4,
      }} />
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: accent + "15", border: `1px solid ${accent}30`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#e8d8b8" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: "#7a6a58", marginTop: 2 }}>{subtitle}</div>}
      </div>
      <span style={{ fontSize: 18, color: "#5a4a38", flexShrink: 0 }}>›</span>
    </div>
  );
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export default function BiblePlan() {
  const [tab, setTab] = useState<"home" | "leitura" | "devocional" | "agenda" | "anotacoes">("home");
  const [activeWeek, setActiveWeek] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [expandedDev, setExpandedDev] = useState<string | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [notesTitle, setNotesTitle] = useState("📝 Anotações");
  const playerRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    try { const d = localStorage.getItem(STORAGE_KEY); if (d) setChecked(JSON.parse(d)); } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(checked)); } catch {}
  }, [checked]);

  const toggle = useCallback((wi: number, di: number) => {
    setChecked(prev => ({ ...prev, [`${wi}-${di}`]: !prev[`${wi}-${di}`] }));
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }, []);

  const weekProg = useCallback((wi: number) => {
    let t = 0, d = 0;
    WEEKS[wi].days.forEach((day, di) => { if (day.r.length) { t++; if (checked[`${wi}-${di}`]) d++; } });
    return t ? d / t : 0;
  }, [checked]);

  const totalProg = useCallback(() => {
    let t = 0, d = 0;
    WEEKS.forEach((w, wi) => w.days.forEach((day, di) => { if (day.r.length) { t++; if (checked[`${wi}-${di}`]) d++; } }));
    return t ? d / t : 0;
  }, [checked]);

  const prog = totalProg();
  const wp = weekProg(activeWeek);
  const cw = WEEKS[activeWeek];
  const circ = 2 * Math.PI * 22;
  const todayReading = getTodayReading(checked);

  const baseStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "linear-gradient(160deg,#1a1510 0%,#2a2218 40%,#1e1a14 100%)",
    fontFamily: "'Georgia', serif",
    color: "#e8dcc8",
  };

  const toggleMusic = useCallback(() => {
    const iframe = playerRef.current;
    if (!iframe) return;
    if (musicPlaying) {
      iframe.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    } else {
      iframe.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    }
    setMusicPlaying(!musicPlaying);
  }, [musicPlaying]);

  return (
    <div style={baseStyle}>
      {/* Hidden YouTube player */}
      <iframe
        ref={playerRef}
        src="https://www.youtube.com/embed/juWsw7-IuaE?enablejsapi=1&autoplay=0&loop=1&playlist=juWsw7-IuaE"
        allow="autoplay"
        style={{ position: "absolute", width: 0, height: 0, border: "none", opacity: 0, pointerEvents: "none" }}
        title="Background music"
      />

      {/* Floating music button */}
      <button onClick={toggleMusic} style={{
        position: "fixed", bottom: 20, left: 20, zIndex: 100,
        width: 48, height: 48, borderRadius: "50%",
        border: `1px solid ${musicPlaying ? "rgba(107,142,107,.5)" : "rgba(200,180,140,.3)"}`,
        background: musicPlaying
          ? "linear-gradient(135deg,rgba(107,142,107,.2),rgba(90,122,90,.1))"
          : "linear-gradient(135deg,rgba(200,170,100,.15),rgba(180,140,80,.06))",
        color: musicPlaying ? "#6B8E6B" : "#C8A55C",
        cursor: "pointer", fontSize: 20,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 16px rgba(0,0,0,.4)",
        transition: "all .3s ease",
      }}>
        {musicPlaying ? "⏸" : "🎵"}
      </button>
      {/* ── HEADER ── */}
      <div style={{ padding: "32px 24px 20px", textAlign: "center", borderBottom: "1px solid rgba(200,180,140,.08)" }}>
        <p style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#8a7a60", marginBottom: 8, fontWeight: 600 }}>
          Fascinação • 2026A
        </p>
        <h1 style={{ fontSize: "clamp(24px,5vw,36px)", fontWeight: 300, color: "#e8d8b8", letterSpacing: 1, marginBottom: 20 }}>
          {tab === "home" ? "Leitura Bíblica Cronológica" : tab === "leitura" ? "📖 Plano de Leitura" : tab === "devocional" ? "🔥 Devocional" : tab === "agenda" ? "📅 Agenda da Semana" : notesTitle}
        </h1>
        {/* Overall progress */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 24 }}>
          <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: "rotate(-90deg)" }}>
            <defs>
              <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C8A55C"/><stop offset="100%" stopColor="#6B8E6B"/>
              </linearGradient>
            </defs>
            <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(200,180,140,0.1)" strokeWidth="3"/>
            <circle cx="26" cy="26" r="22" fill="none" stroke="url(#pg)" strokeWidth="3"
              strokeDasharray={`${prog * circ} ${circ}`} strokeLinecap="round"
              style={{ transition: "stroke-dasharray .6s ease" }}/>
          </svg>
          <div>
            <div style={{ fontSize: 22, fontWeight: 600, color: "#e8d8b8" }}>{Math.round(prog * 100)}%</div>
            <div style={{ fontSize: 12, color: "#8a7a60", letterSpacing: 1, textTransform: "uppercase" }}>Progresso total</div>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
          {([
            { key: "home" as const, label: "🏠 Início" },
            { key: "leitura" as const, label: "📖 Leitura" },
            { key: "devocional" as const, label: "🔥 Devocional" },
            { key: "agenda" as const, label: "📅 Agenda" },
            { key: "anotacoes" as const, label: "📝 Anotações" },
          ]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "9px 20px", borderRadius: 24,
              border: `1px solid ${tab === t.key ? "rgba(200,170,100,.5)" : "rgba(200,180,140,.15)"}`,
              background: tab === t.key ? "linear-gradient(135deg,rgba(200,170,100,.18),rgba(180,140,80,.08))" : "rgba(200,180,140,.04)",
              color: tab === t.key ? "#e8d8b8" : "#a09078",
              fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              fontWeight: tab === t.key ? 600 : 400, letterSpacing: 0.5,
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── HOME DASHBOARD ── */}
      {tab === "home" && (
        <div style={{ padding: "24px 16px 40px", maxWidth: 700, margin: "0 auto" }}>

          {/* ── Plano de Leitura ── */}
          <DashSection title="Plano de leitura" subtitle="Cronologia Bíblica" description="Leia a Bíblia na ordem em que os eventos aconteceram ao longo da história">
            <DashCard icon="📖" title="Leitura Cronológica" subtitle={`${Math.round(prog * 100)}% concluído · Semana ${activeWeek + 1}`} onClick={() => setTab("leitura")} accent="#C8A55C" />
          </DashSection>

          {/* ── Vida Espiritual ── */}
          <DashSection title="Vida espiritual" subtitle="Devocionais da Semana" description="Reflexões diárias para aprofundar sua caminhada com Deus">
            {DEVOTIONALS.slice(0, 2).map((dv, i) => (
              <DashCard key={i} icon="🕯️" title={`Semana ${i + 1}`} subtitle={dv.period} onClick={() => setTab("devocional")} accent="#6B5B8A" />
            ))}
          </DashSection>

          {/* ── Organização ── */}
          <DashSection title="Organização" subtitle="Agenda de Leituras" description="Calendário das 18 semanas com os textos programados para cada dia">
            <DashCard icon="📅" title="Semana atual" subtitle={`Sem. ${activeWeek + 1} · ${WEEKS[activeWeek].dates}`} onClick={() => setTab("agenda")} accent="#4A7C8C" />
            {activeWeek + 1 < WEEKS.length && (
              <DashCard icon="⏳" title="Próxima semana" subtitle={`Sem. ${activeWeek + 2} · ${WEEKS[activeWeek + 1].dates}`} onClick={() => { setActiveWeek(activeWeek + 1); setTab("leitura"); }} accent="#8a7a60" />
            )}
          </DashSection>

          {/* ── Caderno de Estudo ── */}
          <DashSection title="Caderno de estudo" subtitle="Anotações" description="">
            <DashCard icon="📢" title="Track Proclamadores" subtitle="" onClick={() => setTab("anotacoes")} accent="#C8A55C" />
            <DashCard icon="📚" title="Aulas" subtitle="" onClick={() => setTab("anotacoes")} accent="#4A7C8C" />
          </DashSection>

        </div>
      )}

      {/* ── LEITURA TAB ── */}
      {tab === "leitura" && (
        <>
          {/* Today's reading card */}
          {todayReading && (
            <div style={{ padding: "20px 16px 8px" }}>
              <div
                onClick={() => {
                  setActiveWeek(todayReading.weekIdx);
                  if (!todayReading.isDone) toggle(todayReading.weekIdx, todayReading.dayIdx);
                }}
                style={{
                  background: todayReading.isDone
                    ? "linear-gradient(135deg,rgba(107,142,107,.12),rgba(90,122,90,.06))"
                    : "linear-gradient(135deg,rgba(200,170,100,.1),rgba(180,140,80,.04))",
                  border: `1px solid ${todayReading.isDone ? "rgba(107,142,107,.3)" : "rgba(200,170,100,.3)"}`,
                  borderRadius: 16, padding: "18px 20px", cursor: "pointer",
                  position: "relative", overflow: "hidden",
                }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 3,
                  background: todayReading.isDone
                    ? "linear-gradient(90deg,#6B8E6B,transparent)"
                    : "linear-gradient(90deg,#C8A55C,transparent)",
                  opacity: 0.7, borderRadius: "16px 16px 0 0",
                }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{todayReading.isDone ? "✅" : "📖"}</span>
                    <div>
                      <div style={{
                        fontSize: 11, letterSpacing: 2, textTransform: "uppercase",
                        color: todayReading.isDone ? "#6B8E6B" : "#C8A55C",
                        fontWeight: 700,
                      }}>
                        Leitura de Hoje
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#e8d8b8", marginTop: 2 }}>
                        {todayReading.day.day} — Semana {todayReading.week.week}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    border: todayReading.isDone ? "none" : "2px solid rgba(200,170,100,.35)",
                    background: todayReading.isDone ? "linear-gradient(135deg,#6B8E6B,#5a7a5a)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {todayReading.isDone && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {todayReading.day.r.map((r, ri) => (
                    <span key={ri} style={{
                      display: "inline-block", padding: "5px 12px", borderRadius: 8,
                      fontSize: 13, fontWeight: 500,
                      background: todayReading.isDone ? "rgba(107,142,107,.12)" : "rgba(200,170,100,.1)",
                      color: todayReading.isDone ? "#8aaa8a" : "#d4c4a8",
                      border: `1px solid ${todayReading.isDone ? "rgba(107,142,107,.2)" : "rgba(200,170,100,.2)"}`,
                      textDecoration: todayReading.isDone ? "line-through" : "none",
                      opacity: todayReading.isDone ? 0.7 : 1,
                    }}>{r}</span>
                  ))}
                </div>
                {!todayReading.isDone && (
                  <div style={{ fontSize: 11, color: "#8a7a60", marginTop: 10, textAlign: "right" }}>
                    Toque para marcar como lida
                  </div>
                )}
              </div>
            </div>
          )}
          <div style={{ padding: "16px 16px 12px", overflowX: "auto", display: "flex", gap: 8, borderBottom: "1px solid rgba(200,180,140,.06)" }}>
            {WEEKS.map((w, i) => (
              <button key={i} onClick={() => setActiveWeek(i)} style={{
                padding: "6px 14px", borderRadius: 20,
                border: `1px solid ${i === activeWeek ? "rgba(200,170,100,.5)" : weekProg(i) >= 1 ? "rgba(107,142,107,.4)" : "rgba(200,180,140,.15)"}`,
                background: i === activeWeek ? "linear-gradient(135deg,rgba(200,170,100,.15),rgba(180,140,80,.08))" : "rgba(200,180,140,.04)",
                color: i === activeWeek ? "#e8d8b8" : "#a09078",
                fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
                fontWeight: i === activeWeek ? 600 : 500, fontFamily: "inherit",
              }}>
                {w.week}{weekProg(i) >= 1 ? " ✓" : ""}
              </button>
            ))}
          </div>

          {/* Week header */}
          <div style={{ padding: "20px 24px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 600, color: "#e8d8b8" }}>Semana {cw.week}</div>
              <div style={{ fontSize: 13, color: "#8a7a60", marginTop: 2 }}>{cw.dates}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 80, height: 4, background: "rgba(200,180,140,.1)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${wp * 100}%`, height: "100%", borderRadius: 2, transition: "width .4s ease",
                  background: wp >= 1 ? "linear-gradient(90deg,#6B8E6B,#5a7a5a)" : "linear-gradient(90deg,#C8A55C,#B8953C)" }}/>
              </div>
              <span style={{ fontSize: 13, color: "#a09078", fontWeight: 500 }}>{Math.round(wp * 100)}%</span>
            </div>
          </div>

          {/* Nav arrows */}
          <div style={{ padding: "4px 24px 12px", display: "flex", gap: 8 }}>
            {([-1, 1] as const).map(delta => (
              <button key={delta} onClick={() => setActiveWeek(w => Math.max(0, Math.min(WEEKS.length - 1, w + delta)))}
                disabled={(delta === -1 && activeWeek === 0) || (delta === 1 && activeWeek === WEEKS.length - 1)}
                style={{
                  width: 40, height: 40, borderRadius: "50%",
                  border: "1px solid rgba(200,180,140,.15)", background: "rgba(200,180,140,.04)",
                  color: "#a09078", cursor: "pointer", fontSize: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: ((delta === -1 && activeWeek === 0) || (delta === 1 && activeWeek === WEEKS.length - 1)) ? 0.3 : 1,
                }}>
                {delta === -1 ? "‹" : "›"}
              </button>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ padding: "4px 16px 32px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
            {cw.days.map((day, di) => {
              if (!day.r.length) return null;
              const isDone = !!checked[`${activeWeek}-${di}`];
              const c = COLORS[di];
              return (
                <div key={di} onClick={() => toggle(activeWeek, di)} style={{
                  background: isDone ? "rgba(107,142,107,.06)" : "rgba(255,255,255,.025)",
                  border: `1px solid ${isDone ? "rgba(107,142,107,.2)" : "rgba(200,180,140,.08)"}`,
                  borderRadius: 14, padding: 20, cursor: "pointer", position: "relative", overflow: "hidden",
                  transition: "all .3s ease",
                }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "14px 14px 0 0",
                    background: isDone ? "linear-gradient(90deg,#6B8E6B,transparent)" : `linear-gradient(90deg,${c},transparent)`,
                    opacity: isDone ? 0.7 : 0.5 }}/>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 17, fontWeight: 600, color: isDone ? "#6B8E6B" : c }}>{ABBREVS[di]}</span>
                      <span style={{ fontSize: 12, color: "#6a5a48" }}>{day.r.length} {day.r.length === 1 ? "leitura" : "leituras"}</span>
                    </div>
                    <div style={{ width: 24, height: 24, borderRadius: "50%",
                      border: isDone ? "none" : "2px solid rgba(200,180,140,.25)",
                      background: isDone ? "linear-gradient(135deg,#6B8E6B,#5a7a5a)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isDone && <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap" }}>
                    {day.r.map((r, ri) => (
                      <span key={ri} style={{
                        display: "inline-block", padding: "5px 12px", borderRadius: 8,
                        fontSize: 13.5, margin: "3px 4px 3px 0",
                        background: isDone ? "rgba(107,142,107,.1)" : `${c}18`,
                        color: isDone ? "#8aaa8a" : "#d4c4a8",
                        border: `1px solid ${isDone ? "rgba(107,142,107,.15)" : c + "25"}`,
                        textDecoration: isDone ? "line-through" : "none",
                        opacity: isDone ? 0.7 : 1,
                      }}>{r}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── DEVOCIONAL TAB ── */}
      {tab === "devocional" && (
        <div style={{ padding: "24px 16px 40px" }}>
          {/* Guide questions card */}
          <div style={{
            background: "rgba(200,170,100,.06)", border: "1px solid rgba(200,170,100,.18)",
            borderRadius: 16, padding: "20px 20px", marginBottom: 28,
          }}>
            <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#C8A55C", marginBottom: 12, fontWeight: 600 }}>
              Perguntas — Guia
            </div>
            <p style={{ fontSize: 13, color: "#a09078", marginBottom: 16, lineHeight: 1.6 }}>
              Escreva as respostas em um caderno para meditar e orar profundamente a partir do que extraiu das escrituras.
            </p>
            {GUIDE_QUESTIONS.map(gq => (
              <div key={gq.n} style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg,rgba(200,170,100,.3),rgba(180,140,80,.15))",
                  border: "1px solid rgba(200,170,100,.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, color: "#C8A55C",
                }}>{gq.n}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#d4c4a8", marginBottom: 3 }}>{gq.q}</div>
                  <div style={{ fontSize: 12.5, color: "#8a7a60", lineHeight: 1.5 }}>{gq.detail}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Devotional weeks */}
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#8a7a60", marginBottom: 16, fontWeight: 600 }}>
            Mês Março
          </div>
          {DEVOTIONALS.map((week, wi) => (
            <div key={wi} style={{ marginBottom: 24 }}>
              {/* Period badge */}
              <div style={{
                display: "inline-flex", alignItems: "center", padding: "5px 14px",
                borderRadius: 20, border: "1px solid rgba(200,180,140,.2)",
                background: "rgba(200,180,140,.06)", marginBottom: 12,
                fontSize: 13, color: "#c4b498", fontWeight: 600, letterSpacing: 0.5,
              }}>
                {week.period}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
                {week.days.map((d, di) => {
                  const key = `dev-${wi}-${di}`;
                  const isOpen = expandedDev === key;
                  const c = DEV_DAY_COLORS[d.day] ?? "#C8A55C";
                  return (
                    <div key={di} onClick={() => setExpandedDev(isOpen ? null : key)} style={{
                      background: "rgba(255,255,255,.025)",
                      border: `1px solid ${isOpen ? c + "40" : "rgba(200,180,140,.08)"}`,
                      borderRadius: 12, padding: "16px", cursor: "pointer",
                      transition: "all .3s ease", position: "relative", overflow: "hidden",
                    }}>
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2,
                        background: `linear-gradient(90deg,${c},transparent)`, opacity: 0.5 }}/>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 11, color: c, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                            {d.day}
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: "#e8d8b8", marginBottom: isOpen ? 10 : 0 }}>
                            {d.ref}
                          </div>
                        </div>
                        <span style={{ fontSize: 18, color: "#6a5a48", flexShrink: 0, marginTop: 2 }}>
                          {isOpen ? "−" : "+"}
                        </span>
                      </div>
                      {isOpen && (
                        <div style={{
                          fontSize: 13.5, color: "#b0a090", lineHeight: 1.65,
                          paddingTop: 4, borderTop: `1px solid ${c}20`,
                        }}>
                          {d.summary}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── AGENDA TAB ── */}
      {tab === "agenda" && <WeekSchedule />}

      {/* ── ANOTAÇÕES TAB ── */}
      {tab === "anotacoes" && <BibleNotes onTitleChange={setNotesTitle} />}

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "8px 24px 28px", fontSize: 11, color: "#5a4a38", letterSpacing: 2, textTransform: "uppercase" }}>
        18 Semanas • Toda a Bíblia
      </div>

      {/* Save toast */}
      {saved && (
        <div style={{
          position: "fixed", bottom: 20, right: 20,
          background: "rgba(107,142,107,.9)", color: "#fff",
          padding: "10px 18px", borderRadius: 10, fontSize: 13, zIndex: 99,
        }}>✓ Progresso salvo</div>
      )}
    </div>
  );
}
