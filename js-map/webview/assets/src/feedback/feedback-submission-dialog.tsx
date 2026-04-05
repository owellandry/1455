import clsx from "clsx";
import type React from "react";
import { useEffect, useEffectEvent, useState } from "react";
import type { MessageDescriptor } from "react-intl";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { Dialog } from "@/components/dialog";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
  FieldStack,
  FormRow,
} from "@/components/dialog-layout";
import CheckIcon from "@/icons/check-md.svg";
import CommentIcon from "@/icons/comment.svg";
import PlusIcon from "@/icons/plus.svg";

export type FeedbackCategory =
  | "bug"
  | "bad-result"
  | "good-result"
  | "safety_check"
  | "other";

export type FeedbackSubmission = {
  classification: FeedbackCategory;
  description: string;
  includeLogs: boolean;
};

const categoryMessages = defineMessages({
  bug: {
    id: "feedback.dialog.category.bug",
    defaultMessage: "Bug",
    description: "Category label for reporting a bug",
  },
  badResult: {
    id: "feedback.dialog.category.badResult",
    defaultMessage: "Bad result",
    description: "Category label for reporting a bad result",
  },
  goodResult: {
    id: "feedback.dialog.category.goodResult",
    defaultMessage: "Good result",
    description: "Category label for reporting a good result",
  },
  safetyCheck: {
    id: "feedback.dialog.category.safetyCheck",
    defaultMessage: "Safety check",
    description: "Category label for safety-check feedback",
  },
  other: {
    id: "feedback.dialog.category.other",
    defaultMessage: "Other",
    description: "Category label for reporting other types of feedback",
  },
});

const CATEGORY_OPTIONS: Array<{
  key: FeedbackCategory;
  message: MessageDescriptor;
}> = [
  {
    key: "bug",
    message: categoryMessages.bug,
  },
  {
    key: "bad-result",
    message: categoryMessages.badResult,
  },
  {
    key: "good-result",
    message: categoryMessages.goodResult,
  },
  {
    key: "safety_check",
    message: categoryMessages.safetyCheck,
  },
  {
    key: "other",
    message: categoryMessages.other,
  },
];

export function FeedbackSubmissionDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (submission: FeedbackSubmission) => void | Promise<void>;
  isSubmitting: boolean;
}): React.ReactElement {
  const intl = useIntl();
  const [selectedCategory, setSelectedCategory] =
    useState<FeedbackCategory>("bug");
  const [description, setDescription] = useState("");
  const [includeLogs, setIncludeLogs] = useState(true);
  const descriptionPlaceholder = intl.formatMessage({
    id: "feedback.dialog.descriptionPlaceholder",
    defaultMessage: "Describe the issue here",
    description: "Placeholder text for the feedback description textarea",
  });
  const trimmedDescription = description.trim();

  const resetState = useEffectEvent(() => {
    setDescription("");
    setIncludeLogs(true);
    setSelectedCategory("bug");
  });

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    if (trimmedDescription.length === 0) {
      return;
    }

    await onSubmit({
      classification: selectedCategory,
      description: trimmedDescription,
      includeLogs,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form className="flex flex-col gap-0" onSubmit={handleSubmit}>
        <DialogBody>
          <DialogSection>
            <DialogHeader
              icon={<CommentIcon className="icon-base text-token-foreground" />}
              title={
                <FormattedMessage
                  id="feedback.dialog.title"
                  defaultMessage="Feedback"
                  description="Title shown at the top of the feedback dialog"
                />
              }
            />
          </DialogSection>
          <DialogSection>
            <FieldStack className="gap-3">
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((option) => {
                  const isSelected = selectedCategory === option.key;
                  const Icon = isSelected ? CheckIcon : PlusIcon;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(option.key);
                      }}
                      className={clsx(
                        "border-token-border cursor-interaction flex items-center gap-1 rounded-full border px-3 py-1 transition",
                        "focus-visible:ring-token-focus-border focus-visible:outline-none focus-visible:ring-1",
                        isSelected
                          ? "bg-token-foreground text-token-dropdown-background"
                          : "text-token-foreground hover:bg-token-menu-background/60",
                      )}
                      aria-pressed={isSelected}
                    >
                      <Icon className="icon-xxs" />
                      <FormattedMessage {...option.message} />
                    </button>
                  );
                })}
              </div>
              <textarea
                className="min-h-[120px] w-full rounded-2xl border border-token-border px-3 py-2 text-token-input-foreground shadow-sm outline-none focus:ring-1 focus:ring-token-focus-border"
                placeholder={descriptionPlaceholder}
                aria-label={descriptionPlaceholder}
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                }}
              />
              <FormRow className="text-token-description-foreground">
                <Checkbox
                  id="feedback-include-logs"
                  checked={includeLogs}
                  onCheckedChange={(checked) => {
                    setIncludeLogs(!!checked);
                  }}
                />
                <label htmlFor="feedback-include-logs">
                  <FormattedMessage
                    id="feedback.dialog.includeLogsLabel"
                    defaultMessage="Include current Codex session logs"
                    description="Label for the checkbox that toggles including session logs"
                  />
                </label>
              </FormRow>
            </FieldStack>
          </DialogSection>
          <DialogSection>
            <DialogFooter>
              <Button
                color="primary"
                loading={isSubmitting}
                type="submit"
                disabled={trimmedDescription.length === 0}
              >
                <FormattedMessage
                  id="feedback.dialog.submit"
                  defaultMessage="Submit"
                  description="Label for the button that submits feedback"
                />
              </Button>
            </DialogFooter>
          </DialogSection>
        </DialogBody>
      </form>
    </Dialog>
  );
}
