import ReadingArtifact from "./ReadingArtifact";
import BrainCaptureArtifact from "./BrainCaptureArtifact";
import ExegeseArtifact from "./ExegeseArtifact";
import AnswerArtifact from "./AnswerArtifact";
import LoadingArtifact from "./LoadingArtifact";
import SaudacaoArtifact from "./SaudacaoArtifact";
import DevotionalTodayArtifact from "./DevotionalTodayArtifact";
import NoteArtifact from "./NoteArtifact";
import VerseArtifact from "./VerseArtifact";
import MindMapListArtifact from "./MindMapListArtifact";
import MindMapPreviewArtifact from "./MindMapPreviewArtifact";
import TimerArtifact from "./TimerArtifact";
import type { ArtifactPayload } from "./types";

interface Props {
  artifact: ArtifactPayload;
  userCodeId: string;
  sendAsUser: (text: string) => void;
}

export default function ArtifactRenderer({ artifact, userCodeId, sendAsUser }: Props) {
  const { type, data } = artifact;
  switch (type) {
    case "reading":
      return <ReadingArtifact data={data} sendAsUser={sendAsUser} />;
    case "brain_capture":
      return <BrainCaptureArtifact data={data} userCodeId={userCodeId} sendAsUser={sendAsUser} />;
    case "exegese":
      return <ExegeseArtifact data={data} sendAsUser={sendAsUser} />;
    case "answer":
      return <AnswerArtifact data={data} sendAsUser={sendAsUser} />;
    case "loading":
      return <LoadingArtifact data={data} />;
    case "devotional_today":
      return <DevotionalTodayArtifact data={data} sendAsUser={sendAsUser} />;
    case "note_saved":
      return <NoteArtifact data={data} userCodeId={userCodeId} sendAsUser={sendAsUser} />;
    case "verse":
      return <VerseArtifact data={data} sendAsUser={sendAsUser} />;
    case "mindmap_list":
      return <MindMapListArtifact data={data} userCodeId={userCodeId} sendAsUser={sendAsUser} />;
    case "mindmap_preview":
      return <MindMapPreviewArtifact data={data} userCodeId={userCodeId} sendAsUser={sendAsUser} />;
    case "timer":
      return <TimerArtifact data={data} sendAsUser={sendAsUser} />;
    default:
      return (
        <SaudacaoArtifact
          data={{ greeting: "Hmm, não consegui montar essa resposta. Tente reformular?" }}
          sendAsUser={sendAsUser}
        />
      );
  }
}
