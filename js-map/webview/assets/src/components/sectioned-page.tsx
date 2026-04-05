import clsx from "clsx";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

import { Button } from "./button";
import { useSectionNav } from "./use-section-nav";

export type SectionedPageSectionDescriptor = {
  id: string;
  title: ReactNode;
};

const SectionedPageContext = createContext<{
  setSectionElement: (sectionId: string, node: HTMLElement | null) => void;
} | null>(null);

function SectionedPageHeader({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <div className="mx-auto flex w-full max-w-[var(--thread-content-max-width)] flex-col gap-1 px-panel pt-panel">
      {children}
    </div>
  );
}

export function SectionedPageLayout({
  ariaLabel,
  sections,
  children,
  className,
  contentInnerClassName,
  disableScrollFade = false,
  header,
  navOrientation = "vertical",
  navAccessory,
  navFooter,
  navSections,
  onSelectNavSection,
  showNav = true,
}: {
  ariaLabel: string;
  sections: Array<SectionedPageSectionDescriptor>;
  children: ReactNode;
  className?: string;
  contentInnerClassName?: string;
  disableScrollFade?: boolean;
  header?: ReactNode;
  navOrientation?: "horizontal" | "vertical";
  navAccessory?: ReactNode;
  navFooter?: ReactNode;
  navSections?: Array<SectionedPageSectionDescriptor>;
  onSelectNavSection?: (sectionId: string) => void;
  showNav?: boolean;
}): ReactElement {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const setScrollContainerRef = useCallback(
    (node: HTMLDivElement | null): void => {
      if (scrollContainerRef.current === node) {
        return;
      }

      scrollContainerRef.current = node;
      setScrollContainer(node);
    },
    [],
  );
  const { activeSectionId, scrollToSection, setSectionElement } = useSectionNav(
    {
      container: scrollContainer,
      sectionIds: sections.map((section) => section.id),
    },
  );
  const visibleNavSections = navSections ?? sections;
  const shouldShowNav = showNav && visibleNavSections.length > 0;

  return (
    <div
      className={clsx(
        "flex min-h-0 w-full flex-1 flex-col gap-8 [--sectioned-page-leading-inset:0.5rem]",
        className,
      )}
    >
      {header == null ? null : (
        <SectionedPageHeader>{header}</SectionedPageHeader>
      )}
      <div
        className={clsx(
          shouldShowNav
            ? navOrientation === "vertical"
              ? "flex min-h-0 w-full flex-1 flex-col gap-8 lg:grid lg:grid-cols-[theme(spacing.32)_minmax(0,1fr)] lg:items-start lg:gap-10"
              : "flex min-h-0 w-full flex-1 flex-col gap-8"
            : "flex min-h-0 w-full flex-1 flex-col",
        )}
      >
        {shouldShowNav ? (
          <SectionedPageNav
            activeSectionId={activeSectionId}
            accessory={navAccessory}
            ariaLabel={ariaLabel}
            footer={navFooter}
            orientation={navOrientation}
            onSelectSection={onSelectNavSection ?? scrollToSection}
            sections={visibleNavSections}
          />
        ) : null}
        <SectionedPageContext.Provider value={{ setSectionElement }}>
          <div
            className={clsx(
              "relative min-h-0 w-full flex-1 overflow-y-auto [scrollbar-gutter:stable] lg:h-full",
              !disableScrollFade &&
                "vertical-scroll-fade-mask [--edge-fade-distance:1rem]",
            )}
            ref={setScrollContainerRef}
          >
            <div
              className={clsx(
                "mx-auto w-full max-w-[var(--thread-content-max-width)]",
                contentInnerClassName,
              )}
            >
              {children}
            </div>
          </div>
        </SectionedPageContext.Provider>
      </div>
    </div>
  );
}

export function SectionedPageSection({
  id,
  title,
  action,
  showDivider = true,
  children,
}: {
  id: string;
  title: ReactNode;
  action?: ReactElement;
  showDivider?: boolean;
  children: ReactNode;
}): ReactElement {
  const sectionedPageContext = useContext(SectionedPageContext);

  return (
    <section
      className="flex flex-col gap-4"
      id={id}
      ref={(node): void => {
        sectionedPageContext?.setSectionElement(id, node);
      }}
    >
      <div
        className={clsx(
          "flex items-center justify-between gap-3 [padding-inline-start:var(--sectioned-page-leading-inset,0.5rem)] pr-0.5 pb-2",
          showDivider && "border-b border-token-border-light",
        )}
      >
        <div className="text-[15px] leading-6 font-medium text-token-foreground">
          {title}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function SectionedPageNav({
  activeSectionId,
  accessory,
  ariaLabel,
  footer,
  orientation,
  onSelectSection,
  sections,
}: {
  activeSectionId: string | null;
  accessory?: ReactNode;
  ariaLabel: string;
  footer?: ReactNode;
  orientation: "horizontal" | "vertical";
  onSelectSection: (sectionId: string) => void;
  sections: Array<SectionedPageSectionDescriptor>;
}): ReactElement {
  return (
    <nav
      aria-label={ariaLabel}
      className={
        orientation === "vertical" ? "hidden lg:block lg:self-start" : "w-full"
      }
    >
      {orientation === "vertical" ? (
        <div className="flex flex-col gap-1">
          {sections.map((section) => {
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={clsx(
                  "text-left text-[15px] leading-6 transition-colors",
                  activeSectionId === section.id
                    ? "text-token-foreground"
                    : "text-token-text-secondary hover:text-token-foreground",
                )}
                onClick={(event): void => {
                  event.preventDefault();
                  onSelectSection(section.id);
                }}
              >
                {section.title}
              </a>
            );
          })}
        </div>
      ) : (
        <div className="flex w-full flex-col gap-8">
          <div className="mx-auto flex w-full flex-col gap-8 px-panel lg:max-w-none">
            {footer}
            <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-3">
              {sections.map((section) => {
                return (
                  <Button
                    key={section.id}
                    color={
                      activeSectionId === section.id ? "secondary" : "ghost"
                    }
                    size="toolbar"
                    onClick={() => {
                      onSelectSection(section.id);
                    }}
                    aria-pressed={activeSectionId === section.id}
                  >
                    {section.title}
                  </Button>
                );
              })}
              {accessory == null ? null : (
                <div className="flex items-center gap-3">
                  <div className="h-6 w-px bg-token-border-light" />
                  {accessory}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
