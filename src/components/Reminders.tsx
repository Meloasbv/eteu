import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──
type RepeatOption = "never" | "daily" | "weekly" | "monthly";
type CategoryOption = "oracao" | "leitura" | "devocional" | "compromisso" | "outro";

type Reminder = {
  id: string;
  title: string;
  datetime: string; // ISO
  repeat: RepeatOption;
  category: CategoryOption;
  active: boolean;
  createdAt: string;
};

const CATEGORIES: { key: CategoryOption; label: string; icon: string }[] = [
  { key: "oracao", label: "Oração", icon: "🙏" },
  { key: "leitura", label: "Leitura", icon: "📖" },
  { key: "devocional", label: "Devocional", icon: "🔥" },
  { key: "compromisso", label: "Compromisso", icon: "📌" },
  { key: "outro", label: "Outro", icon: "📝" },
];

const REPEAT_OPTIONS: { key: RepeatOption; label: string }[] = [
  { key: "never", label: "Nunca" },
  { key: "daily", label: "Diário" },
  { key: "weekly", label: "Semanal" },
  { key: "monthly", label: "Mensal" },
];

const categoryIcon = (cat: CategoryOption) => CATEGORIES.find(c => c.key === cat)?.icon || "📝";

// ── Notification helpers ──
async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function scheduleNotification(reminder: Reminder) {
  if (!("serviceWorker" in navigator) || Notification.permission !== "granted") return;
  const delay = new Date(reminder.datetime).getTime() - Date.now();
  if (delay <= 0) return;

  navigator.serviceWorker.ready.then(reg => {
    reg.active?.postMessage({
      type: "SCHEDULE_NOTIFICATION",
      id: reminder.id,
      title: `${categoryIcon(reminder.category)} ${reminder.title}`,
      body: `Lembrete: ${reminder.title}`,
      delay,
    });
  });
}

function cancelNotification(id: string) {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready.then(reg => {
    reg.active?.postMessage({ type: "CANCEL_NOTIFICATION", id });
  });
}

