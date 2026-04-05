import type React from "react";
import { useState } from "react";

import { Tooltip } from "@/components/tooltip";
import { useResizeObserver } from "@/utils/use-resize-observer";

const EMPTY_CELL_PLACEHOLDER = "—";

export function RemoteConnectionsTruncatedCellText({
  value,
  placeholder,
}: {
  value: string | null | undefined;
  placeholder?: string;
}): React.ReactElement {
  const trimmedValue = value?.trim() ?? "";
  const [isTruncated, setIsTruncated] = useState(false);
  const observeValueRef = useResizeObserver<HTMLDivElement>(
    (_entry, element) => {
      setIsTruncated(element.scrollWidth > element.clientWidth);
    },
  );

  const setValueRef = (node: HTMLDivElement | null): void => {
    observeValueRef(node);
    if (node != null) {
      setIsTruncated(node.scrollWidth > node.clientWidth);
    }
  };

  if (trimmedValue === "") {
    return (
      <div className="truncate">{placeholder ?? EMPTY_CELL_PLACEHOLDER}</div>
    );
  }

  return (
    <Tooltip tooltipContent={trimmedValue} disabled={!isTruncated}>
      <div ref={setValueRef} className="truncate">
        {trimmedValue}
      </div>
    </Tooltip>
  );
}
