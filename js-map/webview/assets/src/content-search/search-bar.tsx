import { useSignal } from "maitai";
import type React from "react";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { contentSearchIsOpen$ } from "@/content-search/search-model";

import { SearchBarClose } from "./search-bar-close";
import { SearchBarDomainToggle } from "./search-bar-domain-toggle";
import { SearchBarFrame } from "./search-bar-frame";
import { SearchBarHost } from "./search-bar-host";
import { SearchBarInput } from "./search-bar-input";
import { SearchBarNavigation } from "./search-bar-navigation";
import { SearchBarResultLabel } from "./search-bar-result-label";

function SearchBarFrameWithController({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement | null {
  const isOpen = useSignal(contentSearchIsOpen$);
  if (!isOpen) {
    return null;
  }

  return <SearchBarFrame className={className}>{children}</SearchBarFrame>;
}

function SearchBarRoot({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <>{children}</>;
}

function SearchBarSurface(): React.ReactElement {
  const hasOpenDialog = useSyncExternalStore(
    subscribeToDialogPresence,
    getHasOpenDialog,
    () => false,
  );

  const surface = (
    <>
      <SearchBarHost />
      {hasOpenDialog ? null : (
        <div className="pointer-events-none fixed top-2 right-4 z-[55] flex justify-end">
          <SearchBarFrameWithController>
            <SearchBarInput />
            <SearchBarDomainToggle />
            <SearchBarNavigation />
            <SearchBarResultLabel />
            <SearchBarClose />
          </SearchBarFrameWithController>
        </div>
      )}
    </>
  );

  if (typeof document === "undefined") {
    return surface;
  }

  return createPortal(surface, document.body);
}

export const SearchBar = Object.assign(SearchBarRoot, {
  Frame: SearchBarFrameWithController,
  Surface: SearchBarSurface,
  Input: SearchBarInput,
  DomainToggle: SearchBarDomainToggle,
  Navigation: SearchBarNavigation,
  ResultLabel: SearchBarResultLabel,
  Close: SearchBarClose,
});

function subscribeToDialogPresence(onStoreChange: () => void): () => void {
  if (
    typeof document === "undefined" ||
    typeof MutationObserver === "undefined"
  ) {
    return (): void => {};
  }

  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return (): void => {
    observer.disconnect();
  };
}

function getHasOpenDialog(): boolean {
  return (
    typeof document !== "undefined" &&
    document.querySelector(".codex-dialog-overlay") != null
  );
}
