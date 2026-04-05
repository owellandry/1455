import type { LocalEnvironmentActionIcon } from "protocol";
import type { ComponentType, ReactElement } from "react";

import BugIcon from "@/icons/bug.svg";
import FlaskIcon from "@/icons/flask.svg";
import PlayOutlineIcon from "@/icons/play-outline.svg";
import SettingsCogIcon from "@/icons/settings.cog.svg";

const ACTION_ICONS: Record<
  LocalEnvironmentActionIcon,
  ComponentType<{ className?: string }>
> = {
  tool: SettingsCogIcon,
  run: PlayOutlineIcon,
  debug: BugIcon,
  test: FlaskIcon,
};

export function ActionIcon({
  icon,
  className,
}: {
  icon: LocalEnvironmentActionIcon;
  className?: string;
}): ReactElement {
  const Icon = ACTION_ICONS[icon];
  return <Icon className={className ? `icon-sm ${className}` : "icon-sm"} />;
}
