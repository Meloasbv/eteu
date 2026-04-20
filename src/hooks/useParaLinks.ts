import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ParaKind = "project" | "area" | "resource" | "archive";
export type ParaStatus = "active" | "paused" | "done";
export type ParaEntityType =
  | "thought"
  | "note"
  | "mind_map"
  | "reminder"
  | "reading_day"
  | "devotional"
  | "favorite_verse";

export interface ParaItem {
  id: string;
  user_code_id: string;
  kind: ParaKind;
  title: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  deadline: string | null;
  status: ParaStatus;
  created_at: string;
  updated_at: string;
}

export interface ParaLink {
  id: string;
  user_code_id: string;
  para_id: string;
  entity_type: ParaEntityType;
  entity_id: string;
  entity_label: string | null;
  created_at: string;
}

export function useParaItems(userCodeId: string) {
  const [items, setItems] = useState<ParaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("para_items" as any)
      .select("*")
      .eq("user_code_id", userCodeId)
      .order("created_at", { ascending: false });
    setItems((data as any) || []);
    setLoading(false);
  }, [userCodeId]);

  useEffect(() => { reload(); }, [reload]);

  const create = async (patch: Partial<ParaItem> & { title: string; kind: ParaKind }) => {
    const { data, error } = await supabase
      .from("para_items" as any)
      .insert({ user_code_id: userCodeId, ...patch } as any)
      .select()
      .single();
    if (!error && data) setItems(prev => [data as any, ...prev]);
    return { data: data as any, error };
  };

  const update = async (id: string, patch: Partial<ParaItem>) => {
    const { data, error } = await supabase
      .from("para_items" as any)
      .update(patch as any)
      .eq("id", id)
      .select()
      .single();
    if (!error && data) setItems(prev => prev.map(p => (p.id === id ? (data as any) : p)));
    return { data: data as any, error };
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("para_items" as any).delete().eq("id", id);
    if (!error) setItems(prev => prev.filter(p => p.id !== id));
    return { error };
  };

  return { items, loading, reload, create, update, remove };
}

export function useParaLinks(userCodeId: string, paraId?: string) {
  const [links, setLinks] = useState<ParaLink[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!userCodeId) return;
    setLoading(true);
    let q = supabase.from("para_links" as any).select("*").eq("user_code_id", userCodeId);
    if (paraId) q = q.eq("para_id", paraId);
    const { data } = await q.order("created_at", { ascending: false });
    setLinks((data as any) || []);
    setLoading(false);
  }, [userCodeId, paraId]);

  useEffect(() => { reload(); }, [reload]);

  const link = async (paraId: string, entity_type: ParaEntityType, entity_id: string, entity_label?: string) => {
    const { data, error } = await supabase
      .from("para_links" as any)
      .upsert(
        { user_code_id: userCodeId, para_id: paraId, entity_type, entity_id, entity_label: entity_label || "" } as any,
        { onConflict: "para_id,entity_type,entity_id" } as any,
      )
      .select()
      .single();
    if (!error && data) setLinks(prev => [data as any, ...prev.filter(l => l.id !== (data as any).id)]);
    return { data: data as any, error };
  };

  const unlink = async (id: string) => {
    const { error } = await supabase.from("para_links" as any).delete().eq("id", id);
    if (!error) setLinks(prev => prev.filter(l => l.id !== id));
    return { error };
  };

  const unlinkByEntity = async (paraId: string, entity_type: ParaEntityType, entity_id: string) => {
    const { error } = await supabase
      .from("para_links" as any)
      .delete()
      .eq("para_id", paraId)
      .eq("entity_type", entity_type)
      .eq("entity_id", entity_id);
    if (!error) setLinks(prev => prev.filter(l => !(l.para_id === paraId && l.entity_type === entity_type && l.entity_id === entity_id)));
    return { error };
  };

  return { links, loading, reload, link, unlink, unlinkByEntity };
}
