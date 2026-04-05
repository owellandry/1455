export function formatModelDisplayName(displayName: string): string {
  // Only normalize GPT-style names; leave other display names unchanged.
  if (!displayName.trimStart().toLowerCase().startsWith("gpt")) {
    return displayName;
  }

  // Preserve whitespace while uppercasing "GPT" and title-casing later dash segments.
  return displayName
    .split(/(\s+)/)
    .map((token) => {
      if (token.trim().length === 0) {
        return token;
      }
      return token
        .split("-")
        .map((segment, index) => {
          if (segment.toLowerCase() === "gpt") {
            return "GPT";
          }
          if (index > 0 && segment.length > 0) {
            return `${segment[0]?.toUpperCase() ?? ""}${segment.slice(1)}`;
          }
          return segment;
        })
        .join("-");
    })
    .join("");
}
