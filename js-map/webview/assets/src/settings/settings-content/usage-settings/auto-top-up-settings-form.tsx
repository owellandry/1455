import { useForm } from "@tanstack/react-form";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import clsx from "clsx";
import { useScope } from "maitai";
import { CODEX_HOME_URL, type RateLimitStatusPayload } from "protocol";
import type React from "react";
import { useId, useState } from "react";
import {
  defineMessage,
  FormattedMessage,
  useIntl,
  type IntlShape,
  type MessageDescriptor,
} from "react-intl";

import { Banner } from "@/components/banner";
import { Button } from "@/components/button";
import { Dialog, DialogTitle } from "@/components/dialog";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";
import { Spinner } from "@/components/spinner";
import { toast$ } from "@/components/toaster/toast-signal";
import CheckCircleFilledIcon from "@/icons/check-circle-filled.svg";
import LinkExternalIcon from "@/icons/link-external.svg";
import { isImmediateTopUpFailureStatus } from "@/queries/auto-top-up-settings-utils";
import {
  type AutoTopUpSettingsMutationResponse,
  useAutoTopUpBillingCurrency,
  useAutoTopUpPricingInfo,
  type AutoTopUpPricingInfo,
  type AutoTopUpSaveRequest,
} from "@/queries/usage-queries";
import type { AutoTopUpSettings } from "@/queries/usage-settings-types";
import { AppScope } from "@/scopes/app-scope";
import { SettingsGroup } from "@/settings/settings-group";
import { SettingsSurface } from "@/settings/settings-surface";
import { formatCurrencyAmount } from "@/utils/format-currency";
import { CodexRequest } from "@/utils/request";

import {
  AUTO_TOP_UP_MIN_TARGET_DIFFERENCE,
  AUTO_TOP_UP_MIN_THRESHOLD,
  getAutoTopUpDraftSaveState,
  getAutoTopUpDraftStateValidation,
  getAutoTopUpTargetDifference,
  trimAutoTopUpAmountValue,
  type AutoTopUpDraftState,
  type AutoTopUpFieldError,
  type AutoTopUpSaveIntent,
} from "./auto-top-up-form-state";

type AutoTopUpThresholdFieldError = Exclude<
  AutoTopUpFieldError,
  null | "target-difference-too-small"
>;

type AutoTopUpTargetFieldError = Exclude<
  AutoTopUpFieldError,
  null | "below-threshold-minimum"
>;

const AUTO_TOP_UP_TOAST_SETTINGS = {
  duration: 3,
};
const AUTO_TOP_UP_DEFAULT_THRESHOLD = String(AUTO_TOP_UP_MIN_THRESHOLD);
const AUTO_TOP_UP_DEFAULT_TARGET = String(
  AUTO_TOP_UP_MIN_THRESHOLD + AUTO_TOP_UP_MIN_TARGET_DIFFERENCE,
);
const CREDIT_PURCHASE_URL = `${CODEX_HOME_URL}/settings/usage?credit_modal=true`;
const DIALOG_ACTION_BUTTON_CLASS_NAME = "min-w-[88px] justify-center";

