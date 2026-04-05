import type { OpenInTarget, VSCodeFetchRequest } from "protocol";

type OpenInTargetsResponse = VSCodeFetchRequest["open-in-targets"]["response"];
export type OpenTargetOption = OpenInTargetsResponse["targets"][number];

export function getAvailableTargetOptions({
  targets,
  availableTargets,
  includeHiddenTargets = false,
}: {
  targets: Array<OpenTargetOption>;
  availableTargets: Array<OpenInTarget>;
  includeHiddenTargets?: boolean;
}): Array<OpenTargetOption> {
  const availableTargetSet = new Set(availableTargets);
  return targets.filter(
    (target) =>
      availableTargetSet.has(target.id) &&
      (includeHiddenTargets || !target.hidden),
  );
}

export function getPrimaryAvailableTarget({
  preferredTarget,
  targets,
  availableTargets,
  includeHiddenTargets = true,
}: {
  preferredTarget: OpenInTarget | null;
  targets: Array<OpenTargetOption>;
  availableTargets: Array<OpenInTarget>;
  includeHiddenTargets?: boolean;
}): OpenTargetOption | null {
  const availableOptions = getAvailableTargetOptions({
    targets,
    availableTargets,
    includeHiddenTargets,
  });
  if (availableOptions.length === 0) {
    return null;
  }
  if (!preferredTarget) {
    return availableOptions[0] ?? null;
  }
  return (
    availableOptions.find((target) => target.id === preferredTarget) ??
    availableOptions[0] ??
    null
  );
}
