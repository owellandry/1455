import { useNavigate } from "react-router";

import { useDefaultAppServerManager } from "./app-server/app-server-manager-hooks";
import { implementTodo } from "./implement-todo";
import { useMessage } from "./message-bus";

export function TodoHandler(): null {
  const mcpManager = useDefaultAppServerManager();
  const navigate = useNavigate();

  useMessage("implement-todo", (message) => {
    void implementTodo({
      fileName: decodeURIComponent(message.fileName),
      line: message.line,
      comment: message.comment,
      mcpManager,
      navigate,
    });
  });

  return null;
}
