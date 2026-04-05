export function getLanguageFromPath(path: string): string | undefined {
  const lower = path.toLowerCase();
  // Handle special filenames
  if (/(^|[\\/])makefile$/.test(lower)) {
    return "makefile";
  }
  // Extensions mapping
  const ext = lower.split(".").pop() ?? "";
  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "md":
      return "markdown";
    case "yml":
    case "yaml":
      return "yaml";
    case "xml":
      return "xml";
    case "html":
      // highlight.js html is covered by xml
      return "xml";
    case "css":
      return "css";
    case "scss":
      return "scss";
    case "less":
      return "less";
    case "sh":
    case "zsh":
    case "bash":
      return "bash";
    case "py":
      return "python";
    case "rb":
      return "ruby";
    case "go":
      return "go";
    case "rs":
      return "rust";
    case "java":
      return "java";
    case "c":
      return "c";
    case "h":
    case "hpp":
    case "hh":
    case "hxx":
    case "cc":
    case "cpp":
    case "cxx":
      return "cpp";
    case "cs":
      return "csharp";
    case "kt":
      return "kotlin";
    case "php":
      return "php";
    case "sql":
      return "sql";
    case "ini":
      return "ini";
    case "toml":
      return "ini";
    case "r":
      return "r";
    case "lua":
      return "lua";
    case "tex":
      return "latex";
    case "pl":
      return "perl";
    case "graphql":
    case "gql":
      return "graphql";
    case "swift":
      return "swift";
    default:
      return undefined; // Let highlighter auto-detect
  }
}
