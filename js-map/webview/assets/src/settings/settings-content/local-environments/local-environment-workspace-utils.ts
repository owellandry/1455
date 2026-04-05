import type { RepositoryTaskGroups } from "@/sidebar/use-repository-task-groups";
import { getProjectName } from "@/thread-layout/get-project-name";

export function getWorkspaceLabel(
  workspaceRoot: string,
  workspaceGroup: RepositoryTaskGroups | null,
): string {
  const fallbackName = getProjectName(workspaceRoot) ?? workspaceRoot;
  return workspaceGroup?.label ?? fallbackName;
}
