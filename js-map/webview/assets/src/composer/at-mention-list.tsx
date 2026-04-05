import clsx from "clsx";
import type { MouseEventHandler, ReactElement } from "react";
import { FormattedMessage } from "react-intl";

import { useListNavigation } from "@/utils/list-navigation";

import type {
  AtMentionMenuItem,
  AtMentionMenuSection,
} from "./at-mention-source-types";
import {
  MentionListContainer,
  MentionListPlaceholderRow,
  MentionListRow,
  MentionListSectionHeader,
} from "./mention-list";

import styles from "./at-mention-list.module.css";

export function AtMentionList({
  sections,
  onUpdateSelectedMention,
  onAddContext,
}: {
  sections: Array<AtMentionMenuSection>;
  onUpdateSelectedMention: (item: AtMentionMenuItem | null) => void;
  onAddContext: (item: AtMentionMenuItem) => void;
}): ReactElement | null {
  const visibleSections = sections.filter(
    (section) => section.items.length > 0 || section.emptyState != null,
  );
  const selectableItems: Array<AtMentionMenuItem> = [];
  for (const section of visibleSections) {
    selectableItems.push(...section.items);
  }

  const { highlightedIndex, listRef, getItemProps } =
    useListNavigation<AtMentionMenuItem>({
      items: selectableItems,
      isActive: selectableItems.length > 0,
      captureWindowKeydown: true,
      preserveHighlightOnItemsChange: true,
      onSelect: (entry) => {
        onUpdateSelectedMention(entry);
        onAddContext(entry);
      },
      onHighlight: (entry) => {
        onUpdateSelectedMention(entry ?? null);
      },
    });

  const selectableIndexByKey = new Map<string, number>();
  for (let index = 0; index < selectableItems.length; index += 1) {
    const item = selectableItems[index];
    if (item == null) {
      continue;
    }
    selectableIndexByKey.set(item.key, index);
  }

  const hasSectionHeaders =
    visibleSections.length > 1 ||
    visibleSections.some((section) => section.emptyState != null);
  const hasAnyResults = selectableItems.length > 0;
  const shouldShowNoResults =
    !hasAnyResults && visibleSections.every(hasNoSectionState);

  return (
    <MentionListContainer>
      <div ref={listRef} className={clsx("flex w-full flex-col")}>
        {visibleSections.map((section, index) => (
          <AtMentionSection
            key={section.id}
            className={index === 0 ? undefined : "pt-2"}
            getItemProps={getItemProps}
            hasSectionHeaders={hasSectionHeaders}
            highlightedIndex={highlightedIndex}
            itemIndexByKey={selectableIndexByKey}
            section={section}
          />
        ))}
        {shouldShowNoResults ? (
          <MentionListPlaceholderRow>
            <FormattedMessage
              id="composer.atMentionList.noResults"
              defaultMessage="No results"
              description="Shown when there are no mention results matching the search query"
            />
          </MentionListPlaceholderRow>
        ) : null}
      </div>
      {visibleSections.some((section) => section.isLoading) ? (
        <div className={styles.loadingBar} aria-hidden="true" />
      ) : null}
    </MentionListContainer>
  );
}

function AtMentionSection({
  className,
  getItemProps,
  hasSectionHeaders,
  highlightedIndex,
  itemIndexByKey,
  section,
}: {
  className?: string;
  getItemProps: (index: number) => {
    onClick: MouseEventHandler<HTMLButtonElement | HTMLDivElement>;
    onMouseEnter: MouseEventHandler<HTMLButtonElement | HTMLDivElement>;
    "aria-selected": boolean;
    "data-list-navigation-item": "true";
  };
  hasSectionHeaders: boolean;
  highlightedIndex: number;
  itemIndexByKey: Map<string, number>;
  section: AtMentionMenuSection;
}): ReactElement {
  return (
    <div>
      {hasSectionHeaders ? (
        <MentionListSectionHeader className={className}>
          <FormattedMessage {...section.title} />
        </MentionListSectionHeader>
      ) : null}
      {section.items.length > 0 ? (
        section.items.map((entry) => (
          <MentionRow
            key={entry.key}
            entry={entry}
            highlightedIndex={highlightedIndex}
            itemIndex={itemIndexByKey.get(entry.key) ?? -1}
            getItemProps={getItemProps}
          />
        ))
      ) : section.emptyState != null ? (
        <MentionListPlaceholderRow>
          <FormattedMessage {...section.emptyState} />
        </MentionListPlaceholderRow>
      ) : null}
    </div>
  );
}

function MentionRow({
  entry,
  highlightedIndex,
  itemIndex,
  getItemProps,
}: {
  entry: AtMentionMenuItem;
  highlightedIndex: number;
  itemIndex: number;
  getItemProps: (index: number) => {
    onClick: MouseEventHandler<HTMLButtonElement | HTMLDivElement>;
    onMouseEnter: MouseEventHandler<HTMLButtonElement | HTMLDivElement>;
    "aria-selected": boolean;
    "data-list-navigation-item": "true";
  };
}): ReactElement {
  return (
    <MentionListRow
      getItemProps={getItemProps}
      highlighted={itemIndex === highlightedIndex}
      itemIndex={itemIndex}
    >
      <div className="flex w-full min-w-0 items-center gap-2">
        {entry.icon ? <entry.icon className="icon-xs shrink-0" /> : null}
        <span
          className={clsx(
            "truncate",
            entry.detail != null && "flex-shrink-0",
            entry.labelClassName,
          )}
          style={entry.labelStyle}
        >
          {entry.label}
        </span>
        {entry.detail != null ? (
          <span className="flex-1 truncate text-sm text-token-description-foreground">
            {entry.detail}
          </span>
        ) : null}
      </div>
    </MentionListRow>
  );
}

function hasNoSectionState(section: AtMentionMenuSection): boolean {
  return section.emptyState == null;
}
