import type { ReactNode } from "react";

import { FileIcon } from "@/components/file-icon";

export function LocalConversationArtifacts({
  onOpen,
  referencedFilePaths,
}: {
  onOpen: (path: string) => void;
  referencedFilePaths: Array<string>;
}): ReactNode {
  if (referencedFilePaths.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {referencedFilePaths.map((path) => (
        <LocalConversationArtifactsItem
          key={path}
          path={path}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

function LocalConversationArtifactsItem({
  onOpen,
  path,
}: {
  onOpen: (path: string) => void;
  path: string;
}): ReactNode {
  const [basename] = path.split("/").reverse();

  return (
    <button
      type="button"
      className="flex items-center gap-2 rounded-sm px-2 py-1 text-left text-base text-token-text-secondary hover:bg-token-foreground/5"
      onClick={(): void => {
        onOpen(path);
      }}
      title={path}
    >
      <FileIcon path={path} />
      <span className="truncate">{basename}</span>
    </button>
  );
}