// ── Component ──
export default function Reminders({ userCodeId }: { userCodeId: string }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showPermBanner, setShowPermBanner] = useState(false);
  const [toast, setToast] = useState("");

  // Form
  const [title, setTitle] = useState("");
  const [datetime, setDatetime] = useState("");
  const [repeat, setRepeat] = useState<RepeatOption>("never");
  const [category, setCategory] = useState<CategoryOption>("oracao");

  // Swipe
  const touchStartX = useRef(0);
  const [swipedId, setSwipedId] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }, []);

  // Load reminders
  useEffect(() => {
    const load = async () => {
      const { data, error } = await (supabase as any)
        .from("reminders")
        .select("*")
        .eq("user_code_id", userCodeId)
        .order("reminder_datetime", { ascending: true });
      if (error) { console.error(error); return; }
      if (data) {
        const mapped: Reminder[] = data.map((r: any) => ({
          id: r.id,
          title: r.title,
          datetime: r.reminder_datetime,
          repeat: r.repeat as RepeatOption,
          category: r.category as CategoryOption,
          active: r.active,
          createdAt: r.created_at,
        }));
        setReminders(mapped);
        // Reschedule active future reminders
        mapped.filter(r => r.active && new Date(r.datetime) > new Date()).forEach(scheduleNotification);
      }
    };
    load();
  }, [userCodeId]);

  const resetForm = () => {
    setTitle(""); setDatetime(""); setRepeat("never"); setCategory("oracao"); setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    // Default datetime = now + 1 hour
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    setDatetime(d.toISOString().slice(0, 16));
    setShowModal(true);
  };

  const openEdit = (r: Reminder) => {
    setTitle(r.title);
    setDatetime(new Date(r.datetime).toISOString().slice(0, 16));
    setRepeat(r.repeat);
    setCategory(r.category);
    setEditingId(r.id);
    setShowModal(true);
  };

  const saveReminder = async () => {
    if (!title.trim() || !datetime) return;

    // Check notification permission on first create
    if (!editingId && Notification.permission === "default") {
      setShowPermBanner(true);
    }

    const isoDatetime = new Date(datetime).toISOString();

    if (editingId) {
      // Update
      await (supabase as any).from("reminders").update({
        title: title.trim(),
        reminder_datetime: isoDatetime,
        repeat,
        category,
      }).eq("id", editingId);

      setReminders(prev => prev.map(r => r.id === editingId ? { ...r, title: title.trim(), datetime: isoDatetime, repeat, category } : r));
      cancelNotification(editingId);
      const updated = reminders.find(r => r.id === editingId);
      if (updated?.active) scheduleNotification({ ...updated, title: title.trim(), datetime: isoDatetime, repeat, category });
      showToast("Lembrete atualizado");
    } else {
      // Create
      const { data, error } = await (supabase as any).from("reminders").insert({
        user_code_id: userCodeId,
        title: title.trim(),
        reminder_datetime: isoDatetime,
        repeat,
        category,
      }).select().maybeSingle();

      if (error || !data) { showToast("Erro ao criar lembrete"); return; }
      const newR: Reminder = {
        id: data.id,
        title: data.title,
        datetime: data.reminder_datetime,
        repeat: data.repeat,
        category: data.category,
        active: data.active,
        createdAt: data.created_at,
      };
      setReminders(prev => [...prev, newR].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()));
      scheduleNotification(newR);
      showToast("Lembrete criado");
    }

    setShowModal(false);
    resetForm();
  };

  const toggleActive = async (id: string) => {
    const r = reminders.find(x => x.id === id);
    if (!r) return;
    const newActive = !r.active;
    setReminders(prev => prev.map(x => x.id === id ? { ...x, active: newActive } : x));
    await (supabase as any).from("reminders").update({ active: newActive }).eq("id", id);
    if (newActive) scheduleNotification(r);
    else cancelNotification(id);
  };

  const deleteReminder = async (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
    cancelNotification(id);
    await (supabase as any).from("reminders").delete().eq("id", id);
    setDeleteId(null);
    setSwipedId(null);
    showToast("Lembrete removido");
  };

  const handlePermission = async (allow: boolean) => {
    setShowPermBanner(false);
    if (allow) {
      const granted = await requestNotificationPermission();
      if (granted) {
        showToast("Notificações ativadas!");
        // Reschedule all active
        reminders.filter(r => r.active && new Date(r.datetime) > new Date()).forEach(scheduleNotification);
      } else {
        showToast("Permissão negada");
      }
    }
  };

  // Swipe handlers
  const onTouchStart = (id: string, e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setSwipedId(null);
  };
  const onTouchEnd = (id: string, e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 80) setSwipedId(id);
    else setSwipedId(null);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  const repeatLabel = (r: RepeatOption) => REPEAT_OPTIONS.find(o => o.key === r)?.label || "";

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1px solid rgba(200,180,140,.15)",
    background: "rgba(255,255,255,.04)", color: "#e8d8b8",
    fontSize: 14, fontFamily: "inherit", outline: "none",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle, appearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238a7a60' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: 32,
  };

  return (
    <div style={{ marginTop: 32 }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>🔔</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#c4b498", letterSpacing: 0.5 }}>Lembretes</span>
        </div>
        <button onClick={openCreate} style={{
          padding: "7px 14px", borderRadius: 10,
          border: "1px solid rgba(200,170,100,.4)",
          background: "linear-gradient(135deg,rgba(200,170,100,.15),rgba(180,140,80,.06))",
          color: "#C8A55C", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", gap: 5,
        }}>
          + Novo
        </button>
      </div>

      {/* Permission banner */}
      {showPermBanner && (
        <div style={{
          padding: "14px 16px", borderRadius: 14, marginBottom: 14,
          background: "linear-gradient(135deg,rgba(200,170,100,.12),rgba(180,140,80,.06))",
          border: "1px solid rgba(200,170,100,.25)",
        }}>
          <div style={{ fontSize: 14, color: "#e8d8b8", fontWeight: 600, marginBottom: 6 }}>
            🔔 Ative as notificações
          </div>
          <div style={{ fontSize: 13, color: "#8a7a60", marginBottom: 12 }}>
            Receba seus lembretes no horário certo, mesmo com o app fechado.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => handlePermission(true)} style={{
              flex: 1, padding: "9px", borderRadius: 10,
              background: "linear-gradient(135deg,rgba(200,170,100,.3),rgba(180,140,80,.15))",
              border: "1px solid rgba(200,170,100,.4)", color: "#e8d8b8",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>Ativar notificações</button>
            <button onClick={() => handlePermission(false)} style={{
              flex: 1, padding: "9px", borderRadius: 10,
              background: "rgba(200,180,140,.06)", border: "1px solid rgba(200,180,140,.12)",
              color: "#8a7a60", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}>Agora não</button>
          </div>
        </div>
      )}

      {/* Reminders list */}
      {reminders.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "30px 20px",
          border: "1px dashed rgba(200,180,140,.1)", borderRadius: 16,
          color: "#5a4a38", fontSize: 14,
        }}>
          Nenhum lembrete criado
          <div style={{ marginTop: 10 }}>
            <button onClick={openCreate} style={{
              padding: "8px 18px", borderRadius: 10, border: "1px solid rgba(200,170,100,.3)",
              background: "rgba(200,170,100,.08)", color: "#C8A55C", fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}>+ Criar lembrete</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {reminders.map(r => {
            const isSwiped = swipedId === r.id;
            const isPast = new Date(r.datetime) < new Date();
            const catInfo = CATEGORIES.find(c => c.key === r.category);
            return (
              <div key={r.id} style={{ position: "relative", overflow: "hidden", borderRadius: 14 }}>
                {/* Delete background on swipe */}
                {isSwiped && (
                  <div style={{
                    position: "absolute", right: 0, top: 0, bottom: 0, width: 70,
                    background: "rgba(200,80,60,.15)", display: "flex", alignItems: "center",
                    justifyContent: "center", borderRadius: "0 14px 14px 0",
                  }}>
                    <button onClick={() => deleteReminder(r.id)} style={{
                      width: 40, height: 40, borderRadius: "50%", border: "none",
                      background: "rgba(200,80,60,.2)", color: "#e07060",
                      cursor: "pointer", fontSize: 18,
                    }}>🗑️</button>
                  </div>
                )}

                <div
                  onTouchStart={e => onTouchStart(r.id, e)}
                  onTouchEnd={e => onTouchEnd(r.id, e)}
                  onClick={() => !isSwiped && openEdit(r)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: 14,
                    background: "rgba(255,255,255,.03)",
                    border: `1px solid rgba(200,180,140,${r.active ? ".1" : ".05"})`,
                    opacity: r.active ? 1 : 0.5,
                    transform: isSwiped ? "translateX(-70px)" : "translateX(0)",
                    transition: "transform .2s ease, opacity .2s",
                    cursor: "pointer",
                  }}
                >
                  {/* Category icon */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: "rgba(200,170,100,.08)", border: "1px solid rgba(200,170,100,.15)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                  }}>
                    {catInfo?.icon || "📝"}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600, color: "#e8d8b8",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>{r.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600, color: "#C8A55C",
                        background: "rgba(200,165,92,.1)", padding: "2px 8px", borderRadius: 6,
                        border: "1px solid rgba(200,165,92,.2)",
                      }}>
                        {formatTime(r.datetime)}
                      </span>
                      <span style={{ fontSize: 11, color: "#7a6a58" }}>
                        {formatDate(r.datetime)}
                      </span>
                      {r.repeat !== "never" && (
                        <span style={{ fontSize: 11, color: "#6a5a48" }}>🔁 {repeatLabel(r.repeat)}</span>
                      )}
                      {isPast && r.active && (
                        <span style={{ fontSize: 10, color: "#C8553D" }}>vencido</span>
                      )}
                    </div>
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleActive(r.id); }}
                    style={{
                      width: 42, height: 24, borderRadius: 12, flexShrink: 0,
                      border: "none", cursor: "pointer", position: "relative",
                      background: r.active ? "rgba(200,170,100,.35)" : "rgba(200,180,140,.1)",
                      transition: "background .2s",
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%",
                      background: r.active ? "#C8A55C" : "#5a4a38",
                      position: "absolute", top: 3,
                      left: r.active ? 21 : 3,
                      transition: "left .2s, background .2s",
                    }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE/EDIT MODAL ── */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,.7)", display: "flex",
          alignItems: "flex-end", justifyContent: "center",
        }} onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); resetForm(); } }}>
          <div style={{
            width: "100%", maxWidth: 480,
            background: "linear-gradient(160deg,#232018,#1e1a14)",
            border: "1px solid rgba(200,180,140,.12)", borderRadius: "20px 20px 0 0",
            padding: "24px 20px 36px", maxHeight: "90vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: "#8a7a60", letterSpacing: 3, textTransform: "uppercase", fontWeight: 600 }}>
                  {editingId ? "Editar lembrete" : "Novo lembrete"}
                </div>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }} style={{
                width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(200,180,140,.15)",
                background: "rgba(200,180,140,.06)", color: "#a09078", cursor: "pointer", fontSize: 18,
              }}>×</button>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#8a7a60", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 6 }}>
                Título *
              </label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Oração da manhã" style={inputStyle} />
            </div>

            {/* Date/time */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#8a7a60", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 6 }}>
                Data e hora *
              </label>
              <input type="datetime-local" value={datetime} onChange={e => setDatetime(e.target.value)}
                style={inputStyle} />
            </div>

            {/* Repeat */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#8a7a60", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 6 }}>
                Repetição
              </label>
              <select value={repeat} onChange={e => setRepeat(e.target.value as RepeatOption)} style={selectStyle}>
                {REPEAT_OPTIONS.map(o => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: "#8a7a60", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 8 }}>
                Categoria
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CATEGORIES.map(c => (
                  <button key={c.key} onClick={() => setCategory(c.key)} style={{
                    padding: "8px 14px", borderRadius: 10, fontSize: 13, cursor: "pointer",
                    fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
                    border: `1px solid ${category === c.key ? "rgba(200,170,100,.5)" : "rgba(200,180,140,.12)"}`,
                    background: category === c.key ? "rgba(200,170,100,.15)" : "rgba(255,255,255,.03)",
                    color: category === c.key ? "#e8d8b8" : "#8a7a60",
                  }}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              {editingId && (
                <button onClick={() => { setShowModal(false); setDeleteId(editingId); resetForm(); }} style={{
                  padding: "13px 16px", borderRadius: 12, border: "1px solid rgba(200,80,60,.3)",
                  background: "rgba(200,80,60,.08)", color: "#e07060", fontSize: 14,
                  cursor: "pointer", fontFamily: "inherit",
                }}>🗑️</button>
              )}
              <button onClick={saveReminder} disabled={!title.trim() || !datetime} style={{
                flex: 1, padding: "13px", borderRadius: 12,
                cursor: title.trim() && datetime ? "pointer" : "not-allowed",
                background: title.trim() && datetime
                  ? "linear-gradient(135deg,rgba(200,170,100,.3),rgba(180,140,80,.15))"
                  : "rgba(200,180,140,.05)",
                color: title.trim() && datetime ? "#e8d8b8" : "#5a4a38",
                fontSize: 15, fontWeight: 600, fontFamily: "inherit",
                border: `1px solid ${title.trim() && datetime ? "rgba(200,170,100,.4)" : "rgba(200,180,140,.08)"}`,
              }}>
                {editingId ? "Salvar" : "Criar lembrete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,.7)", display: "flex",
          alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div style={{
            background: "#232018", border: "1px solid rgba(200,80,60,.2)",
            borderRadius: 16, padding: "24px 20px", maxWidth: 320, width: "100%", textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#e8d8b8", marginBottom: 8 }}>Remover lembrete?</div>
            <div style={{ fontSize: 13, color: "#7a6a58", marginBottom: 20 }}>Esta ação não pode ser desfeita.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{
                flex: 1, padding: "10px", borderRadius: 10, border: "1px solid rgba(200,180,140,.15)",
                background: "rgba(200,180,140,.06)", color: "#a09078", cursor: "pointer", fontFamily: "inherit", fontSize: 14,
              }}>Cancelar</button>
              <button onClick={() => deleteReminder(deleteId)} style={{
                flex: 1, padding: "10px", borderRadius: 10, border: "1px solid rgba(200,80,60,.3)",
                background: "rgba(200,80,60,.12)", color: "#e07060", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600,
              }}>Remover</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
          background: "#232018", border: "1px solid rgba(200,180,140,.15)",
          borderRadius: 12, padding: "10px 20px", color: "#c4b498", fontSize: 13,
          zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,.4)",
        }}>{toast}</div>
      )}
    </div>
  );
}
