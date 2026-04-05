import type React from "react";
import { useState } from "react";

import { WorkspaceDirectoryTree } from "@/components/workspace-directory-tree";
import ChevronIcon from "@/icons/chevron.svg";
import { useFetchFromVSCode } from "@/vscode-api";

import { DebugRow } from "./debug-row";
import { DebugSection } from "./debug-section";

export function WorkspaceRootsSection(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [includeHidden, setIncludeHidden] = useState(false);
  const { data: workspaceRoots } = useFetchFromVSCode(
    "workspace-root-options",
    { queryConfig: { enabled: isOpen } },
  );
  const roots = workspaceRoots?.roots ?? [];
  const labels = workspaceRoots?.labels ?? {};

  return (
    <DebugSection
      title={"Project roots"}
      storageKey="debug-workspace-roots"
      onToggle={setIsOpen}
      variant="global"
      actions={
        !isOpen ? null : (
          <button
            type="button"
            className="rounded px-1.5 py-0.5 text-xs hover:bg-token-foreground/10"
            onClick={() => setIncludeHidden((current) => !current)}
          >
            {includeHidden ? "Hide dotfiles" : "Show dotfiles"}
          </button>
        )
      }
    >
      {!isOpen ? null : roots.length === 0 ? (
        <div className="text-token-description-foreground">
          No project roots
        </div>
      ) : (
        roots.map((root) => (
          <WorkspaceRootExplorer
            key={root}
            includeHidden={includeHidden}
            label={labels[root] ?? root}
            root={root}
          />
        ))
      )}
    </DebugSection>
  );
}

function WorkspaceRootExplorer({
  root,
  label,
  includeHidden,
}: {
  root: string;
  label: string;
  includeHidden: boolean;
}): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-t border-token-border/50 first:border-t-0">
      <DebugRow
        title={
          <span className="flex items-center gap-2">
            <ChevronIcon
              className="icon-2xs shrink-0 transition-transform duration-150"
              style={{ transform: `rotate(${isExpanded ? 0 : -90}deg)` }}
            />
            <span>{label}</span>
          </span>
        }
        subtitle={root}
        onClick={() => setIsExpanded((current) => !current)}
      />
      {!isExpanded ? null : (
        <div className="pb-1">
          <WorkspaceDirectoryTree includeHidden={includeHidden} root={root} />
        </div>
      )}
    </div>
  );
}
