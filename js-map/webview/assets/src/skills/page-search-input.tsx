import type { ReactElement, RefObject } from "react";

import SearchIcon from "@/icons/search.svg";

export function PageSearchInput({
  id,
  inputRef,
  label,
  onSearchQueryChange,
  placeholder,
  searchQuery,
}: {
  id: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  label: string;
  onSearchQueryChange: (value: string) => void;
  placeholder: string;
  searchQuery: string;
}): ReactElement {
  return (
    <div className="no-drag flex h-token-button-composer items-center gap-2 rounded-lg border border-token-input-border bg-token-input-background/75 px-2.5 py-0 text-base leading-[18px] shadow-sm backdrop-blur-sm">
      <SearchIcon className="icon-sm text-token-text-secondary" />
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        className="w-full bg-transparent text-base leading-[18px] text-token-input-foreground outline-none placeholder:text-token-input-placeholder-foreground"
        type="text"
        value={searchQuery}
        onChange={(event): void => {
          onSearchQueryChange(event.target.value);
        }}
        placeholder={placeholder}
      />
    </div>
  );
}
