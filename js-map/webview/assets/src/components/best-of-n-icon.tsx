import { FormattedMessage } from "react-intl";

import { Tooltip } from "@/components/tooltip";
import Bon1Icon from "@/icons/bon1.svg";
import Bon2Icon from "@/icons/bon2.svg";
import Bon3Icon from "@/icons/bon3.svg";
import Bon4Icon from "@/icons/bon4.svg";

export function BestOfNIcon({
  className,
  attempts,
  tooltip,
}: {
  className?: string;
  attempts: number;
  tooltip?: boolean;
}): React.ReactElement | null {
  let icon: React.ReactElement;
  if (attempts <= 1) {
    icon = <Bon1Icon className={className} />;
  } else if (attempts === 2) {
    icon = <Bon2Icon className={className} />;
  } else if (attempts === 3) {
    icon = <Bon3Icon className={className} />;
  } else {
    icon = <Bon4Icon className={className} />;
  }
  if (!tooltip) {
    return icon;
  }
  return (
    <Tooltip
      tooltipContent={
        <FormattedMessage
          id="bestOfNIcon.attemptsTooltip"
          defaultMessage="{attempts, plural, one {# attempt} other {# attempts}}"
          description="Tooltip indicating the number of attempts represented by the icon"
          values={{ attempts }}
        />
      }
    >
      {icon}
    </Tooltip>
  );
}
