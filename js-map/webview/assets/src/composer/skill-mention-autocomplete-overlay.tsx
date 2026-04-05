import clsx from "clsx";
import type { ReactElement, RefObject } from "react";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import type { ProseMirrorComposerController } from "./prosemirror/composer-controller";
import { SkillMentionList } from "./skill-mention-list";
import { useComposerTopMenuChrome } from "./use-composer-top-menu-chrome";
import type { useSkillMentionAutocomplete } from "./use-skill-mention-autocomplete";

type OverlayAnchorPosition = {
  portalContainer: HTMLElement;
  left: number;
  top: number;
  width: number;
  fixedPosition: boolean;
  renderAbove: boolean;
};

const INLINE_OVERLAY_MAX_WIDTH = 360;
const OVERLAY_EDGE_PADDING = 12;
const OVERLAY_GAP = 8;

export function SkillMentionAutocompleteOverlay({
  autocomplete,
  query,
  cwd,
  roots,
  appServerManager,
  composerController,
  anchorRef,
  placement = "top",
  portalRoot = "dialog",
  zIndexClassName = "z-50",
}: {
  autocomplete: ReturnType<typeof useSkillMentionAutocomplete>;
  query: string;
  cwd?: string;
  roots?: Array<string>;
  appServerManager?: Parameters<typeof SkillMentionList>[0]["appServerManager"];
  composerController?: ProseMirrorComposerController;
  anchorRef?: RefObject<HTMLElement | null>;
  placement?: "top" | "bottom";
  portalRoot?: "dialog" | "body";
  zIndexClassName?: string;
}): ReactElement | null {
  const isActive = !!autocomplete.ui?.active;
  const { hotkeyWindowPortalContainer, shellClassName } =
    useComposerTopMenuChrome({
      placement,
      zIndexClassName,
    });

  const subscribeOverlayAnchorPosition = useCallback(
    (onStoreChange: () => void): (() => void) => {
      if (
        !isActive ||
        hotkeyWindowPortalContainer != null ||
        (anchorRef == null && composerController == null) ||
        typeof window === "undefined"
      ) {
        return (): void => {};
      }
      window.addEventListener("resize", onStoreChange);
      window.addEventListener("scroll", onStoreChange, true);
      return (): void => {
        window.removeEventListener("resize", onStoreChange);
        window.removeEventListener("scroll", onStoreChange, true);
      };
    },
    [anchorRef, composerController, hotkeyWindowPortalContainer, isActive],
  );
  const overlayAnchorSnapshot = useSyncExternalStore(
    subscribeOverlayAnchorPosition,
    () => {
      const overlayAnchorPosition = getOverlayAnchorPosition({
        composerController,
        mentionUiState: autocomplete.ui,
        anchorRef,
        placement,
        portalRoot,
      });
      if (overlayAnchorPosition == null) {
        return null;
      }
      return `${overlayAnchorPosition.fixedPosition}:${overlayAnchorPosition.left}:${overlayAnchorPosition.top}:${overlayAnchorPosition.width}`;
    },
  );
  const overlayAnchorPosition = useMemo<OverlayAnchorPosition | null>(() => {
    if (overlayAnchorSnapshot == null) {
      return null;
    }
    return getOverlayAnchorPosition({
      composerController,
      mentionUiState: autocomplete.ui,
      anchorRef,
      placement,
      portalRoot,
    });
  }, [
    anchorRef,
    autocomplete.ui,
    composerController,
    overlayAnchorSnapshot,
    placement,
    portalRoot,
  ]);

  if (!isActive) {
    return null;
  }

  const list = (
    <SkillMentionList
      query={query}
      onUpdateSelectedMention={autocomplete.setSelectedMention}
      onAddMention={autocomplete.addMention}
      cwd={cwd}
      roots={roots}
      appServerManager={appServerManager}
    />
  );

  if (hotkeyWindowPortalContainer != null) {
    return createPortal(
      <div data-hotkey-window-floating-ui className={shellClassName}>
        {list}
      </div>,
      hotkeyWindowPortalContainer,
    );
  }

  if (overlayAnchorPosition != null) {
    return createPortal(
      <div
        data-hotkey-window-floating-ui
        className={clsx(
          overlayAnchorPosition.fixedPosition ? "fixed" : "absolute",
          overlayAnchorPosition.renderAbove && "-translate-y-full",
          zIndexClassName,
        )}
        style={{
          left: overlayAnchorPosition.left,
          top: overlayAnchorPosition.top,
          width: overlayAnchorPosition.width,
        }}
      >
        {list}
      </div>,
      overlayAnchorPosition.portalContainer,
    );
  }

  return (
    <div data-hotkey-window-floating-ui className={shellClassName}>
      {list}
    </div>
  );
}

