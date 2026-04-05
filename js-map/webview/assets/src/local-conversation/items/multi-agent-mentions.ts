const AGENT_MENTION_COLOR_CSS_VARIABLES = [
  "--vscode-charts-red",
  "--vscode-charts-blue",
  "--vscode-charts-orange",
  "--vscode-charts-green",
  "--vscode-charts-purple",
] as const;

const sessionIdToAgentNickname = new Map<string, string>();
const sessionIdToMentionColor = new Map<string, string>();
let nextAgentMentionColorIndex = 0;

export function registerAgentNicknameForSessionId(
  sessionId: string,
  agentNickname: string,
): void {
  const trimmedAgentNickname = agentNickname.trim();
  if (trimmedAgentNickname.length === 0) {
    return;
  }

  const agentNicknameWithoutMentionPrefix = trimmedAgentNickname.startsWith("@")
    ? trimmedAgentNickname.slice(1).trim()
    : trimmedAgentNickname;
  if (agentNicknameWithoutMentionPrefix.length === 0) {
    return;
  }

  sessionIdToAgentNickname.set(sessionId, agentNicknameWithoutMentionPrefix);
}

export function getAgentMentionForSessionId(sessionId: string): string {
  const existingAgentName = sessionIdToAgentNickname.get(sessionId);
  if (existingAgentName != null) {
    return `@${existingAgentName}`;
  }

  return `@agent-${sessionId.slice(0, 8)}`;
}

export function getAgentMentionColorCssValueForSessionId(
  sessionId: string,
): string {
  const existingCssVariable = sessionIdToMentionColor.get(sessionId);
  if (existingCssVariable != null) {
    return `var(${existingCssVariable})`;
  }

  const cssVariable =
    AGENT_MENTION_COLOR_CSS_VARIABLES[nextAgentMentionColorIndex];
  nextAgentMentionColorIndex =
    (nextAgentMentionColorIndex + 1) % AGENT_MENTION_COLOR_CSS_VARIABLES.length;
  sessionIdToMentionColor.set(sessionId, cssVariable);
  return `var(${cssVariable})`;
}
