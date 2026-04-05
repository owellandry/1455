import clsx from "clsx";
import { AnimatePresence } from "framer-motion";
import { useMemo, useState, type ReactElement, type ReactNode } from "react";

import { SidebarListItem } from "@/sidebar/sidebar-list-item";

type SidebarThreadListItemWrapperProps<T> = {
  item: T;
  className?: string;
  children: ReactNode;
};

export function SidebarThreadList<T>({
  items,
  getKey,
  renderRow,
  className,
  ariaLabel,
  footerItems = [],
  emptyState,
  emptyStateClassName,
  itemClassName,
  itemWrapper,
}: {
  items: Array<T>;
  getKey: (item: T) => string;
  renderRow: (
    item: T,
    archiveHandlers: {
      onArchiveStart: () => void;
      onArchiveSuccess: () => void;
      onArchiveError: () => void;
    },
  ) => ReactNode;
  className?: string;
  ariaLabel?: string;
  footerItems?: Array<{
    key: string;
    node: ReactNode;
    className?: string;
  }>;
  emptyState?: ReactNode;
  emptyStateClassName?: string;
  itemClassName?: string;
  itemWrapper?: React.ComponentType<{
    item: T;
    className?: string;
    children: ReactNode;
  }>;
}): ReactElement {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() => new Set());

  const visibleItems = useMemo(
    () => items.filter((item) => !hiddenKeys.has(getKey(item))),
    [getKey, hiddenKeys, items],
  );

  const containerClassName = clsx("flex flex-col", className);

  const ItemWrapper = itemWrapper ?? DefaultSidebarThreadListItem;

  return (
    <div className={containerClassName} role="list" aria-label={ariaLabel}>
      <AnimatePresence initial={false} mode="popLayout">
        {visibleItems.map((item) => {
          const key = getKey(item);
          const onArchiveStart = (): void => {
            setHiddenKeys((prev) => {
              if (prev.has(key)) {
                return prev;
              }
              const next = new Set(prev);
              next.add(key);
              return next;
            });
          };
          const onArchiveError = (): void => {
            setHiddenKeys((prev) => {
              if (!prev.has(key)) {
                return prev;
              }
              const next = new Set(prev);
              next.delete(key);
              return next;
            });
          };
          return (
            <ItemWrapper key={key} className={itemClassName} item={item}>
              {renderRow(item, {
                onArchiveStart,
                onArchiveSuccess: () => {},
                onArchiveError,
              })}
            </ItemWrapper>
          );
        })}
      </AnimatePresence>
      {items.length === 0 && emptyState ? (
        <div className={emptyStateClassName}>{emptyState}</div>
      ) : null}
      {footerItems.map((item) => (
        <div
          key={item.key}
          className={clsx(itemClassName, item.className)}
          role="listitem"
        >
          {item.node}
        </div>
      ))}
    </div>
  );
}

function DefaultSidebarThreadListItem<T>({
  children,
  className,
}: SidebarThreadListItemWrapperProps<T>): ReactElement {
  return <SidebarListItem className={className}>{children}</SidebarListItem>;
}
