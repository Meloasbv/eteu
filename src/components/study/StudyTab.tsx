import NotebookList from "./NotebookList";

/**
 * Aba "Caderno" — agora dedicada exclusivamente à escrita/anotações.
 * O Mapa Mental foi removido da navegação principal (preservado no código,
 * acessível só por rota direta). Layout editorial papel/caderno.
 */
export default function StudyTab({ userCodeId }: { userCodeId: string }) {
  return (
    <div className="flex flex-col h-full">
      <NotebookList userCodeId={userCodeId} />
    </div>
  );
}
