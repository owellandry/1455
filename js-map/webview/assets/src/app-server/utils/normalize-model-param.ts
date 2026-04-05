export function normalizeModelParam(
  model: string | null | undefined,
): string | null {
  const trimmed = model?.trim();
  return trimmed ? trimmed : null;
}
