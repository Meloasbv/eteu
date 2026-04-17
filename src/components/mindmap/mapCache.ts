// In-memory LRU cache for saved mind maps to make re-opens instant.
import type { Database } from "@/integrations/supabase/types";

type MindMapRow = Database["public"]["Tables"]["mind_maps"]["Row"];

const MAX = 8;
const cache = new Map<string, MindMapRow>();
const inflight = new Map<string, Promise<MindMapRow | null>>();

export function getCachedMap(id: string): MindMapRow | undefined {
  const v = cache.get(id);
  if (v) {
    cache.delete(id);
    cache.set(id, v); // bump LRU
  }
  return v;
}

export function setCachedMap(id: string, row: MindMapRow) {
  if (cache.has(id)) cache.delete(id);
  cache.set(id, row);
  if (cache.size > MAX) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
}

export function getInflight(id: string) {
  return inflight.get(id);
}

export function setInflight(id: string, p: Promise<MindMapRow | null>) {
  inflight.set(id, p);
  p.finally(() => inflight.delete(id));
}

export function invalidateMap(id: string) {
  cache.delete(id);
  inflight.delete(id);
}
