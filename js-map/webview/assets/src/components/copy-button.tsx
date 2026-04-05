import clsx from "clsx";
import { useCallback, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import CheckMdIcon from "@/icons/check-md.svg";
import CopyIcon from "@/icons/copy.svg";
import { useIsMounted } from "@/utils/use-is-mounted";

import { Button } from "./button";
import { Tooltip } from "./tooltip";

export function CopyButton({
  buttonText,
  shouldChangeText = true,
  iconClassName = "icon-sm",
  onCopy,
  className,
  iconOnly = false,
  textPosition = "right",
}: {
  buttonText?: string | true;
  shouldChangeText?: boolean;
  iconClassName?: string;
  onCopy: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  iconOnly?: boolean;
  textPosition?: "left" | "right";
}): React.ReactNode {
  const intl = useIntl();
  const [copied, setCopied] = useState(false);
  const isMounted = useIsMounted();

  const handleCopyToClipboard = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onCopy(e);
      setCopied(true);

      setTimeout(() => {
        if (isMounted()) {
          setCopied(false);
        }
      }, 2000);
    },
    [isMounted, onCopy],
  );

  let text: React.ReactNode = buttonText;
  if (shouldChangeText && copied) {
    text = (
      <FormattedMessage
        id="copyButton.copied"
        defaultMessage="Copied"
        description="Text displayed when the content has been copied"
      />
    );
  } else if (buttonText === true) {
    text = (
      <FormattedMessage
        id="copyButton.copy"
        defaultMessage="Copy"
        description="Text displayed when the content can be copied"
      />
    );
  }

  return (
    <>
      {!copied && (
        <Tooltip
          tooltipContent={
            buttonText ?? (
              <FormattedMessage
                id="CopyButton.copyTooltip"
                defaultMessage="Copy"
                description="Tooltip on copy message icon button"
              />
            )
          }
          disabled={!iconOnly}
        >
          <Button
            color="ghost"
            size="icon"
            onClick={handleCopyToClipboard}
            className={className}
            aria-label={intl.formatMessage({
              id: "copyButton.copyAriaLabel",
              defaultMessage: "Copy",
              description:
                "Aria label for a button for content that can be copied",
            })}
          >
            {textPosition === "left" && !iconOnly && text}
            <CopyIcon className={iconClassName} />
            {textPosition === "right" && !iconOnly && text}
          </Button>
        </Tooltip>
      )}
      {copied && (
        <Button
          color="ghost"
          size="icon"
          className={clsx("text-token-foreground", className)}
          aria-label={intl.formatMessage({
            id: "copyButton.copiedAriaLabel",
            defaultMessage: "Copied",
            description:
              "Aria label for a button state when text has been copied",
          })}
        >
          {textPosition === "left" && !iconOnly && text}
          <CheckMdIcon className={iconClassName} />
          {textPosition === "right" && !iconOnly && text}
        </Button>
      )}
    </>
  );
}
