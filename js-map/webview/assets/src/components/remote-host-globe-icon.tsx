import type React from "react";

import GlobeIcon from "@/icons/globe.svg";
import { getRemoteHostGlobeColorsByHostId } from "@/remote-connections/remote-host-globe-colors";

export function RemoteHostGlobeIcon({
  className,
  hostId,
  hostIdsForColorAssignment,
}: {
  className?: string;
  hostId: string;
  hostIdsForColorAssignment: Array<string>;
}): React.ReactElement {
  const remoteHostGlobeColorsByHostId = getRemoteHostGlobeColorsByHostId(
    hostIdsForColorAssignment,
  );

  return (
    <GlobeIcon
      className={className}
      style={{ color: remoteHostGlobeColorsByHostId[hostId] }}
    />
  );
}
