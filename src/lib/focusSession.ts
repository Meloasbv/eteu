import { supabase } from "@/integrations/supabase/client";
import type { FocusMsg } from "@/components/secondbrain/artifacts/types";

const RESUME_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

export interface FocusSessionRow {
  id: string;
  user_code_id: string;
  messages: FocusMsg[];
  started_at: string;
  ended_at: string | null;
  focus_minutes: number;
  artifacts_used: string[];
  updated_at: string;
}

/**
 * Find a session updated in the last 2h for this user. Returns null if none.
 */
export async function findRecentSession(userCodeId: string): Promise<FocusSessionRow | null> {
  if (!userCodeId) return null;
  const cutoff = new Date(Date.now() - RESUME_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("focus_sessions" as any)
    .select("*")
    .eq("user_code_id", userCodeId)
    .is("ended_at", null)
    .gte("updated_at", cutoff)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[focusSession] find failed", error);
    return null;
  }
  return (data as unknown as FocusSessionRow) ?? null;
}

export async function createSession(userCodeId: string, messages: FocusMsg[]): Promise<string | null> {
  if (!userCodeId) return null;
  const artifacts = uniqueArtifactTypes(messages);
  const { data, error } = await supabase
    .from("focus_sessions" as any)
    .insert({
      user_code_id: userCodeId,
      messages: messages as any,
      artifacts_used: artifacts,
    })
    .select("id")
    .single();
  if (error) {
    console.warn("[focusSession] create failed", error);
    return null;
  }
  return (data as any)?.id ?? null;
}

export async function updateSession(sessionId: string, messages: FocusMsg[]) {
  if (!sessionId) return;
  const artifacts = uniqueArtifactTypes(messages);
  const { error } = await supabase
    .from("focus_sessions" as any)
    .update({
      messages: messages as any,
      artifacts_used: artifacts,
    })
    .eq("id", sessionId);
  if (error) console.warn("[focusSession] update failed", error);
}

export async function endSession(sessionId: string, focusMinutes: number) {
  if (!sessionId) return;
  await supabase
    .from("focus_sessions" as any)
    .update({
      ended_at: new Date().toISOString(),
      focus_minutes: focusMinutes,
    })
    .eq("id", sessionId);
}

function uniqueArtifactTypes(messages: FocusMsg[]): string[] {
  const set = new Set<string>();
  for (const m of messages) {
    if (m.artifact?.type) set.add(m.artifact.type);
  }
  return Array.from(set);
}