export function AutoTopUpSettingsForm({
  serverState,
  creditDetails,
  enableAutoTopUpMutation,
  updateAutoTopUpMutation,
  disableAutoTopUpMutation,
}: {
  serverState: AutoTopUpSettings;
  creditDetails: RateLimitStatusPayload["credits"] | null;
  enableAutoTopUpMutation: UseMutationResult<
    AutoTopUpSettingsMutationResponse,
    Error,
    AutoTopUpSaveRequest
  >;
  updateAutoTopUpMutation: UseMutationResult<
    AutoTopUpSettingsMutationResponse,
    Error,
    AutoTopUpSaveRequest
  >;
  disableAutoTopUpMutation: UseMutationResult<
    AutoTopUpSettingsMutationResponse,
    Error,
    void
  >;
}): React.ReactElement {
  const intl = useIntl();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isSaving =
    enableAutoTopUpMutation.isPending ||
    updateAutoTopUpMutation.isPending ||
    disableAutoTopUpMutation.isPending;

  return (
    <>
      <SettingsGroup>
        <SettingsGroup.Header
          title={
            <FormattedMessage
              id="settings.usage.credit.title"
              defaultMessage="Credit"
              description="Title for credit-related settings"
            />
          }
        />
        <SettingsGroup.Content>
          <SettingsSurface>
            <CreditSettingsRow
              title={getCreditRemainingTitle({
                intl,
                creditDetails,
              })}
              description={
                <FormattedMessage
                  id="settings.usage.credit.remaining.description"
                  defaultMessage="Use credit to send messages when you reach usage limits. <link>Doc</link>"
                  description="Description shown below the remaining credit row in usage settings"
                  values={{
                    link: (chunks) => (
                      <>
                        <a
                          href="https://developers.openai.com/codex/pricing"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-token-text-secondary hover:text-token-text-primary"
                        >
                          {chunks}
                          <LinkExternalIcon className="icon-xxs" />
                        </a>
                      </>
                    ),
                  }}
                />
              }
              action={
                <Button
                  color="secondary"
                  size="toolbar"
                  onClick={() => {
                    window.open(
                      CREDIT_PURCHASE_URL,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }}
                >
                  <FormattedMessage
                    id="settings.usage.credit.purchase"
                    defaultMessage="Purchase"
                    description="Button label to open the credit purchase flow"
                  />
                </Button>
              }
            />
            <CreditSettingsRow
              title={
                <div className="flex items-center gap-1.5">
                  <span>
                    <FormattedMessage
                      id="settings.usage.autoTopUp.title"
                      defaultMessage="Auto-reload credit"
                      description="Title for the auto top up settings row"
                    />
                  </span>
                  {serverState.isEnabled ? <AutoTopUpActiveBadge /> : null}
                </div>
              }
              description={
                <FormattedMessage
                  id="settings.usage.autoTopUp.description"
                  defaultMessage="Automatically add credit when you reach your minimum balance."
                  description="Description shown below the auto top up row in usage settings"
                />
              }
              action={
                <Button
                  color="secondary"
                  size="toolbar"
                  disabled={isSaving}
                  onClick={() => {
                    setIsDialogOpen(true);
                  }}
                >
                  <FormattedMessage
                    id="settings.usage.autoTopUp.settings"
                    defaultMessage="Settings"
                    description="Button label to open the auto top up settings dialog"
                  />
                </Button>
              }
            />
          </SettingsSurface>
        </SettingsGroup.Content>
      </SettingsGroup>

      {isDialogOpen ? (
        <AutoTopUpSettingsDialog
          open={isDialogOpen}
          serverState={serverState}
          creditDetails={creditDetails}
          enableAutoTopUpMutation={enableAutoTopUpMutation}
          updateAutoTopUpMutation={updateAutoTopUpMutation}
          disableAutoTopUpMutation={disableAutoTopUpMutation}
          onOpenChange={setIsDialogOpen}
        />
      ) : null}
    </>
  );
}

function AutoTopUpSettingsDialog({
  open,
  serverState,
  creditDetails,
  enableAutoTopUpMutation,
  updateAutoTopUpMutation,
  disableAutoTopUpMutation,
  onOpenChange,
}: {
  open: boolean;
  serverState: AutoTopUpSettings;
  creditDetails: RateLimitStatusPayload["credits"] | null;
  enableAutoTopUpMutation: UseMutationResult<
    AutoTopUpSettingsMutationResponse,
    Error,
    AutoTopUpSaveRequest
  >;
  updateAutoTopUpMutation: UseMutationResult<
    AutoTopUpSettingsMutationResponse,
    Error,
    AutoTopUpSaveRequest
  >;
  disableAutoTopUpMutation: UseMutationResult<
    AutoTopUpSettingsMutationResponse,
    Error,
    void
  >;
  onOpenChange: (nextOpen: boolean) => void;
}): React.ReactElement {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const {
    data: billingCurrency,
    isPending: isAutoTopUpBillingCurrencyPending,
  } = useAutoTopUpBillingCurrency({ enabled: open });
  const {
    data: autoTopUpPricingInfo,
    isPending: isAutoTopUpPricingInfoPending,
  } = useAutoTopUpPricingInfo({
    billingCurrency,
    enabled: open,
  });
  const isAutoTopUpPricingPending =
    isAutoTopUpBillingCurrencyPending || isAutoTopUpPricingInfoPending;
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();
  const thresholdInputId = useId();
  const targetInputId = useId();
  const isSavePending =
    enableAutoTopUpMutation.isPending || updateAutoTopUpMutation.isPending;
  const isDisablePending = disableAutoTopUpMutation.isPending;
  const isActionPending = isSavePending || isDisablePending;
  const [immediateTopUpFailureAmount, setImmediateTopUpFailureAmount] =
    useState<string | null>(null);
  const [hasImmediateTopUpFailure, setHasImmediateTopUpFailure] =
    useState(false);

  const showSaveErrorToast = (saveIntent: AutoTopUpSaveIntent): void => {
    scope.get(toast$).danger(
      intl.formatMessage(
        getSaveErrorMessageDescriptor({
          saveIntent,
        }),
      ),
      AUTO_TOP_UP_TOAST_SETTINGS,
    );
  };
  const showSaveSuccessToast = (
    saveIntent: Exclude<AutoTopUpSaveIntent, "none">,
  ): void => {
    scope.get(toast$).success(
      intl.formatMessage(
        getSaveSuccessMessageDescriptor({
          saveIntent,
        }),
      ),
      AUTO_TOP_UP_TOAST_SETTINGS,
    );
  };
  const clearImmediateTopUpFailure = (): void => {
    setHasImmediateTopUpFailure(false);
    setImmediateTopUpFailureAmount(null);
  };

  const handleImmediateTopUpFailure = ({
    draftState,
  }: {
    draftState: AutoTopUpDraftState;
  }): void => {
    setHasImmediateTopUpFailure(true);
    setImmediateTopUpFailureAmount(
      getImmediateTopUpEstimate({
        intl,
        creditBalance: creditDetails?.balance,
        rechargeThreshold: draftState.rechargeThreshold,
        rechargeTarget: draftState.rechargeTarget,
        pricingInfo: autoTopUpPricingInfo,
      })?.amount ?? null,
    );
  };

  const openManagePaymentMutation = useMutation({
    mutationKey: ["usage-settings", "auto-top-up", "manage-payment"],
    mutationFn: async (): Promise<{ url: string }> => {
      return (await CodexRequest.safeGet("/payments/customer_portal")) as {
        url: string;
      };
    },
    onSuccess: (response) => {
      window.open(response.url, "_blank", "noopener,noreferrer");
    },
    onError: () => {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "settings.usage.autoTopUp.managePayment.error",
          defaultMessage:
            "Unable to open payment settings right now. Please try again.",
          description:
            "Error shown when opening the manage payment flow from the auto top up settings dialog fails",
        }),
        AUTO_TOP_UP_TOAST_SETTINGS,
      );
    },
  });

  const handleOpenManagePayment = (): void => {
    if (openManagePaymentMutation.isPending) {
      return;
    }

    openManagePaymentMutation.mutate();
  };

  const form = useForm({
    defaultValues: {
      isEnabled: true,
      rechargeThreshold:
        serverState.rechargeThreshold ?? AUTO_TOP_UP_DEFAULT_THRESHOLD,
      rechargeTarget: serverState.rechargeTarget ?? AUTO_TOP_UP_DEFAULT_TARGET,
    },
    validators: {
      onChange: ({ value }) => {
        return getAutoTopUpFormValidationError(value);
      },
      onSubmit: ({ value }) => {
        return getAutoTopUpFormValidationError(value);
      },
    },
    onSubmit: async ({ value }) => {
      const draftSaveState = getAutoTopUpDraftSaveState({
        draftState: value,
        serverState,
        isSaving: isActionPending,
      });
      if (!draftSaveState.isSaveEnabled) {
        return;
      }

      switch (draftSaveState.saveIntent) {
        case "disable":
        case "none":
          return;
        case "enable":
          try {
            clearImmediateTopUpFailure();
            const response = await enableAutoTopUpMutation.mutateAsync(
              getAutoTopUpSavePayload(value),
            );
            if (
              isImmediateTopUpFailureStatus(response.immediate_top_up_status)
            ) {
              handleImmediateTopUpFailure({ draftState: value });
              return;
            }
            showSaveSuccessToast("enable");
            onOpenChange(false);
          } catch {
            showSaveErrorToast("enable");
          }
          return;
        case "update":
          try {
            clearImmediateTopUpFailure();
            const response = await updateAutoTopUpMutation.mutateAsync(
              getAutoTopUpSavePayload(value),
            );
            if (
              isImmediateTopUpFailureStatus(response.immediate_top_up_status)
            ) {
              handleImmediateTopUpFailure({ draftState: value });
              return;
            }
            showSaveSuccessToast("update");
            onOpenChange(false);
          } catch {
            showSaveErrorToast("update");
          }
          return;
      }
    },
  });

  const handleDialogOpenChange = (nextOpen: boolean): void => {
    if (isActionPending && !nextOpen) {
      return;
    }
    if (!nextOpen) {
      clearImmediateTopUpFailure();
    }
    onOpenChange(nextOpen);
  };

  const handleDisable = async (): Promise<void> => {
    if (!serverState.isEnabled) {
      return;
    }

    try {
      await disableAutoTopUpMutation.mutateAsync();
      showSaveSuccessToast("disable");
      onOpenChange(false);
    } catch {
      showSaveErrorToast("disable");
    }
  };

  return (
    <form.Subscribe
      selector={(
        state,
      ): {
        values: AutoTopUpDraftState;
        submissionAttempts: number;
      } => ({
        values: state.values,
        submissionAttempts: state.submissionAttempts,
      })}
    >
      {({ values, submissionAttempts }) => {
        const draftSaveState = getAutoTopUpDraftSaveState({
          draftState: values,
          serverState,
          isSaving: isActionPending,
        });
        const immediateTopUpEstimate = getImmediateTopUpEstimate({
          intl,
          creditBalance: creditDetails?.balance,
          rechargeThreshold: values.rechargeThreshold,
          rechargeTarget: values.rechargeTarget,
          pricingInfo: autoTopUpPricingInfo,
        });
        const immediateTopUpNoticeProps =
          !hasImmediateTopUpFailure &&
          immediateTopUpEstimate != null &&
          (draftSaveState.saveIntent === "enable" ||
            draftSaveState.saveIntent === "update")
            ? {
                saveIntent: draftSaveState.saveIntent,
                amount: immediateTopUpEstimate.amount,
                creditCount: immediateTopUpEstimate.creditCount,
              }
            : null;

        return (
          <Dialog
            open={open}
            size="default"
            contentClassName="w-[536px] max-w-[calc(100vw-2rem)]"
            contentProps={{
              "aria-describedby": dialogDescriptionId,
              onOpenAutoFocus: (event) => {
                event.preventDefault();
              },
            }}
            shouldIgnoreClickOutside={isActionPending}
            onOpenChange={handleDialogOpenChange}
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void form.handleSubmit();
              }}
            >
              <DialogBody className="gap-0 px-6 py-6">
                <DialogTitle asChild>
                  <h2 id={dialogTitleId} className="sr-only">
                    {intl.formatMessage({
                      id: "settings.usage.autoTopUp.dialog.title",
                      defaultMessage: "Auto-reload credit",
                      description: "Title for the auto top up settings dialog",
                    })}
                  </h2>
                </DialogTitle>
                <p id={dialogDescriptionId} className="sr-only">
                  {intl.formatMessage({
                    id: "settings.usage.autoTopUp.dialog.description",
                    defaultMessage:
                      "OpenAI will charge your payment method automatically when you reach your minimum balance.",
                    description:
                      "Description shown below the inputs in the auto top up settings dialog",
                  })}
                </p>
                <DialogSection>
                  <DialogHeader
                    title={
                      <FormattedMessage
                        id="settings.usage.autoTopUp.dialog.title"
                        defaultMessage="Auto-reload credit"
                        description="Title for the auto top up settings dialog"
                      />
                    }
                  />
                </DialogSection>
                <DialogSection className="gap-5">
                  <form.Field name="rechargeThreshold">
                    {(field) => {
                      const shouldShowThresholdError =
                        submissionAttempts > 0 || field.state.meta.isBlurred;
                      const thresholdError = shouldShowThresholdError
                        ? getAutoTopUpThresholdFieldErrorFromErrors(
                            field.state.meta.errors,
                          )
                        : null;

                      return (
                        <AutoTopUpDialogField
                          id={thresholdInputId}
                          label={
                            <FormattedMessage
                              id="settings.usage.autoTopUp.threshold.label"
                              defaultMessage="Minimum balance"
                              description="Label for the auto top up threshold input in the dialog"
                            />
                          }
                          value={field.state.value}
                          placeholder="125"
                          disabled={isActionPending}
                          hasError={thresholdError != null}
                          helperText={
                            <FormattedMessage
                              id="settings.usage.autoTopUp.threshold.helper"
                              defaultMessage="Auto top-up triggers when your credit balance goes below this amount."
                              description="Helper text shown below the minimum balance input in the auto top up dialog"
                            />
                          }
                          footerContent={getFieldErrorText({
                            fieldError: thresholdError,
                            fieldName: "threshold",
                            intl,
                          })}
                          footerTone="error"
                          ariaLabel={intl.formatMessage({
                            id: "settings.usage.autoTopUp.threshold.ariaLabel",
                            defaultMessage: "Auto-reload minimum balance",
                            description:
                              "Aria label for the auto top up threshold input",
                          })}
                          onBlur={field.handleBlur}
                          onChange={(nextValue) => {
                            clearImmediateTopUpFailure();
                            field.handleChange(nextValue);
                          }}
                        />
                      );
                    }}
                  </form.Field>
                  <form.Field name="rechargeTarget">
                    {(field) => {
                      const shouldShowTargetError =
                        submissionAttempts > 0 || field.state.meta.isBlurred;
                      const targetError = shouldShowTargetError
                        ? getAutoTopUpTargetFieldErrorFromErrors(
                            field.state.meta.errors,
                          )
                        : null;
                      const minimumPurchaseEquivalent =
                        getAutoTopUpEquivalentPricing({
                          intl,
                          rechargeThreshold: values.rechargeThreshold,
                          rechargeTarget: field.state.value,
                          pricingInfo: autoTopUpPricingInfo,
                        });

                      return (
                        <AutoTopUpDialogField
                          id={targetInputId}
                          label={
                            <FormattedMessage
                              id="settings.usage.autoTopUp.target.label"
                              defaultMessage="Target balance"
                              description="Label for the auto top up target balance input in the dialog"
                            />
                          }
                          value={field.state.value}
                          placeholder="250"
                          disabled={isActionPending}
                          hasError={targetError != null}
                          helperText={
                            <FormattedMessage
                              id="settings.usage.autoTopUp.target.helper"
                              defaultMessage="Auto top-up brings your credit balance back up to this amount."
                              description="Helper text shown below the target balance input in the auto top up dialog"
                            />
                          }
                          footerContent={
                            targetError != null ? (
                              getFieldErrorText({
                                fieldError: targetError,
                                fieldName: "target",
                                intl,
                              })
                            ) : isAutoTopUpPricingPending ? (
                              <AutoTopUpPricingLoadingIndicator intl={intl} />
                            ) : minimumPurchaseEquivalent != null ? (
                              <FormattedMessage
                                id="settings.usage.autoTopUp.target.equivalent"
                                defaultMessage="Minimum {creditCount, number} credit will be purchased, equivalent to <strong>{amount}</strong>"
                                description="Message shown below the target balance input with the estimated minimum billing amount"
                                values={{
                                  creditCount:
                                    minimumPurchaseEquivalent.creditCount,
                                  amount: minimumPurchaseEquivalent.amount,
                                  strong: (chunks) => (
                                    <span className="font-medium text-token-text-primary">
                                      {chunks}
                                    </span>
                                  ),
                                }}
                              />
                            ) : null
                          }
                          footerTone={
                            targetError != null ? "error" : "secondary"
                          }
                          ariaLabel={intl.formatMessage({
                            id: "settings.usage.autoTopUp.target.ariaLabel",
                            defaultMessage: "Auto-reload target balance",
                            description:
                              "Aria label for the auto top up target balance input",
                          })}
                          onBlur={field.handleBlur}
                          onChange={(nextValue) => {
                            clearImmediateTopUpFailure();
                            field.handleChange(nextValue);
                          }}
                        />
                      );
                    }}
                  </form.Field>
                  <div className="text-sm leading-5 text-token-text-secondary">
                    <FormattedMessage
                      id="settings.usage.autoTopUp.dialog.description"
                      defaultMessage="OpenAI will charge your payment method automatically when you reach your minimum balance."
                      description="Description shown below the inputs in the auto top up settings dialog"
                    />
                  </div>
                  {immediateTopUpNoticeProps != null ? (
                    <ImmediateTopUpNoticeBanner
                      saveIntent={immediateTopUpNoticeProps.saveIntent}
                      amount={immediateTopUpNoticeProps.amount}
                      creditCount={immediateTopUpNoticeProps.creditCount}
                    />
                  ) : null}
                  {hasImmediateTopUpFailure ? (
                    <ImmediateTopUpFailureBanner
                      amount={immediateTopUpFailureAmount}
                      isManagePaymentPending={
                        openManagePaymentMutation.isPending
                      }
                      onManagePaymentClick={handleOpenManagePayment}
                    />
                  ) : null}
                </DialogSection>
                <DialogSection className="pt-7">
                  <DialogFooter>
                    {serverState.isEnabled ? (
                      <Button
                        color="outline"
                        className={DIALOG_ACTION_BUTTON_CLASS_NAME}
                        loading={isDisablePending}
                        disabled={isActionPending}
                        onClick={handleDisable}
                      >
                        <FormattedMessage
                          id="settings.usage.autoTopUp.disable"
                          defaultMessage="Turn off"
                          description="Button label to disable auto top up"
                        />
                      </Button>
                    ) : (
                      <Button
                        color="outline"
                        className={DIALOG_ACTION_BUTTON_CLASS_NAME}
                        disabled={isActionPending}
                        onClick={() => {
                          onOpenChange(false);
                        }}
                      >
                        <FormattedMessage
                          id="settings.usage.autoTopUp.cancel"
                          defaultMessage="Cancel"
                          description="Button label to close the auto top up dialog without saving"
                        />
                      </Button>
                    )}
                    <Button
                      color="primary"
                      type="submit"
                      className={DIALOG_ACTION_BUTTON_CLASS_NAME}
                      loading={isSavePending}
                      disabled={!draftSaveState.isSaveEnabled}
                    >
                      {serverState.isEnabled ? (
                        <FormattedMessage
                          id="settings.usage.autoTopUp.save"
                          defaultMessage="Save"
                          description="Button label to save auto top up settings"
                        />
                      ) : (
                        <FormattedMessage
                          id="settings.usage.autoTopUp.enable"
                          defaultMessage="Turn on"
                          description="Button label to enable auto top up"
                        />
                      )}
                    </Button>
                  </DialogFooter>
                </DialogSection>
              </DialogBody>
            </form>
          </Dialog>
        );
      }}
    </form.Subscribe>
  );
}

