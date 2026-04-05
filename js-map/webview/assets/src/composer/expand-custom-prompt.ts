import type { CustomPromptTemplate } from "protocol";

export function expandCustomPrompt(
  raw: string,
  prompts: Array<CustomPromptTemplate>,
): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/prompts:")) {
    return raw;
  }
  const [command, ...rest] = trimmed.split(/\s+/);
  const id = command.replace("/prompts:", "");
  const prompt = prompts.find((p) => p.id === id);
  if (!prompt) {
    return raw;
  }
  const trailing = rest.join(" ").trim();
  if (!trailing) {
    return prompt.content || raw;
  }
  return `${prompt.content || ""}\n${trailing}`.trim();
}
