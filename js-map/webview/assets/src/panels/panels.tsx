import clsx from "clsx";
import { createContext, useContext, useState } from "react";
/* oxlint-disable-next-line no-restricted-imports */
import {
  Panel as BasePanel,
  PanelGroup as BasePanelGroup,
  PanelResizeHandle as BasePanelResizeHandle,
} from "react-resizable-panels";

/**
 * Central wrapper that keeps panel animation, drag-state styling, ref typing
 * in one place. Anything outside this module should
 * import from "@/panels" to ensure consistent behavior and future proofing.
 */

const PanelGroupContext = createContext<{
  isDragging: boolean;
  setDragging: (dragging: boolean) => void;
} | null>(null);

/**
 * Adds panel animation classes and shares drag state with handles.
 */
export function PanelGroup(
  props: React.ComponentProps<typeof BasePanelGroup>,
): React.ReactElement {
  const { className, ...rest } = props;
  const [isDragging, setIsDragging] = useState(false);

  return (
    <PanelGroupContext.Provider
      value={{ isDragging, setDragging: setIsDragging }}
    >
      <BasePanelGroup
        {...rest}
        className={clsx(
          /* [alpha] @ambrosino */
          // "panel-animated",
          isDragging && "panel-dragging",
          className,
        )}
      />
    </PanelGroupContext.Provider>
  );
}

/**
 * Panel wrapper adds optional ref passthrough and content className.
 */
export function Panel(
  props: Omit<React.ComponentProps<typeof BasePanel>, "ref"> & {
    panelRef?: React.ComponentProps<typeof BasePanel>["ref"];
    contentClassName?: string;
  },
): React.ReactElement {
  const { children, className, contentClassName, panelRef, ...rest } = props;

  return (
    <BasePanel {...rest} ref={panelRef} className={clsx("min-w-0", className)}>
      <div className={clsx("h-full w-full min-w-[250px]", contentClassName)}>
        {children}
      </div>
    </BasePanel>
  );
}

/**
 * Toggles the dragging class on the nearest PanelGroup while preserving callbacks.
 */
export function PanelResizeHandle(
  props: React.ComponentProps<typeof BasePanelResizeHandle>,
): React.ReactElement {
  const { onDragging, className, ...rest } = props;
  const context = useContext(PanelGroupContext);

  const handleDragging = (dragging: boolean): void => {
    context?.setDragging(dragging);
    onDragging?.(dragging);
  };

  return (
    <BasePanelResizeHandle
      {...rest}
      className={clsx(
        "bg-token-border flex-none self-stretch data-[panel-group-direction=horizontal]:h-full data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=horizontal]:w-px data-[panel-group-direction=vertical]:w-full",
        className,
      )}
      onDragging={handleDragging}
    />
  );
}

/* oxlint-disable-next-line no-restricted-imports */
export type { ImperativePanelHandle } from "react-resizable-panels";