function CreditSettingsRow({
  title,
  description,
  action,
}: {
  title: React.ReactNode;
  description: React.ReactNode;
  action: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="text-sm text-token-text-primary">{title}</div>
        <div className="text-sm text-token-text-secondary">{description}</div>
      </div>
      <div className="flex shrink-0 items-center">{action}</div>
    </div>
  );
}

function AutoTopUpActiveBadge(): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-token-charts-green">
      <CheckCircleFilledIcon className="icon-2xs shrink-0" />
      <FormattedMessage
        id="settings.usage.autoTopUp.status.active"
        defaultMessage="Active"
        description="Badge label shown when auto top up is enabled"
      />
    </span>
  );
}

function ImmediateTopUpNoticeBanner({
  saveIntent,
  amount,
  creditCount,
}: {
  saveIntent: Extract<AutoTopUpSaveIntent, "enable" | "update">;
  amount: string;
  creditCount: number;
}): React.ReactElement {
  return (
    <Banner
      type="normal"
      layout="vertical"
      content={
        saveIntent === "enable" ? (
          <FormattedMessage
            id="settings.usage.autoTopUp.immediateTopUpNotice.enable"
            defaultMessage="Enabling auto top-up will trigger a one-time purchase of {creditCount, number} credit to reach your target balance. Estimated cost: <strong>{amount}</strong>."
            description="Informational banner shown before enabling auto top up when a one-time immediate top up will occur"
            values={{
              amount,
              creditCount,
              strong: (chunks) => (
                <span className="font-medium text-token-text-primary">
                  {chunks}
                </span>
              ),
            }}
          />
        ) : (
          <FormattedMessage
            id="settings.usage.autoTopUp.immediateTopUpNotice.update"
            defaultMessage="Updating your settings will trigger a one-time purchase of {creditCount, number} credit with an estimated cost of <strong>{amount}</strong>."
            description="Informational banner shown before updating auto top up when a one-time immediate top up will occur"
            values={{
              amount,
              creditCount,
              strong: (chunks) => (
                <span className="font-medium text-token-text-primary">
                  {chunks}
                </span>
              ),
            }}
          />
        )
      }
    />
  );
}

