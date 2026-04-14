export interface KeyConcept {
  id: string;
  title: string;
  description: string;
  category: "teologia" | "contexto" | "aplicação" | "personagem" | "lugar" | "evento";
  icon_suggestion?: string;
  bible_refs?: string[];
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
