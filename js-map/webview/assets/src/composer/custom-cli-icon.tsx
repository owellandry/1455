import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import CodexIcon from "@/icons/codex.svg";
import { useFetchFromVSCode } from "@/vscode-api";

export function CustomCliIcon(): React.ReactElement | null {
  const { data } = useFetchFromVSCode("has-custom-cli-executable");
  // Don't show while loading.
  const hasCustomCliExecutable = data?.hasCustomCliExecutable ?? false;
  if (!hasCustomCliExecutable) {
    return null;
  }
  return (
    <Tooltip
      tooltipContent={
        <FormattedMessage
          id="composer.customCliTooltip"
          defaultMessage="Using a custom CLI executable"
          description="Tooltip text shown when the user has set a custom Codex CLI executable in their VS Code settings."
        />
      }
    >
      {/* We use a button here to align the tooltip with the sibling components' tooltips. Looks dumb otherwise. */}
      <Button color="ghost" size="composerSm" uniform className="-mx-2">
        <CodexIcon className="icon-xs text-token-editor-warning-foreground" />
      </Button>
    </Tooltip>
  );
}