function ImmediateTopUpFailureBanner({
  amount,
  isManagePaymentPending,
  onManagePaymentClick,
}: {
  amount: string | null;
  isManagePaymentPending: boolean;
  onManagePaymentClick: () => void;
}): React.ReactElement {
  return (
    <Banner
      type="error"
      layout="vertical"
      content={
        amount == null ? (
          <FormattedMessage
            id="settings.usage.autoTopUp.immediateTopUpFailure.generic"
            defaultMessage="The initial top-up failed. <actionLine><managePayment>Update your payment method</managePayment> or <purchaseCredit>purchase credit directly</purchaseCredit>.</actionLine>"
            description="Inline error shown in the auto top up settings dialog when the initial top up attempt fails without a price estimate"
            values={{
              actionLine: (chunks) => <div className="mt-1">{chunks}</div>,
              managePayment: (chunks) => (
                <a
                  href="#"
                  className={clsx(
                    "font-medium underline underline-offset-2",
                    isManagePaymentPending && "pointer-events-none opacity-60",
                  )}
                  aria-disabled={isManagePaymentPending}
                  onClick={(event) => {
                    event.preventDefault();
                    onManagePaymentClick();
                  }}
                >
                  {chunks}
                </a>
              ),
              purchaseCredit: (chunks) => (
                <a
                  href={CREDIT_PURCHASE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2"
                >
                  {chunks}
                </a>
              ),
            }}
          />
        ) : (
          <FormattedMessage
            id="settings.usage.autoTopUp.immediateTopUpFailure.amount"
            defaultMessage="The initial top-up for an estimated {amount} failed. <actionLine><managePayment>Update your payment method</managePayment> or <purchaseCredit>purchase credit directly</purchaseCredit>.</actionLine>"
            description="Inline error shown in the auto top up settings dialog when the initial top up attempt fails and a price estimate is available"
            values={{
              amount,
              actionLine: (chunks) => <div className="mt-1">{chunks}</div>,
              managePayment: (chunks) => (
                <a
                  href="#"
                  className={clsx(
                    "font-medium underline underline-offset-2",
                    isManagePaymentPending && "pointer-events-none opacity-60",
                  )}
                  aria-disabled={isManagePaymentPending}
                  onClick={(event) => {
                    event.preventDefault();
                    onManagePaymentClick();
                  }}
                >
                  {chunks}
                </a>
              ),
              purchaseCredit: (chunks) => (
                <a
                  href={CREDIT_PURCHASE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2"
                >
                  {chunks}
                </a>
              ),
            }}
          />
        )
      }
    />
  );
}

function AutoTopUpDialogField({
  id,
  label,
  value,
  placeholder,
  disabled,
  hasError,
  helperText,
  footerContent,
  footerTone = "secondary",
  ariaLabel,
  onChange,
  onBlur,
}: {
  id: string;
  label: React.ReactNode;
  value: string;
  placeholder: string;
  disabled: boolean;
  hasError: boolean;
  helperText?: React.ReactNode;
  footerContent?: React.ReactNode;
  footerTone?: "error" | "secondary";
  ariaLabel: string;
  onChange: (nextValue: string) => void;
  onBlur: () => void;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-lg text-token-text-secondary">
        {label}
      </label>
      {helperText ? (
        <div className="text-sm leading-4 text-token-text-secondary">
          {helperText}
        </div>
      ) : null}
      <AutoTopUpAmountInput
        id={id}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        hasError={hasError}
        ariaLabel={ariaLabel}
        onBlur={onBlur}
        onChange={onChange}
      />
      {footerContent != null ? (
        <div
          className={clsx(
            "text-sm",
            footerTone === "error"
              ? "text-token-error-foreground"
              : "text-token-text-secondary",
          )}
        >
          {footerContent}
        </div>
      ) : null}
    </div>
  );
}

function AutoTopUpPricingLoadingIndicator({
  intl,
}: {
  intl: IntlShape;
}): React.ReactElement {
  return (
    <span
      role="status"
      aria-label={intl.formatMessage({
        id: "settings.usage.autoTopUp.target.equivalent.loading",
        defaultMessage: "Loading price",
        description:
          "Accessible label announced while the auto top up price estimate is loading",
      })}
      className="inline-flex items-center"
    >
      <Spinner className="icon-xxs text-token-description-foreground" />
    </span>
  );
}

function AutoTopUpAmountInput({
  id,
  value,
  placeholder,
  disabled,
  hasError,
  ariaLabel,
  onChange,
  onBlur,
}: {
  id: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  hasError: boolean;
  ariaLabel: string;
  onChange: (nextValue: string) => void;
  onBlur: () => void;
}): React.ReactElement {
  return (
    <input
      id={id}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={ariaLabel}
      aria-invalid={hasError}
      className={clsx(
        "bg-token-input-background text-token-text-primary placeholder:text-token-input-placeholder-foreground h-10 w-full rounded-lg border border-token-border px-3 text-left text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-token-focus",
        "aria-invalid:border-token-error-foreground aria-invalid:ring-token-error-foreground/20",
      )}
      onChange={(event): void => {
        onChange(event.currentTarget.value);
      }}
      onBlur={onBlur}
    />
  );
}

function getCreditRemainingTitle({
  intl,
  creditDetails,
}: {
  intl: IntlShape;
  creditDetails: RateLimitStatusPayload["credits"] | null;
}): string {
  if (creditDetails == null) {
    return intl.formatMessage({
      id: "settings.usage.credit.remaining.unavailable",
      defaultMessage: "Credit remaining unavailable",
      description:
        "Fallback title shown when the remaining credit is unavailable",
    });
  }

  if (creditDetails.unlimited) {
    return intl.formatMessage({
      id: "settings.usage.credit.remaining.unlimited",
      defaultMessage: "Unlimited credit",
      description: "Title shown when the account has unlimited credit",
    });
  }

  return intl.formatMessage(
    {
      id: "settings.usage.credit.remaining.value",
      defaultMessage: "{credit} credit remaining",
      description: "Title shown for the remaining credit row in usage settings",
    },
    {
      credit: formatCreditBalance(intl, creditDetails.balance),
    },
  );
}

function formatCreditBalance(
  intl: IntlShape,
  creditBalance: string | null | undefined,
): string {
  return intl.formatNumber(getCreditBalance(creditBalance), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    maximumSignificantDigits: 10,
  });
}

function getCreditBalance(creditBalance: string | null | undefined): number {
  return Math.floor(Number(creditBalance ?? 0));
}

function getAutoTopUpEquivalentPricing({
  intl,
  rechargeThreshold,
  rechargeTarget,
  pricingInfo,
}: {
  intl: IntlShape;
  rechargeThreshold: string;
  rechargeTarget: string;
  pricingInfo: AutoTopUpPricingInfo | null | undefined;
}): {
  creditCount: number;
  amount: string;
} | null {
  if (pricingInfo == null) {
    return null;
  }

  const targetDifference = getAutoTopUpTargetDifference({
    rechargeThreshold,
    rechargeTarget,
  });
  if (targetDifference == null) {
    return null;
  }

  return {
    creditCount: targetDifference,
    amount: formatCurrencyAmount({
      intl,
      amount: targetDifference * pricingInfo.amountPerCredit,
      currencyCode: pricingInfo.currencyCode,
      currencyFractionDigits: pricingInfo.minorUnitExponent,
    }),
  };
}

function getImmediateTopUpEstimate({
  intl,
  creditBalance,
  rechargeThreshold,
  rechargeTarget,
  pricingInfo,
}: {
  intl: IntlShape;
  creditBalance: string | null | undefined;
  rechargeThreshold: string;
  rechargeTarget: string;
  pricingInfo: AutoTopUpPricingInfo | null | undefined;
}): {
  amount: string;
  creditCount: number;
} | null {
  if (pricingInfo == null) {
    return null;
  }

  const currentBalance = getCreditBalance(creditBalance);

  const parsedThreshold = Number(trimAutoTopUpAmountValue(rechargeThreshold));
  const parsedTarget = Number(trimAutoTopUpAmountValue(rechargeTarget));

  if (currentBalance >= parsedThreshold) {
    return null;
  }

  const creditCount = Math.ceil(parsedTarget - currentBalance);
  if (creditCount <= 0) {
    return null;
  }

  return {
    amount: formatCurrencyAmount({
      intl,
      amount: creditCount * pricingInfo.amountPerCredit,
      currencyCode: pricingInfo.currencyCode,
      currencyFractionDigits: pricingInfo.minorUnitExponent,
    }),
    creditCount,
  };
}

function getAutoTopUpFormValidationError({
  rechargeThreshold,
  rechargeTarget,
}: {
  rechargeThreshold: string;
  rechargeTarget: string;
}):
  | {
      fields: Partial<
        Record<
          "rechargeThreshold" | "rechargeTarget",
          Exclude<AutoTopUpFieldError, null>
        >
      >;
    }
  | undefined {
  const validation = getAutoTopUpDraftStateValidation({
    rechargeThreshold,
    rechargeTarget,
  });
  if (
    validation.rechargeThresholdError == null &&
    validation.rechargeTargetError == null
  ) {
    return undefined;
  }

  return {
    fields: {
      rechargeThreshold: validation.rechargeThresholdError ?? undefined,
      rechargeTarget: validation.rechargeTargetError ?? undefined,
    },
  };
}

function getAutoTopUpThresholdFieldErrorFromErrors(
  errors: Array<unknown> | undefined,
): AutoTopUpThresholdFieldError | null {
  if (errors == null) {
    return null;
  }

  for (const error of errors) {
    if (isAutoTopUpThresholdFieldError(error)) {
      return error;
    }
  }

  return null;
}

function getAutoTopUpTargetFieldErrorFromErrors(
  errors: Array<unknown> | undefined,
): AutoTopUpTargetFieldError | null {
  if (errors == null) {
    return null;
  }

  for (const error of errors) {
    if (isAutoTopUpTargetFieldError(error)) {
      return error;
    }
  }

  return null;
}

function isAutoTopUpThresholdFieldError(
  value: unknown,
): value is AutoTopUpThresholdFieldError {
  return (
    value === "missing" ||
    value === "not-whole-number" ||
    value === "below-threshold-minimum"
  );
}

function isAutoTopUpTargetFieldError(
  value: unknown,
): value is AutoTopUpTargetFieldError {
  return (
    value === "missing" ||
    value === "not-whole-number" ||
    value === "target-difference-too-small"
  );
}

function getFieldErrorText(
  props:
    | {
        fieldError: AutoTopUpThresholdFieldError | null;
        fieldName: "threshold";
        intl: IntlShape;
      }
    | {
        fieldError: AutoTopUpTargetFieldError | null;
        fieldName: "target";
        intl: IntlShape;
      },
): string | null {
  if (props.fieldError == null) {
    return null;
  }

  switch (props.fieldName) {
    case "threshold":
      return props.intl.formatMessage(
        getFieldErrorMessageDescriptor({
          fieldError: props.fieldError,
          fieldName: "threshold",
        }),
      );
    case "target":
      return props.intl.formatMessage(
        getFieldErrorMessageDescriptor({
          fieldError: props.fieldError,
          fieldName: "target",
        }),
      );
  }
}

function getFieldErrorMessageDescriptor(
  props:
    | {
        fieldError: AutoTopUpThresholdFieldError;
        fieldName: "threshold";
      }
    | {
        fieldError: AutoTopUpTargetFieldError;
        fieldName: "target";
      },
): MessageDescriptor {
  switch (props.fieldName) {
    case "threshold": {
      const { fieldError } = props;
      if (fieldError === "missing") {
        return defineMessage({
          id: "settings.usage.autoTopUp.threshold.error.missing",
          defaultMessage: "Enter a minimum balance (at least 125 credit).",
          description:
            "Validation message when the auto top up threshold is empty",
        });
      }

      switch (fieldError) {
        case "not-whole-number":
          return defineMessage({
            id: "settings.usage.autoTopUp.threshold.error.wholeNumber",
            defaultMessage: "Minimum balance must be a whole number.",
            description:
              "Validation message when the auto top up threshold is not a whole number",
          });
        case "below-threshold-minimum":
          return defineMessage({
            id: "settings.usage.autoTopUp.threshold.error.minimum",
            defaultMessage: "Set the minimum balance to at least 125 credit.",
            description:
              "Validation message when the auto top up threshold is below the minimum allowed value",
          });
      }
    }
    case "target": {
      const { fieldError } = props;
      switch (fieldError) {
        case "missing":
          return defineMessage({
            id: "settings.usage.autoTopUp.target.error.missing",
            defaultMessage: "Enter a target balance.",
            description:
              "Validation message when the auto top up target balance is empty",
          });
        case "not-whole-number":
          return defineMessage({
            id: "settings.usage.autoTopUp.target.error.wholeNumber",
            defaultMessage: "Target balance must be a whole number.",
            description:
              "Validation message when the auto top up target balance is not a whole number",
          });
        case "target-difference-too-small":
          return defineMessage({
            id: "settings.usage.autoTopUp.target.error.minimumDifference",
            defaultMessage:
              "Set the target balance to at least 125 credit above the minimum balance.",
            description:
              "Validation message when the auto top up target balance is too close to the minimum balance",
          });
      }
    }
  }
}

function getSaveErrorMessageDescriptor({
  saveIntent,
}: {
  saveIntent: AutoTopUpSaveIntent;
}): MessageDescriptor {
  switch (saveIntent) {
    case "enable":
      return defineMessage({
        id: "settings.usage.autoTopUp.enable.error",
        defaultMessage: "Failed to enable auto top up",
        description: "Toast shown when enabling auto top up fails",
      });
    case "update":
      return defineMessage({
        id: "settings.usage.autoTopUp.update.error",
        defaultMessage: "Failed to update auto top up",
        description: "Toast shown when updating auto top up fails",
      });
    case "disable":
      return defineMessage({
        id: "settings.usage.autoTopUp.disable.error",
        defaultMessage: "Failed to disable auto top up",
        description: "Toast shown when disabling auto top up fails",
      });
    case "none":
      return defineMessage({
        id: "settings.usage.autoTopUp.save.error",
        defaultMessage: "Failed to save auto top up settings",
        description:
          "Fallback toast shown when saving auto top up settings fails",
      });
  }
}

function getSaveSuccessMessageDescriptor({
  saveIntent,
}: {
  saveIntent: Exclude<AutoTopUpSaveIntent, "none">;
}): MessageDescriptor {
  switch (saveIntent) {
    case "enable":
      return defineMessage({
        id: "settings.usage.autoTopUp.enable.success",
        defaultMessage: "Enabled auto top-up",
        description: "Toast shown when enabling auto top up succeeds",
      });
    case "update":
      return defineMessage({
        id: "settings.usage.autoTopUp.update.success",
        defaultMessage: "Updated auto top-up settings",
        description: "Toast shown when updating auto top up succeeds",
      });
    case "disable":
      return defineMessage({
        id: "settings.usage.autoTopUp.disable.success",
        defaultMessage: "Disabled auto top-up",
        description: "Toast shown when disabling auto top up succeeds",
      });
  }
}

function getAutoTopUpSavePayload(
  draftState: AutoTopUpDraftState,
): AutoTopUpSaveRequest {
  return {
    recharge_threshold: trimAutoTopUpAmountValue(draftState.rechargeThreshold),
    recharge_target: trimAutoTopUpAmountValue(draftState.rechargeTarget),
  };
}
