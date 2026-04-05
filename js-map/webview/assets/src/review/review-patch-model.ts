import { signal, type Scope } from "maitai";

import type { HunkActionParams } from "@/diff/code-diff";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";

import type { DiffFilter } from "./diff-filter";
import { reviewSkipRevertConfirmation$ } from "./review-preferences-model";

export const pendingPatchAction$ = signal<
  typeof ThreadRouteScope,
  HunkActionParams | null
>(ThreadRouteScope, null);

export const isRevertDialogOpen$ = signal<typeof ThreadRouteScope, boolean>(
  ThreadRouteScope,
  false,
);

export const revertDialogSkipChecked$ = signal<
  typeof ThreadRouteScope,
  boolean
>(ThreadRouteScope, false);

export function requestPatchAction(
  scope: Scope<typeof ThreadRouteScope>,
  arg: HunkActionParams,
): void {
  scope.set(revertDialogSkipChecked$, false);
  scope.set(pendingPatchAction$, arg);

  if (arg.action === "revert" && !scope.get(reviewSkipRevertConfirmation$)) {
    scope.set(isRevertDialogOpen$, true);
    return;
  }

  scope.set(isRevertDialogOpen$, false);
}

export function setRevertDialogSkipChecked(
  scope: Scope<typeof ThreadRouteScope>,
  checked: boolean,
): void {
  scope.set(revertDialogSkipChecked$, checked);
}

export function closeRevertDialog(scope: Scope<typeof ThreadRouteScope>): void {
  scope.set(isRevertDialogOpen$, false);
  scope.set(pendingPatchAction$, null);
  scope.set(revertDialogSkipChecked$, false);
}

export function confirmRevert(scope: Scope<typeof ThreadRouteScope>): void {
  const pendingPatchAction = scope.get(pendingPatchAction$);
  if (pendingPatchAction == null) {
    scope.set(isRevertDialogOpen$, false);
    scope.set(pendingPatchAction$, null);
    scope.set(revertDialogSkipChecked$, false);
    return;
  }

  if (scope.get(revertDialogSkipChecked$)) {
    scope.set(reviewSkipRevertConfirmation$, true);
  }

  scope.set(isRevertDialogOpen$, false);
  scope.set(revertDialogSkipChecked$, false);
}

export function clearPendingPatchAction(
  scope: Scope<typeof ThreadRouteScope>,
): void {
  scope.set(pendingPatchAction$, null);
}

export function getReviewEffectiveStageFilter(
  diffFilter: DiffFilter,
): "staged" | "unstaged" {
  return diffFilter === "staged" ? "staged" : "unstaged";
}
