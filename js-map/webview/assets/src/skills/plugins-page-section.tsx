import type { ReactElement, ReactNode } from "react";

export function PluginsPageSection({
  id,
  title,
  action,
  children,
  nodeRef,
}: {
  id: string;
  title: ReactNode;
  action?: ReactElement;
  children: ReactNode;
  nodeRef?: (node: HTMLElement | null) => void;
}): ReactElement {
  return (
    <section
      className="flex flex-col gap-4"
      id={id}
      ref={(node): void => {
        nodeRef?.(node);
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-token-border-light pr-0.5 pb-2">
        <div className="text-[15px] leading-6 text-token-foreground">
          {title}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
