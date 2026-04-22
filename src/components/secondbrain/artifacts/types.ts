export type ArtifactType =
  | "reading"
  | "devotional_today"
  | "mindmap_list"
  | "mindmap_preview"
  | "brain_capture"
  | "exegese"
  | "note_saved"
  | "verse"
  | "verse_reader"
  | "answer"
  | "timer"
  | "loading";

export interface ArtifactPayload {
  type: ArtifactType;
  data: any;
}

export interface FocusMsg {
  id: string;
  role: "user" | "assistant";
  text?: string;
  artifact?: ArtifactPayload;
  timestamp: number;
}

export interface ArtifactCommonProps {
  data: any;
  userCodeId: string;
  sendAsUser: (text: string) => void;
}

// Devotional black/gold palette — keep in sync with FocusWorkspace
export const FOCUS_PALETTE = {
  bg: "#0a0805",
  surface: "#13100b",
  surfaceLight: "#1a1610",
  border: "#2a2218",
  borderSoft: "#1f1a13",
  primary: "#d4a94a",
  primarySoft: "#b8902f",
  text: "#ede4d0",
  textDim: "#8a7e66",
  textFaint: "#574d3d",
};
