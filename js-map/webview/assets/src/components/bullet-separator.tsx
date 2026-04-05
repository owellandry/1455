import clsx from "clsx";
import { FormattedMessage } from "react-intl";

export function BulletSeparator({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <span aria-hidden className={clsx("last:hidden", className)}>
      <FormattedMessage
        id="codex.ui.bulletSeparator"
        defaultMessage="·"
        description="Middle dot separator used between inline items"
      />
    </span>
  );
}
