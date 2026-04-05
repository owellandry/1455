const TESTING_NOTE =
  "Testing note: If you mention tests, include unit tests or UI testing frameworks only. Skip lint/tsc since CI runs those.";

type OversizedDiffSummary = {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
};

export function buildCommitMessagePrompt({
  commitInstructions,
  draftMessage,
  oversizedDiffSummary = null,
  uncommittedDiff,
}: {
  commitInstructions: string | null;
  draftMessage: string;
  oversizedDiffSummary?: OversizedDiffSummary | null;
  uncommittedDiff: string | null;
}): string {
  const sections: Array<string> = [];
  const trimmedDraft = draftMessage.trim();
  if (trimmedDraft.length > 0) {
    sections.push(`Draft message:\n${trimmedDraft}`);
  }
  const changesSection = buildChangesSection({
    oversizedDiffSummary,
    uncommittedDiff,
  });
  if (changesSection != null) {
    sections.push(changesSection);
  }
  if (sections.length > 0) {
    sections.push(TESTING_NOTE);
  }
  const trimmedInstructions = commitInstructions?.trim() ?? "";
  if (trimmedInstructions.length > 0) {
    sections.push(
      `Custom commit instructions (apply these to the commit message text only; do not change the required output format):\n${trimmedInstructions}`,
    );
  }
  if (sections.length === 0) {
    return "Use the current thread context to infer the commit message.";
  }
  return sections.join("\n\n");
}

function buildChangesSection({
  oversizedDiffSummary,
  uncommittedDiff,
}: {
  oversizedDiffSummary: OversizedDiffSummary | null;
  uncommittedDiff: string | null;
}): string | null {
  if (oversizedDiffSummary != null) {
    return [
      "Changes:",
      "Diff too large to include inline.",
      `Summary: ${oversizedDiffSummary.filesChanged} changed files, +${oversizedDiffSummary.linesAdded}/-${oversizedDiffSummary.linesRemoved} lines.`,
    ].join("\n");
  }

  if (!uncommittedDiff) {
    return null;
  }
  const trimmedDiff = uncommittedDiff.trim();
  if (trimmedDiff.length === 0) {
    return null;
  }
  const lines: Array<string> = ["Changes:"];
  lines.push(uncommittedDiff);
  return lines.join("\n");
}
