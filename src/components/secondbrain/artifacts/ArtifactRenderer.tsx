import ReadingArtifact from "./ReadingArtifact";
import BrainCaptureArtifact from "./BrainCaptureArtifact";
import ExegeseArtifact from "./ExegeseArtifact";
import AnswerArtifact from "./AnswerArtifact";
import LoadingArtifact from "./LoadingArtifact";
import SaudacaoArtifact from "./SaudacaoArtifact";
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
    // Bloco 2 placeholders — render a friendly stub for now
    case "devotional_today":
    case "mindmap_list":
    case "mindmap_preview":
    case "note_saved":
    case "verse":
    case "timer":
      return (
        <SaudacaoArtifact
          data={{
            greeting:
              "Esta ferramenta ainda está sendo construída. Por enquanto, use os atalhos abaixo:",
          }}
          sendAsUser={sendAsUser}
        />
      );
    default:
      return null;
  }
}
