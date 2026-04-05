import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router";

import CloudIcon from "@/icons/cloud.svg";

export function RemoteTaskCreatedItemContent({
  taskId,
}: {
  taskId: string;
}): React.ReactElement {
  const navigate = useNavigate();

  return (
    <div className="text-size-chat my-2 flex items-center gap-2 text-token-description-foreground/80">
      <div className="flex-1 border-t border-current/30" />
      <div className="flex items-center gap-1 whitespace-nowrap">
        <CloudIcon className="icon-xs" />
        <FormattedMessage
          id="localConversation.remoteTaskCreated"
          defaultMessage="Created {taskLink} in Codex Cloud"
          description="Synthetic item shown when a remote task is created from a local conversation. taskLink is a url link to the task."
          values={{
            taskLink: (
              <button
                type="button"
                className="cursor-interaction border-0 bg-transparent p-0 text-token-text-link-foreground outline-none hover:underline focus:border-0 focus:!outline-none"
                onClick={() => navigate(`/remote/${taskId}`)}
              >
                <FormattedMessage
                  id="localConversation.remoteTaskCreated.task"
                  defaultMessage="task"
                  description="Link label for remote task created indicator"
                />
              </button>
            ),
          }}
        />
      </div>
      <div className="flex-1 border-t border-current/30" />
    </div>
  );
}
