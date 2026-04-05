/**
 * Emulates terminal-style carriage return handling so streamed output renders
 * in-place progress updates correctly.
 *
 * Vendored from `escape-carriage`:
 * https://github.com/theturtle32/escape-carriage
 */
export function escapeCarriageReturn(text: string): string {
  if (!text) {
    return "";
  }
  if (!/\r/.test(text)) {
    return text;
  }

  let escapedText = text.replace(/\r+\n/gm, "\n");
  while (/\r./.test(escapedText)) {
    escapedText = escapedText.replace(
      /^([^\r\n]*)\r+([^\r\n]+)/gm,
      (_, base: string, insert: string) => insert + base.slice(insert.length),
    );
  }

  return escapedText;
}

export function escapeCarriageReturnSafe(text: string): string {
  if (!text) {
    return "";
  }
  if (!/\r/.test(text)) {
    return text;
  }
  if (!/\n/.test(text)) {
    return escapeSingleLineSafe(text);
  }

  const escapedText = text.replace(/\r+\n/gm, "\n");
  const lastNewlineIndex = escapedText.lastIndexOf("\n");

  return (
    escapeCarriageReturn(escapedText.slice(0, lastNewlineIndex)) +
    "\n" +
    escapeSingleLineSafe(escapedText.slice(lastNewlineIndex + 1))
  );
}

function findLongestStringIndex(values: Array<string>): number {
  let longestIndex = 0;
  for (let index = 0; index < values.length; index += 1) {
    if (values[longestIndex].length <= values[index].length) {
      longestIndex = index;
    }
  }

  return longestIndex;
}

function escapeSingleLineSafe(text: string): string {
  if (!/\r/.test(text)) {
    return text;
  }

  let segments = text.split("\r");
  const escapedSegments: Array<string> = [];

  while (segments.length > 0) {
    const longestIndex = findLongestStringIndex(segments);
    escapedSegments.push(segments[longestIndex]);
    segments = segments.slice(longestIndex + 1);
  }

  return escapedSegments.join("\r");
}
