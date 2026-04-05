import { useAtom } from "jotai";
import { useState } from "react";
import { FormattedMessage } from "react-intl";

import { BestOfNIcon } from "@/components/best-of-n-icon";
import { Button } from "@/components/button";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { Tooltip } from "@/components/tooltip";
import { aComposerBestOfN } from "@/composer/composer-atoms";
import CheckMdIcon from "@/icons/check-md.svg";

/* This should be controlled by statsig but we don't have it configured in the extension so we default to 4. */
const DEFAULT_MAX_ATTEMPTS = 4;

export function AttemptsSelector(): React.ReactElement {
  const [attempts, setAttempts] = useAtom(aComposerBestOfN);
  const [open, setOpen] = useState(false);

  return (
    <BasicDropdown
      side="top"
      open={open}
      onOpenChange={setOpen}
      triggerButton={
        <Tooltip
          tooltipContent={
            <FormattedMessage
              id="composer.attemptsSelector.tooltip"
              defaultMessage="Number of parallel attempts for Codex to make"
              description="Tooltip explaining a dropdown explaining that the user can set the number of parallel attempts for Codex to make"
            />
          }
        >
          <Button size="composerSm" color="ghost">
            <BestOfNIcon className="icon-2xs" attempts={attempts} />
            <span className="tabular-nums">
              <FormattedMessage
                id="composer.attemptsSelector.trigger"
                defaultMessage="{count}x"
                description="Button label showing selected number of versions"
                values={{ count: attempts }}
              />
            </span>
          </Button>
        </Tooltip>
      }
    >
      <div className="flex w-44 flex-col">
        {Array.from({ length: DEFAULT_MAX_ATTEMPTS }, (_, idx) => idx + 1).map(
          (n) => {
            const Icon = ({
              className,
            }: {
              className?: string;
            }): React.ReactElement => (
              <BestOfNIcon className={className} attempts={n} />
            );
            return (
              <Dropdown.Item
                key={n}
                className="w-full"
                LeftIcon={Icon}
                RightIcon={attempts === n ? CheckMdIcon : undefined}
                onClick={() => {
                  setAttempts(n);
                  setOpen(false);
                }}
              >
                <FormattedMessage
                  id="composer.attemptsSelector.option"
                  defaultMessage="{count, plural, one {# version} other {# versions}}"
                  description="Option label to select number of versions"
                  values={{ count: n }}
                />
              </Dropdown.Item>
            );
          },
        )}
      </div>
    </BasicDropdown>
  );
}
