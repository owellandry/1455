import clsx from "clsx";
import type { ReactElement, ReactNode } from "react";

import { Badge } from "@/components/badge";

export function CardTile({
  icon,
  title,
  description,
  contentClassName,
  descriptionClassName,
  badges,
  actions,
  actionsPlacement = "top",
  onClick,
  iconContainer = true,
  className,
}: {
  icon?: ReactElement | null;
  title: ReactNode;
  description?: ReactNode;
  contentClassName?: string;
  descriptionClassName?: string;
  badges?: Array<ReactNode>;
  actions?: ReactNode;
  actionsPlacement?: "top" | "center";
  onClick?: () => void;
  iconContainer?: boolean;
  className?: string;
}): ReactElement {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!onClick) {
      return;
    }
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={clsx(
        "border-token-border/40 flex flex-col gap-2.5 rounded-2xl border p-2.5 transition-colors hover:bg-token-foreground/5",
        onClick ? "cursor-interaction" : null,
        className,
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : -1}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center gap-3">
        {icon ? (
          iconContainer ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-token-bg-primary">
              {icon}
            </span>
          ) : (
            <span className="shrink-0">{icon}</span>
          )
        ) : null}
        {actionsPlacement === "center" && actions ? (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={clsx(
                "flex min-w-0 flex-1 flex-col justify-center gap-0.5",
                contentClassName,
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="truncate font-medium text-token-foreground">
                    {title}
                  </div>
                  {badges?.length ? (
                    <div className="flex shrink-0 items-center gap-1">
                      {badges.map((badge, index): ReactElement => {
                        if (typeof badge === "string") {
                          return (
                            <Badge
                              key={badge}
                              className="border border-token-border-default bg-transparent px-1.5 py-0.5 text-xs font-medium text-token-text-secondary"
                            >
                              {badge}
                            </Badge>
                          );
                        }
                        return (
                          <span key={index} className="flex items-center">
                            {badge}
                          </span>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
              {description ? (
                <div
                  className={clsx(
                    "text-token-text-secondary text-sm leading-relaxed",
                    descriptionClassName ?? "line-clamp-3",
                  )}
                >
                  {description}
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center">{actions}</div>
          </div>
        ) : (
          <div
            className={clsx(
              "flex min-w-0 flex-1 flex-col justify-center gap-0.5",
              contentClassName,
            )}
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className="truncate font-medium text-token-foreground">
                  {title}
                </div>
                {badges?.length ? (
                  <div className="flex shrink-0 items-center gap-1">
                    {badges.map((badge, index): ReactElement => {
                      if (typeof badge === "string") {
                        return (
                          <Badge
                            key={badge}
                            className="border border-token-border-default bg-transparent px-1.5 py-0.5 text-xs font-medium text-token-text-secondary"
                          >
                            {badge}
                          </Badge>
                        );
                      }
                      return (
                        <span key={index} className="flex items-center">
                          {badge}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              {actions ? (
                <div className="flex shrink-0 items-center">{actions}</div>
              ) : null}
            </div>
            {description ? (
              <div
                className={clsx(
                  "text-token-text-secondary text-sm leading-relaxed",
                  descriptionClassName ?? "line-clamp-3",
                )}
              >
                {description}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
