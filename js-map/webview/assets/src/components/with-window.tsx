import type React from "react";

import { useWindowType } from "@/hooks/use-window-type";

export function WithWindow({
  children,
  extension = false,
  electron = false,
  browser = false,
}: {
  children: React.ReactNode;
  extension?: boolean;
  electron?: boolean;
  browser?: boolean;
}): React.ReactElement | null {
  const windowType = useWindowType();

  const shouldRender =
    (extension && windowType === "extension") ||
    (electron && windowType === "electron") ||
    (browser && windowType === "browser");

  if (!shouldRender) {
    return null;
  }

  return <>{children}</>;
}