function getOverlayAnchorPosition({
  composerController,
  mentionUiState,
  anchorRef,
  placement,
  portalRoot,
}: {
  composerController?: ProseMirrorComposerController;
  mentionUiState?: ReturnType<typeof useSkillMentionAutocomplete>["ui"];
  anchorRef?: RefObject<HTMLElement | null>;
  placement: "top" | "bottom";
  portalRoot: "dialog" | "body";
}): OverlayAnchorPosition | null {
  if (typeof document === "undefined") {
    return null;
  }

  const inlineOverlayPosition = getInlineOverlayAnchorPosition({
    composerController,
    mentionUiState,
    portalRoot,
  });
  if (inlineOverlayPosition != null) {
    return inlineOverlayPosition;
  }

  if (anchorRef == null) {
    return null;
  }
  const anchorElement = anchorRef.current;
  if (anchorElement == null) {
    return null;
  }

  const portalContainer = getOverlayPortalContainer({
    anchorElement,
    portalRoot,
  });
  const anchorRect = anchorElement.getBoundingClientRect();
  const containerRect =
    portalContainer === document.body
      ? { left: 0, top: 0 }
      : portalContainer.getBoundingClientRect();
  return {
    portalContainer,
    left: anchorRect.left - containerRect.left,
    top:
      (placement === "top" ? anchorRect.top - 8 : anchorRect.bottom + 8) -
      containerRect.top,
    width: anchorRect.width,
    fixedPosition: portalContainer === document.body,
    renderAbove: placement === "top",
  };
}

function getInlineOverlayAnchorPosition({
  composerController,
  mentionUiState,
  portalRoot,
}: {
  composerController?: ProseMirrorComposerController;
  mentionUiState?: ReturnType<typeof useSkillMentionAutocomplete>["ui"];
  portalRoot: "dialog" | "body";
}): OverlayAnchorPosition | null {
  const anchorPos = mentionUiState?.anchorPos;
  if (composerController == null || anchorPos == null) {
    return null;
  }

  const editorElement = composerController.view.dom;
  const portalContainer = getOverlayPortalContainer({
    anchorElement: editorElement,
    portalRoot,
  });
  const portalContainerRect =
    portalContainer === document.body
      ? {
          left: 0,
          top: 0,
          bottom: window.innerHeight,
          width: window.innerWidth,
          height: window.innerHeight,
        }
      : portalContainer.getBoundingClientRect();
  const caretRect = composerController.view.coordsAtPos(anchorPos);
  const availableWidth = Math.max(
    portalContainerRect.width - OVERLAY_EDGE_PADDING * 2,
    0,
  );
  const width = Math.min(INLINE_OVERLAY_MAX_WIDTH, availableWidth);
  const left = clamp(
    caretRect.left - portalContainerRect.left,
    OVERLAY_EDGE_PADDING,
    portalContainerRect.width - width - OVERLAY_EDGE_PADDING,
  );
  const top = caretRect.bottom - portalContainerRect.top + OVERLAY_GAP;

  return {
    portalContainer,
    left,
    top,
    width,
    fixedPosition: portalContainer === document.body,
    renderAbove: false,
  };
}

function getOverlayPortalContainer({
  anchorElement,
  portalRoot,
}: {
  anchorElement: HTMLElement;
  portalRoot: "dialog" | "body";
}): HTMLElement {
  if (portalRoot === "body") {
    return document.body;
  }
  return (
    (anchorElement.closest(".codex-dialog") as HTMLElement | null) ??
    document.body
  );
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}
