import { supabase } from "@/integrations/supabase/client";
import type { DetectedTopic, PersonalNote } from "@/components/agent/types";
import type { Edge } from "@xyflow/react";

export interface LiveSessionRow {
  id: string;
  user_code_id: string;
  device_id: string;
  title: string;
  transcript: string;
  topics: DetectedTopic[];
  personal_notes: PersonalNote[];
  layout: { positions?: Record<string, { x: number; y: number }>; edges?: Edge[] };
  status: "recording" | "paused" | "stopped";
  elapsed_seconds: number;
  command: { type: "pause" | "resume" | "stop" | "add_note"; payload?: any; ts: number } | null;
  resume_of: string | null;
  started_at: string;
  updated_at: string;
}

/** Identifica de forma estável o "navegador atual" (para distinguir gravador vs espelho). */
const DEVICE_KEY = "etheu.deviceId";
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `dev-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export interface LiveSnapshot {
  title?: string;
  transcript?: string;
  topics?: DetectedTopic[];
  personal_notes?: PersonalNote[];
  layout?: any;
  status?: "recording" | "paused" | "stopped";
  elapsed_seconds?: number;
  resume_of?: string | null;
}

/** Cria/atualiza a sessão ao vivo do código (1 por code). */
export async function pushLiveSession(
  userCodeId: string,
  deviceId: string,
  snap: LiveSnapshot,
): Promise<void> {
  const payload: any = {
    user_code_id: userCodeId,
    device_id: deviceId,
    updated_at: new Date().toISOString(),
    ...snap,
  };
  const { error } = await supabase
    .from("live_sessions")
    .upsert(payload, { onConflict: "user_code_id" });
  if (error) console.warn("[liveSync] upsert", error);
}

/** Encerra (remove) a sessão ao vivo deste código. */
export async function clearLiveSession(userCodeId: string): Promise<void> {
  await supabase.from("live_sessions").delete().eq("user_code_id", userCodeId);
}

/** Busca a sessão ao vivo atual deste código (se houver). */
export async function fetchLiveSession(userCodeId: string): Promise<LiveSessionRow | null> {
  const { data } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("user_code_id", userCodeId)
    .maybeSingle();
  return (data as any) || null;
}

/** Envia um comando do espelho para o gravador (pause/resume/stop/add_note). */
export async function sendLiveCommand(
  userCodeId: string,
  cmd: { type: "pause" | "resume" | "stop" | "add_note"; payload?: any },
): Promise<void> {
  await supabase
    .from("live_sessions")
    .update({ command: { ...cmd, ts: Date.now() } })
    .eq("user_code_id", userCodeId);
}

/** Inscreve-se em mudanças realtime da sessão ao vivo deste código. */
export function subscribeLiveSession(
  userCodeId: string,
  onChange: (row: LiveSessionRow | null) => void,
): () => void {
  const channel = supabase
    .channel(`live-${userCodeId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "live_sessions",
        filter: `user_code_id=eq.${userCodeId}`,
      },
      (payload: any) => {
        if (payload.eventType === "DELETE") onChange(null);
        else onChange(payload.new as LiveSessionRow);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/** Debounce util para limitar upserts ao vivo. */
export function makeDebouncer(delayMs: number) {
  let t: any = null;
  let pending: (() => void) | null = null;
  return {
    schedule(fn: () => void) {
      pending = fn;
      if (t) return;
      t = setTimeout(() => {
        const f = pending;
        pending = null;
        t = null;
        f?.();
      }, delayMs);
    },
    flush() {
      if (pending) {
        pending();
        pending = null;
      }
      if (t) {
        clearTimeout(t);
        t = null;
      }
    },
  };
}
