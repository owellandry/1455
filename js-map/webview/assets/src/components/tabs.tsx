import clsx from "clsx";
import * as React from "react";

export function Tabs({
  tabs,
  selectedKey,
  onSelect,
  className,
}: {
  tabs: Array<{ key: string; name: React.ReactNode }>;
  selectedKey: string;
  onSelect: (key: string) => void;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={clsx(
        "bg-token-surface-secondary border-token-border flex items-center rounded-lg border",
        className,
      )}
    >
      {tabs.map((tab, index) => {
        const isSelected = tab.key === selectedKey;
        const isFirst = index === 0;
        const isLast = index === tabs.length - 1;
        return (
          <React.Fragment key={tab.key}>
            <button
              type="button"
              className={clsx(
                "text-token-text-secondary relative flex-1 rounded-none px-4 py-1.5 text-sm font-medium transition cursor-pointer",
                isFirst && "rounded-l-md",
                isLast && "rounded-r-md",
                isSelected
                  ? [
                      "bg-token-radio-active-foreground/25 text-token-text-primary",
                    ]
                  : "hover:bg-token-radio-active-foreground/5",
              )}
              aria-pressed={isSelected}
              onClick={(): void => {
                if (!isSelected) {
                  onSelect(tab.key);
                }
              }}
            >
              {tab.name}
            </button>
            <div className="h-full w-px self-stretch bg-token-border last:hidden" />
          </React.Fragment>
        );
      })}
    </div>
  );
}
