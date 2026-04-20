export type ThoughtCategory =
  | "teologia"
  | "cristologia"
  | "pneumatologia"
  | "exegese"
  | "contexto"
  | "aplicacao"
  | "escatologia"
  | "soteriologia";

export type ConceptType = "topic" | "highlight" | "verse";

export interface VerseRef {
  ref: string;
  context?: string;
  source_slide?: number;
}

export interface AuthorQuote {
  text: string;
  author: string;
  source_slide?: number;
}

export interface NoteSubsection {
  subtitle: string;
  points: string[];
  source_slides?: number[];
}

export interface ExpandedNote {
  core_idea: string;
  explanation?: string;
  affirmations?: string[];
  // verses can be either legacy string[] or new VerseRef[]
  verses: (string | VerseRef)[];
  application: string;
  impact_phrase: string;
  // New rich fields
  key_points?: string[];
  subsections?: NoteSubsection[];
  author_quotes?: AuthorQuote[];
}

export interface KeyConcept {
  id: string;
  title: string;
  description: string;
  category: ThoughtCategory | "personagem" | "lugar" | "evento";
  type?: ConceptType;
  icon_suggestion?: string;
  bible_refs?: string[];
  summary?: string;
  expanded_note?: ExpandedNote;
  child_highlights?: string[];
  child_verses?: string[];
  // PDF / source enrichment
  is_key?: boolean;
  page_ref?: number;
  source_slides?: number[];
  quotes?: string[];
  // Legacy StudyNote fields
  coreIdea?: string;
  keyPoints?: string[];
  practicalApplication?: string;
  impactPhrase?: string;
}

export interface HierarchyNode {
  label: string;
  children?: HierarchyNode[];
}

export interface StructuredNote {
  section_title: string;
  points: string[];
}

export interface AnalysisResult {
  main_theme: string;
  summary: string;
  key_concepts: KeyConcept[];
  hierarchy: {
    root: HierarchyNode;
  };
  keywords: string[];
  structured_notes: StructuredNote[];
}

// Category palette
export const categoryPalette: Record<string, { color: string; name: string }> = {
  teologia:       { color: "#c9a067", name: "TEOLOGIA" },
  cristologia:    { color: "#d4854a", name: "CRISTOLOGIA" },
  pneumatologia:  { color: "#c97a7a", name: "PNEUMATOLOGIA" },
  exegese:        { color: "#7ba3c9", name: "EXEGESE" },
  contexto:       { color: "#8b9e7a", name: "CONTEXTO" },
  aplicacao:      { color: "#b08db5", name: "APLICAÇÃO" },
  "aplicação":    { color: "#b08db5", name: "APLICAÇÃO" },
  escatologia:    { color: "#6a9c8a", name: "ESCATOLOGIA" },
  soteriologia:   { color: "#d4b87a", name: "SOTERIOLOGIA" },
  personagem:     { color: "#d4854a", name: "PERSONAGEM" },
  lugar:          { color: "#6a9c8a", name: "LUGAR" },
  evento:         { color: "#b08db5", name: "EVENTO" },
};

export function getCategoryColor(category?: string): string {
  return categoryPalette[category || "teologia"]?.color || "#c9a067";
}

export function getCategoryName(category?: string): string {
  return categoryPalette[category || "teologia"]?.name || "TEOLOGIA";
}

// Helper: extract just the reference string from VerseRef|string
export function verseRefString(v: string | VerseRef): string {
  return typeof v === "string" ? v : v.ref;
}

export function verseRefList(verses: (string | VerseRef)[] | undefined): string[] {
  return (verses || []).map(verseRefString);
}
