import { messageBus } from "../message-bus";

type LogFields = Record<string, unknown>;
type LogTags = { safe: LogFields; sensitive?: LogFields };

function normalizeLogTags(tags: LogTags): {
  safe: LogFields;
  sensitive: LogFields;
} {
  return {
    ...tags,
    sensitive: tags.sensitive ?? {},
  };
}

export const logger = {
  trace: (message: string, tags?: LogTags): void => {
    messageBus.dispatchMessage("log-message", {
      level: "trace",
      message,
      ...(tags != null ? { tags: normalizeLogTags(tags) } : {}),
    });
  },
  debug: (message: string, tags?: LogTags): void => {
    messageBus.dispatchMessage("log-message", {
      level: "debug",
      message,
      ...(tags != null ? { tags: normalizeLogTags(tags) } : {}),
    });
  },
  info: (message: string, tags?: LogTags): void => {
    messageBus.dispatchMessage("log-message", {
      level: "info",
      message,
      ...(tags != null ? { tags: normalizeLogTags(tags) } : {}),
    });
  },
  warning: (message: string, tags?: LogTags): void => {
    messageBus.dispatchMessage("log-message", {
      level: "warning",
      message,
      ...(tags != null ? { tags: normalizeLogTags(tags) } : {}),
    });
  },
  error: (message: string, tags?: LogTags): void => {
    messageBus.dispatchMessage("log-message", {
      level: "error",
      message,
      ...(tags != null ? { tags: normalizeLogTags(tags) } : {}),
    });
  },
};
