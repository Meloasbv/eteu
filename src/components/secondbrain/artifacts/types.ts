export type ArtifactType =
  | "reading"
  | "devotional_today"
  | "mindmap_list"
  | "mindmap_preview"
  | "brain_capture"
  | "exegese"
  | "note_saved"
  | "verse"
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

// Solid focus palette — keep in sync with FocusWorkspace
export const FOCUS_PALETTE = {
  bg: "#0B0F14",
  surface: "#11161D",
  surfaceLight: "#1A2129",
  border: "#1F2730",
  borderSoft: "#161C24",
  primary: "#00FF94",
  primarySoft: "#1DB954",
  text: "#E6EDF3",
  textDim: "#7A8A99",
  textFaint: "#4A5868",
};
