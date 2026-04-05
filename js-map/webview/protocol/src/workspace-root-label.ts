export function formatWorkspaceRootLabel({
  root,
  labels,
}: {
  root: string;
  labels: Record<string, string | undefined>;
}): string {
  const override = labels[root]?.trim();
  if (override) {
    return override;
  }
  const segments = root.split(/[/\\]+/).filter(Boolean);
  return segments[segments.length - 1] ?? root;
}
