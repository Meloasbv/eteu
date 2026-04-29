import type { AnalysisResult } from "@/components/mindmap/types";

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number; // ms desde início
  isFinal: boolean;
  topicId?: string;
}

export interface DetectedTopic {
  id: string;
  title: string;
  startTimestamp: number;
  endTimestamp?: number;
  segmentIds: string[];
  verses: string[];
  impactPhrases: string[];
  keyPoints: string[];
  /** Resumo curto (1-2 frases) gerado pela IA a partir do bloco bruto. */
  summary?: string;
  /** Keywords extraídas para auto-conexão entre blocos. */
  keywords?: string[];
  /** Texto bruto original capturado entre as pausas. */
  rawText?: string;
}

export interface PersonalNote {
  id: string;
  text: string;
  timestamp: number; // ms na sessão
  createdAt: string;
}

export type StudyFlowType =
  | "first_pass"
  | "deep_dive"
  | "memorize"
  | "review"
  | "teach";

export interface StudyFlowProgress {
  flow: StudyFlowType;
  currentStep: number;
  totalSteps: number;
  startedAt: string;
}

export interface StudySessionRow {
  id: string;
  user_code_id: string;
  title: string;
  duration_seconds: number;
  source_type: "live" | "upload" | "pdf";
  audio_url: string | null;
  full_transcript: string;
  topics: DetectedTopic[];
  generated_study: AnalysisResult | null;
  personal_notes: PersonalNote[];
  study_flow_progress: Record<string, StudyFlowProgress>;
  is_favorite: boolean;
  mind_map_id: string | null;
  is_public?: boolean;
  public_slug?: string | null;
  shared_at?: string | null;
  created_at: string;
  updated_at: string;
}

export const FLOW_META: Record<StudyFlowType, {
  icon: string; title: string; subtitle: string; minutes: number; steps: number;
}> = {
  first_pass: { icon: "👁️", title: "VISÃO GERAL", subtitle: "Percorra os tópicos principais com resumo e frases de impacto", minutes: 10, steps: 5 },
  deep_dive:  { icon: "🔬", title: "APROFUNDAMENTO", subtitle: "Estude cada tópico com notas completas, versículos e aplicações", minutes: 25, steps: 0 },
  memorize:   { icon: "🧠", title: "MEMORIZAÇÃO", subtitle: "Flashcards + quiz para fixar o conteúdo", minutes: 15, steps: 4 },
  review:     { icon: "📋", title: "REVISÃO RÁPIDA", subtitle: "Apenas os pontos-chave e versículos", minutes: 5, steps: 3 },
  teach:      { icon: "🎭", title: "PREPARAR PARA ENSINAR", subtitle: "Mapa mental + apresentação para você ensinar", minutes: 20, steps: 4 },
};
