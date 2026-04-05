import { useScope, useSignal } from "maitai";
import { useEffect, useEffectEvent } from "react";

import { useWindowType } from "@/hooks/use-window-type";
import { useMessage } from "@/message-bus";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";

import {
  contentSearchDefaultDomainForOpen$,
  openContentSearch,
  setContentSearchDomain,
  setContentSearchQuery,
} from "./search-model";

export function SearchBarHost(): null {
  const scope = useScope(ThreadRouteScope);
  const windowType = useWindowType();
  const defaultDomainForOpen = useSignal(contentSearchDefaultDomainForOpen$);

  function openAndFocus(): void {
    const selectedQuery = getSelectedFindQuery();

    setContentSearchDomain(scope, defaultDomainForOpen);
    if (selectedQuery != null) {
      setContentSearchQuery(scope, selectedQuery);
    }
    openContentSearch(scope);

    window.requestAnimationFrame(focusSearchBarInput);
  }
  const openAndFocusInEffect = useEffectEvent(() => {
    openAndFocus();
  });

  useMessage("find-in-thread", () => {
    openAndFocus();
  });

  useEffect(() => {
    if (windowType !== "electron") {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        openAndFocusInEffect();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return (): void => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [windowType]);

  return null;
}

function focusSearchBarInput(): void {
  const inputElement = document.getElementById("content-search-input");
  if (!(inputElement instanceof HTMLInputElement)) {
    return;
  }

  inputElement.focus();
  inputElement.select();
}

function getSelectedFindQuery(): string | undefined {
  const activeElement = document.activeElement;
  let query: string | undefined;
  if (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement
  ) {
    if (
      activeElement.selectionStart == null ||
      activeElement.selectionEnd == null
    ) {
      return undefined;
    }

    query = activeElement.value.slice(
      activeElement.selectionStart,
      activeElement.selectionEnd,
    );
  } else {
    query = window.getSelection?.()?.toString();
  }
  const trimmedQuery = query?.trim();
  if (!trimmedQuery) {
    return undefined;
  }
  if (/[\r\n]/.test(trimmedQuery)) {
    return "";
  }
  return trimmedQuery;
}
