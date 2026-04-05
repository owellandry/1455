import { family, signal, type Scope } from "maitai";
import type React from "react";

import { AppScope, type AppScopeHandle } from "@/scopes/app-scope";

import type { ToastLevel } from "./types";

export interface ToastHandle {
  close: () => void;
}

export interface ToastSettings {
  description?: React.ReactNode;
  hasCloseButton?: boolean;
  duration?: number;
  id?: string;
  level?: ToastLevel;
  onRemove?: () => void;
  testId?: string;
}

export interface CustomToastSettings extends ToastSettings {
  content: (options: {
    close: () => void;
    level: ToastLevel;
  }) => React.ReactNode;
}

export interface Toaster {
  info(title: React.ReactNode, settings?: ToastSettings): ToastHandle;
  success(title: React.ReactNode, settings?: ToastSettings): ToastHandle;
  warning(title: React.ReactNode, settings?: ToastSettings): ToastHandle;
  danger(title: React.ReactNode, settings?: ToastSettings): ToastHandle;
  custom(settings: CustomToastSettings): ToastHandle;
  closeAll(): void;
}

export interface ToastState {
  content?: React.ReactNode;
  description?: React.ReactNode;
  duration: number;
  hasCloseButton: boolean;
  isShown: boolean;
  level: ToastLevel;
  testId?: string;
  title: React.ReactNode;
}

type AddToastArgs = {
  customId?: string;
  id: string;
  toast: ToastState;
};

const DEFAULT_DURATION_SECONDS = 5;
const INITIAL_NEXT_TOAST_ID = 1;
const initialToastState: ToastState = {
  duration: DEFAULT_DURATION_SECONDS,
  hasCloseButton: true,
  isShown: true,
  level: "info",
  title: null,
};
const noopToastHandle: ToastHandle = {
  close: () => {},
};
const noopToaster: Toaster = {
  info: () => noopToastHandle,
  success: () => noopToastHandle,
  warning: () => noopToastHandle,
  danger: () => noopToastHandle,
  custom: () => noopToastHandle,
  closeAll: () => {},
};
const toastOnRemoveById = new Map<string, () => void>();

export const toast$ = signal(AppScope, noopToaster);
export const toastIds$ = signal(AppScope, [] as Array<string>);
const nextToastId$ = signal(AppScope, INITIAL_NEXT_TOAST_ID);
export const toastById = family(AppScope, (_toastId: string, { signal }) =>
  signal(initialToastState),
);

function addToastAction(
  scope: Scope<typeof AppScope>,
  arg: AddToastArgs,
): void {
  const existingToastIds = scope.get(toastIds$);

  if (arg.customId != null) {
    const customIdPrefix = `${arg.customId}-`;
    for (const toastId of existingToastIds) {
      if (toastId.startsWith(customIdPrefix)) {
        scope.get(toastById, toastId).set((toast) => ({
          ...toast,
          isShown: false,
        }));
      }
    }
  }

  scope.set(nextToastId$, (value) => value + 1);
  scope.get(toastById, arg.id).set(arg.toast);
  scope.set(toastIds$, [
    arg.id,
    ...existingToastIds.filter((id) => id !== arg.id),
  ]);
}

function closeToastAction(
  scope: Scope<typeof AppScope>,
  toastId: string,
): void {
  scope.get(toastById, toastId).set((toast) => ({
    ...toast,
    isShown: false,
  }));
}

export function removeToastAction(
  scope: Scope<typeof AppScope>,
  toastId: string,
): void {
  toastOnRemoveById.get(toastId)?.();
  toastOnRemoveById.delete(toastId);
  scope.set(toastIds$, (toastIds) => {
    return toastIds.filter((currentToastId) => currentToastId !== toastId);
  });
}

function closeAllToastsAction(scope: Scope<typeof AppScope>): void {
  for (const toastId of scope.get(toastIds$)) {
    closeToastAction(scope, toastId);
  }
}

export function createToaster(scope: AppScopeHandle): Toaster {
  return {
    info(title, settings) {
      return showToast(scope, title, settings, "info");
    },
    success(title, settings) {
      return showToast(scope, title, settings, "success");
    },
    warning(title, settings) {
      return showToast(scope, title, settings, "warning");
    },
    danger(title, settings) {
      return showToast(scope, title, settings, "danger");
    },
    custom(settings) {
      return showToast(scope, null, settings, settings.level ?? "info");
    },
    closeAll() {
      closeAllToastsAction(scope);
    },
  };
}

function showToast(
  scope: AppScopeHandle,
  title: React.ReactNode,
  settings: ToastSettings | CustomToastSettings | undefined,
  level: ToastLevel,
): ToastHandle {
  const nextToastId = scope.get(nextToastId$);
  const id =
    settings?.id == null ? `${nextToastId}` : `${settings.id}-${nextToastId}`;
  const close = (): void => {
    closeToastAction(scope, id);
  };

  if (settings?.onRemove != null) {
    toastOnRemoveById.set(id, settings.onRemove);
  }

  addToastAction(scope, {
    customId: settings?.id,
    id,
    toast: {
      content:
        settings != null && "content" in settings
          ? settings.content({ close, level })
          : undefined,
      description: settings?.description,
      duration: settings?.duration ?? DEFAULT_DURATION_SECONDS,
      hasCloseButton: settings?.hasCloseButton ?? true,
      isShown: true,
      level,
      testId: settings?.testId,
      title,
    },
  });

  return { close };
}
