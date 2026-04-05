export function ensureLength<T>(
  items: Array<T>,
  index: number,
  defaultValue: T,
): Array<T> {
  const missingCount = Math.max(index - items.length + 1, 0);
  if (missingCount === 0) {
    return items;
  }
  for (let i = 0; i < missingCount; i += 1) {
    items.push(defaultValue);
  }
  return items;
}
