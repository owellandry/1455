import type { ChildProcessInfo } from "protocol";
import type React from "react";
import { useState } from "react";

import { useFetchFromVSCode } from "@/vscode-api";

import { DebugSection } from "./debug-section";

export function ChildProcessesSection(): React.ReactElement {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { data, isLoading } = useFetchFromVSCode("child-processes", {
    queryConfig: {
      enabled: isOpen,
      intervalMs: 1000,
    },
  });
  const processes: Array<ChildProcessInfo> = data?.processes ?? [];
  const sortedProcesses = [...processes].sort(compareProcesses);
  const processCount = sortedProcesses.length;

  return (
    <DebugSection
      title={
        isOpen
          ? `Descendant processes (${processCount})`
          : "Descendant processes"
      }
      storageKey="debug-child-processes"
      onToggle={setIsOpen}
      variant="global"
    >
      {!isOpen ? null : isLoading ? (
        <div className="text-token-description-foreground">
          Loading descendant processes…
        </div>
      ) : sortedProcesses.length === 0 ? (
        <div className="text-token-description-foreground">
          No descendant processes found.
        </div>
      ) : (
        <div className="flex flex-col">
          {sortedProcesses.map(
            (process): React.ReactElement => (
              <ChildProcessRow
                key={process.pid}
                pid={process.pid}
                parentPid={process.parentPid}
                depth={process.depth}
                kind={process.kind}
                command={process.command}
                ageSeconds={process.ageSeconds}
                rssKb={process.rssKb}
              />
            ),
          )}
        </div>
      )}
    </DebugSection>
  );
}

function ChildProcessRow({
  pid,
  parentPid,
  depth,
  kind,
  command,
  ageSeconds,
  rssKb,
}: {
  pid: number;
  parentPid: number;
  depth: number;
  kind: ChildProcessInfo["kind"];
  command: string;
  ageSeconds: number | null;
  rssKb: number | null;
}): React.ReactElement {
  const trimmedCommand = command.trim();
  const ageLabel = formatAge(ageSeconds);
  const rssLabel = formatRss(rssKb);

  return (
    <div className="flex flex-col gap-1 border-t border-token-border/50 py-2 first:border-none">
      <div className="flex items-center justify-between gap-2 text-xs text-token-description-foreground">
        <span>{`PID ${pid} | Parent ${parentPid} | Depth ${depth} | ${kind}`}</span>
        <span>
          {[rssLabel, ageLabel ? `Age ${ageLabel}` : null]
            .filter(Boolean)
            .join(" | ")}
        </span>
      </div>
      <div className="font-mono text-sm break-all">
        {trimmedCommand.length > 0 ? trimmedCommand : "(command unavailable)"}
      </div>
    </div>
  );
}

function compareProcesses(a: ChildProcessInfo, b: ChildProcessInfo): number {
  const rssA = a.rssKb ?? -1;
  const rssB = b.rssKb ?? -1;
  if (rssA !== rssB) {
    return rssB - rssA;
  }
  if (a.depth !== b.depth) {
    return a.depth - b.depth;
  }
  const ageA = a.ageSeconds ?? -1;
  const ageB = b.ageSeconds ?? -1;
  if (ageA !== ageB) {
    return ageB - ageA;
  }
  return a.pid - b.pid;
}

function formatAge(ageSeconds: number | null): string | null {
  if (ageSeconds == null) {
    return null;
  }
  if (!Number.isFinite(ageSeconds)) {
    return null;
  }
  const totalSeconds = Math.max(0, Math.floor(ageSeconds));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function formatRss(rssKb: number | null): string | null {
  if (rssKb == null || !Number.isFinite(rssKb)) {
    return null;
  }
  if (rssKb >= 1024 * 1024) {
    return `${(rssKb / (1024 * 1024)).toFixed(2)} GB`;
  }
  if (rssKb >= 1024) {
    return `${(rssKb / 1024).toFixed(1)} MB`;
  }
  return `${rssKb} KB`;
}
