export type MermaidDiagramKind =
  | "sequence"
  | "pie"
  | "class"
  | "state"
  | "entityRelationship"
  | "journey"
  | "gitgraph"
  | "xychart"
  | "packet"
  | "kanban";

const diagramAliases: Record<string, MermaidDiagramKind> = {
  sequencediagram: "sequence",
  pie: "pie",
  classdiagram: "class",
  statediagram: "state",
  erdiagram: "entityRelationship",
  entityrelationshipdiagram: "entityRelationship",
  journey: "journey",
  userjourney: "journey",
  gitgraph: "gitgraph",
  gitgraphbeta: "gitgraph",
  xychart: "xychart",
  packet: "packet",
  kanban: "kanban",
};

export function detectMermaidDiagramKind(
  code: string,
): MermaidDiagramKind | null {
  const lines = code
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("%%"));

  if (lines.length === 0) {
    return null;
  }

  const firstToken = lines[0].split(/\s+/)[0];
  if (!firstToken) {
    return null;
  }

  const normalized = firstToken.replace(/[-_]/g, "").toLowerCase();
  return diagramAliases[normalized] ?? null;
}
