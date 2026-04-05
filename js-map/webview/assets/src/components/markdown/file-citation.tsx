import type { GitCwd } from "protocol";
import type React from "react";

import { InlineChip } from "@/components/inline-chip";
import { getFileIcon } from "@/files/get-file-icon";

import { FileLink } from "./mention-chips";

function parseDirectiveLineNumber(
  value: number | string | undefined,
): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function FileCitationDirectiveComponent({
  cwd,
  path,
  lineRangeStart,
  lineRangeEnd,
}: {
  cwd: GitCwd | null;
  path?: string;
  lineRangeStart?: number | string;
  lineRangeEnd?: number | string;
}): React.ReactElement | null {
  if (typeof path !== "string" || path.trim().length === 0) {
    return null;
  }

  const fileName = path.split(/[\\/]/).pop() ?? path;
  const FileIcon = getFileIcon(path);

  return (
    <span className="my-4 block">
      <FileLink
        reference={{
          path,
          line: parseDirectiveLineNumber(lineRangeStart),
          endLine: parseDirectiveLineNumber(lineRangeEnd),
        }}
        label={fileName}
        tooltipText={path}
        cwd={cwd}
      >
        <InlineChip
          className="text-size-chat-sm flex! max-w-full items-center gap-1 rounded-full px-3 py-2"
          text={<span className="font-medium">{fileName}</span>}
          icon={FileIcon}
          interactive
        />
      </FileLink>
    </span>
  );
}
