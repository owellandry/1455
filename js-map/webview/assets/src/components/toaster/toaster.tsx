// https://github.com/openai/openai/blob/master/chatgpt/web/src/components/toaster/toaster.tsx

import { useFamilySignal, useScope, useSignal } from "maitai";
import type React from "react";
import type { PropsWithChildren } from "react";
import { useLayoutEffect } from "react";

import { AppScope } from "@/scopes/app-scope";

import { Toast } from "./toast";
import {
  createToaster,
  removeToastAction,
  toast$,
  toastById,
  toastIds$,
} from "./toast-signal";

function ToastArea(): React.ReactElement {
  const toastIds = useSignal(toastIds$);

  return (
    <span className="pointer-events-none fixed inset-0 z-[60] mx-auto my-2 flex max-w-[560px] flex-col items-center justify-start md:pb-5">
      {toastIds.map((toastId) => (
        <ToastItem key={toastId} toastId={toastId} />
      ))}
    </span>
  );
}

function ToastItem({ toastId }: { toastId: string }): React.ReactElement {
  const toast = useFamilySignal(toastById, toastId);
  const scope = useScope(AppScope);

  return (
    <Toast
      content={toast.content}
      description={toast.description}
      duration={toast.duration}
      hasCloseButton={toast.hasCloseButton}
      isShown={toast.isShown}
      level={toast.level}
      onRemove={() => removeToastAction(scope, toastId)}
      testId={toast.testId}
      title={toast.title}
    />
  );
}

export function ToastManager({
  children,
}: PropsWithChildren): React.ReactElement {
  const scope = useScope(AppScope);

  useLayoutEffect(() => {
    scope.set(toast$, createToaster(scope));
  }, [scope]);

  return (
    <>
      {children}
      <ToastArea />
    </>
  );
}
