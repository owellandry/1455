import clsx from "clsx";
import type {
  ChangeEvent,
  MouseEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from "react";
import { useEffect, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import ArrowUpIcon from "@/icons/arrow-up.svg";
import ChevronIcon from "@/icons/chevron.svg";
import InfoIcon from "@/icons/info.svg";
import { useHotkey } from "@/keyboard-shortcuts/use-hotkey";

export type RequestInputPanelAnswer = {
  selectedOptionId: string | null;
  freeformText: string | null;
};

export type RequestInputPanelAnswers = Array<RequestInputPanelAnswer>;

type QuestionAndOption = {
  question: ReactNode;
  isOther?: boolean;
  options: Array<{
    id: string;
    value: ReactNode;
    ariaLabel?: string;
    description?: ReactNode;
  }>;
};

const TERMINAL_HOTKEY_IGNORE_WITHIN = "[data-codex-terminal]";

function buildInitialAnswers(
  questionAndOptions: Array<QuestionAndOption>,
): RequestInputPanelAnswers {
  return questionAndOptions.map((question) => {
    const selectedOptionId = question.options[0]?.id ?? null;
    return {
      selectedOptionId,
      freeformText: null,
    };
  });
}

export function RequestInputPanel({
  className,
  header,
  body,
  questionAndOptions,
  onSubmit,
  onSkip,
  onEscapeDissmiss,
  isSubmitting = false,
  isPlanMode = false,
}: {
  /** Optional className applied to the panel root. */
  className?: string;
  /** Optional header override; falls back to the current question text. */
  header?: ReactNode;
  /** Optional body content rendered beneath the header. */
  body?: ReactNode;
  /** The ordered list of questions (and options) to present. */
  questionAndOptions: Array<QuestionAndOption>;
  /** Called when the panel submits final answers. */
  onSubmit: (answers: RequestInputPanelAnswers) => void;
  /** Optional secondary action rendered next to submit. */
  onSkip?: () => void;
  /**
   * Called when the panel is dismissed. Only works when `questionAndOptions.length === 1`.
   */
  onEscapeDissmiss?: () => void;
  /** Shows a loading state on the primary action button. */
  isSubmitting?: boolean;
  /** Whether to render the primary action in plan-mode purple. */
  isPlanMode?: boolean;
}): React.ReactElement | null {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [visitedQuestionIndexes, setVisitedQuestionIndexes] = useState<
    Array<number>
  >(() => [0]);
  const [revisitedQuestionIndexes, setRevisitedQuestionIndexes] = useState<
    Array<number>
  >(() => []);
  const [answers, setAnswers] = useState<RequestInputPanelAnswers>(() =>
    buildInitialAnswers(questionAndOptions),
  );
  const [isInlineFreeformFocused, setIsInlineFreeformFocused] = useState(false);
  const intl = useIntl();
  const freeformInputWrapperRef = useRef<HTMLDivElement>(null);
  const inlineFreeformTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rootRef.current == null) {
      return;
    }
    rootRef.current.focus();
  }, []);

  // Multiple questions
  const hasMultipleQuestions = questionAndOptions.length > 1;
  const canGoPrevious = hasMultipleQuestions && questionIndex > 0;
  const canGoNext =
    hasMultipleQuestions && questionIndex < questionAndOptions.length - 1;
  const isOnLastQuestion = questionIndex >= questionAndOptions.length - 1;
  const questionProgressLabel = `${questionIndex + 1} of ${questionAndOptions.length}`;

  // Single question
  const {
    question: currentQuesiton,
    options: currentQuestionOptions,
    isOther: currentQuestionHasOtherOption,
  } = questionAndOptions[questionIndex];
  const resolvedHeader = header || currentQuesiton;
  const hasOtherOption = currentQuestionHasOtherOption === true;
  const hasSelectableOptions = currentQuestionOptions.length > 0;
  const selectedOptionId = answers[questionIndex]?.selectedOptionId ?? null;
  const selectedIndex =
    selectedOptionId == null
      ? -1
      : currentQuestionOptions.findIndex(
          (option) => option.id === selectedOptionId,
        );
  const freeformText = answers[questionIndex]?.freeformText ?? "";
  const inlineFreeformIsSelected =
    hasOtherOption &&
    !currentQuestionOptions.some((option) => option.id === selectedOptionId) &&
    freeformText.length > 0;
  const inlineFreeformIsActive =
    inlineFreeformIsSelected || isInlineFreeformFocused;
  const canDismissWithEscape = onEscapeDissmiss != null;

  // Freeform
  const showFreeformInput = !hasSelectableOptions || hasOtherOption;
  const showInlineFreeformInput = hasOtherOption && hasSelectableOptions;
  const showNonInlineFreeformInput =
    showFreeformInput && !showInlineFreeformInput;

  const freeformPlaceholder = hasOtherOption
    ? intl.formatMessage({
        id: "requestInputPanel.otherPlaceholder",
        defaultMessage: "No, and tell Codex what to do differently",
        description: "Placeholder for freeform other input",
      })
    : intl.formatMessage({
        id: "requestInputPanel.freeFormPlaceholder",
        defaultMessage: "Type here",
        description: "Placeholder for freeform input",
      });

  const isAtFirstOption = hasSelectableOptions && selectedIndex === 0;
  const isAtLastOption =
    hasSelectableOptions && selectedIndex === currentQuestionOptions.length - 1;

  const handleSelectOption = (id: string): RequestInputPanelAnswers => {
    const currentAnswer = answers[questionIndex] ?? {
      selectedOptionId: null,
      freeformText: null,
    };
    const nextAnswers = [...answers];
    nextAnswers[questionIndex] = {
      selectedOptionId: id,
      freeformText: currentAnswer.freeformText,
    };
    setAnswers(nextAnswers);
    return nextAnswers;
  };

  const handleSelectOtherOption = (): RequestInputPanelAnswers => {
    const currentAnswer = answers[questionIndex] ?? {
      selectedOptionId: null,
      freeformText: null,
    };
    const nextAnswers = [...answers];
    nextAnswers[questionIndex] = {
      selectedOptionId: null,
      freeformText: currentAnswer.freeformText,
    };
    setAnswers(nextAnswers);
    return nextAnswers;
  };

  const handleQuestionChange = (nextIndex: number): void => {
    const clampedIndex = Math.min(
      Math.max(nextIndex, 0),
      questionAndOptions.length - 1,
    );
    if (clampedIndex === questionIndex) {
      return;
    }
    if (!visitedQuestionIndexes.includes(clampedIndex)) {
      setVisitedQuestionIndexes((prev) => [...prev, clampedIndex]);
    } else {
      setRevisitedQuestionIndexes((prev) => {
        if (prev.includes(clampedIndex)) {
          return prev;
        }
        return [...prev, clampedIndex];
      });
    }
    setQuestionIndex(clampedIndex);
    rootRef.current?.focus();
  };

  const handleFreeformChange = (
    event: ChangeEvent<HTMLTextAreaElement>,
  ): void => {
    const { currentTarget } = event;
    const nextValue = currentTarget.value;
    if (
      currentTarget.dataset.autoresize != null &&
      nextValue.trim().length > 0
    ) {
      currentTarget.style.height = "auto";
      currentTarget.style.height = `${currentTarget.scrollHeight}px`;
    } else if (currentTarget.dataset.autoresize != null) {
      currentTarget.style.height = "";
    }
    setAnswers((prev) => {
      const nextAnswers = [...prev];
      const currentAnswer = prev[questionIndex] ?? {
        selectedOptionId: null,
        freeformText: null,
      };
      nextAnswers[questionIndex] = {
        selectedOptionId: hasOtherOption
          ? null
          : currentAnswer.selectedOptionId,
        freeformText: nextValue.length > 0 ? nextValue : null,
      };
      return nextAnswers;
    });
  };

  const handleFreeformFocus = (): void => {
    if (!hasOtherOption) {
      return;
    }
    handleSelectOtherOption();
  };

  const handleInlineFreeformFocus = (): void => {
    setIsInlineFreeformFocused(true);
    handleFreeformFocus();
  };

  const handleInlineFreeformBlur = (): void => {
    setIsInlineFreeformFocused(false);
  };

  const handleSubmit = ({
    nextAnswers,
  }: {
    nextAnswers?: RequestInputPanelAnswers;
  }): void => {
    if (!isOnLastQuestion) {
      handleQuestionChange(questionIndex + 1);
      return;
    }

    onSubmit(nextAnswers ?? answers);
  };

  const handleClick = ({
    nextAnswers,
  }: {
    nextAnswers?: RequestInputPanelAnswers;
  }): void => {
    if (!hasMultipleQuestions) {
      onSubmit(nextAnswers ?? answers);
      return;
    }
    if (isOnLastQuestion) {
      onSubmit(nextAnswers ?? answers);
      return;
    }
    handleQuestionChange(questionIndex + 1);
  };

  const handleKeyDown = (
    event: KeyboardEvent | ReactKeyboardEvent<HTMLDivElement>,
  ): void => {
    if (event.key === "Escape" && canDismissWithEscape) {
      event.preventDefault();
      onEscapeDissmiss();
      return;
    }
    if (event.target instanceof Node) {
      if (freeformInputWrapperRef.current?.contains(event.target)) {
        return;
      }
    }

    if (event.key >= "1" && event.key <= "9") {
      const optionIndex = Number(event.key) - 1;
      const option = currentQuestionOptions[optionIndex];
      if (option) {
        event.preventDefault();
        const nextAnswers = handleSelectOption(option.id);
        handleSubmit({ nextAnswers });
        return;
      }
      if (
        hasOtherOption &&
        showInlineFreeformInput &&
        optionIndex === currentQuestionOptions.length
      ) {
        event.preventDefault();
        handleSelectOtherOption();
        inlineFreeformTextareaRef.current?.focus();
        return;
      }
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      if (!hasMultipleQuestions) {
        return;
      }
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = Math.min(
        Math.max(questionIndex + delta, 0),
        questionAndOptions.length - 1,
      );
      handleQuestionChange(nextIndex);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!hasSelectableOptions) {
        return;
      }
      if (event.key === "ArrowUp" && selectedIndex === 0) {
        return;
      }
      if (event.key === "ArrowDown") {
        if (selectedIndex === currentQuestionOptions.length - 1) {
          if (hasOtherOption) {
            const textarea =
              freeformInputWrapperRef.current?.querySelector("textarea");
            if (textarea instanceof HTMLTextAreaElement) {
              textarea.focus();
            }
          }
          return;
        }
        if (hasOtherOption && selectedIndex === -1) {
          const textarea =
            freeformInputWrapperRef.current?.querySelector("textarea");
          if (textarea instanceof HTMLTextAreaElement) {
            textarea.focus();
          }
          return;
        }
      }
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex =
        selectedIndex === -1
          ? delta > 0
            ? 0
            : currentQuestionOptions.length - 1
          : selectedIndex + delta;
      const clampedIndex = Math.min(
        Math.max(nextIndex, 0),
        currentQuestionOptions.length - 1,
      );
      const nextOption = currentQuestionOptions[clampedIndex];
      if (nextOption) {
        handleSelectOption(nextOption.id);
      }
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      handleSubmit({});
      return;
    }
  };

  const handleGlobalKeyDown = (event: KeyboardEvent): void => {
    if (event.target instanceof Node && rootRef.current != null) {
      if (rootRef.current.contains(event.target)) {
        return;
      }
    }
    handleKeyDown(event);
  };

  useHotkey({
    accelerator: "ArrowUp",
    ignoreWithin: TERMINAL_HOTKEY_IGNORE_WITHIN,
    onKeyDown: handleGlobalKeyDown,
  });

  useHotkey({
    accelerator: "ArrowDown",
    ignoreWithin: TERMINAL_HOTKEY_IGNORE_WITHIN,
    onKeyDown: handleGlobalKeyDown,
  });

  useHotkey({
    accelerator: "ArrowLeft",
    ignoreWithin: TERMINAL_HOTKEY_IGNORE_WITHIN,
    onKeyDown: handleGlobalKeyDown,
  });

  useHotkey({
    accelerator: "ArrowRight",
    ignoreWithin: TERMINAL_HOTKEY_IGNORE_WITHIN,
    onKeyDown: handleGlobalKeyDown,
  });

  useHotkey({
    accelerator: "Enter",
    ignoreWithin: TERMINAL_HOTKEY_IGNORE_WITHIN,
    onKeyDown: handleGlobalKeyDown,
  });

  useHotkey({
    accelerator: "Escape",
    ignoreWithin: TERMINAL_HOTKEY_IGNORE_WITHIN,
    onKeyDown: handleGlobalKeyDown,
  });

  const handleInlineFreeformKeyDown = (
    event: ReactKeyboardEvent<HTMLTextAreaElement>,
  ): void => {
    if (event.key === "ArrowUp") {
      const lineHeight = parseFloat(
        window.getComputedStyle(event.currentTarget).lineHeight,
      );
      const isMultiline =
        Number.isFinite(lineHeight) &&
        event.currentTarget.scrollHeight > lineHeight * 1.1;
      if (isMultiline) {
        return;
      }
      if (currentQuestionOptions.length === 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const lastOption =
        currentQuestionOptions[currentQuestionOptions.length - 1];
      if (lastOption == null) {
        return;
      }
      handleSelectOption(lastOption.id);
      if (rootRef.current == null) {
        return;
      }
      rootRef.current.focus();
      return;
    }
    if (event.key !== "Enter") {
      return;
    }
    if (event.shiftKey) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    handleSubmit({});
  };

  const handleInlineFreeformMouseDown = (
    event: MouseEvent<HTMLDivElement>,
  ): void => {
    const textarea = inlineFreeformTextareaRef.current;
    if (textarea == null) {
      return;
    }
    if (event.target instanceof Node && textarea.contains(event.target)) {
      return;
    }
    event.preventDefault();
    textarea.focus();
  };

  const handleNonInlineFreeformKeyDown = (
    event: ReactKeyboardEvent<HTMLTextAreaElement>,
  ): void => {
    if (event.key !== "Enter") {
      return;
    }
    if (event.shiftKey) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    handleSubmit({});
  };

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      className={clsx(
        "border-token-border bg-token-input-background text-token-foreground flex flex-col overflow-hidden rounded-3xl border shadow-sm focus:outline-none",
        className,
      )}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between border-token-border/70 pt-4 pr-3 pb-2 pl-4">
        <div className="text-base font-medium">{resolvedHeader}</div>
        {hasMultipleQuestions ? (
          <div className="flex shrink-0 items-center gap-1 text-xs text-token-description-foreground">
            <Button
              color="ghost"
              disabled={!canGoPrevious}
              size="icon"
              onClick={() => handleQuestionChange(questionIndex - 1)}
            >
              <ChevronIcon className="icon-2xs rotate-90" />
            </Button>
            <span>{questionProgressLabel}</span>
            <Button
              className="!h-5 !w-5"
              color="ghost"
              disabled={!canGoNext}
              size="icon"
              onClick={() => handleQuestionChange(questionIndex + 1)}
            >
              <ChevronIcon className="icon-2xs -rotate-90" />
            </Button>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 py-1">
        {body ? <div className="flex flex-col">{body}</div> : null}
        {header ? (
          <div className="px-4 text-sm font-medium">{currentQuesiton}</div>
        ) : null}
        <div className="flex flex-col gap-1 px-2">
          {currentQuestionOptions.length > 0 ? (
            <div className="flex flex-col gap-1" role="radiogroup">
              {currentQuestionOptions.map((option, index) => {
                const isSelected = option.id === selectedOptionId;
                return (
                  <button
                    key={option.id}
                    className={clsx(
                      "border-token-border focus:outline-none bg-token-background hover:bg-token-foreground/5 flex w-full items-center gap-2 rounded-xl p-2 text-left text-sm",
                      isSelected && "bg-token-foreground/5",
                    )}
                    onClick={() => {
                      handleClick({
                        nextAnswers: handleSelectOption(option.id),
                      });
                    }}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={
                      option.ariaLabel ??
                      (typeof option.value === "string"
                        ? option.value
                        : undefined)
                    }
                  >
                    <span
                      className={clsx(
                        "text-sm",
                        isSelected
                          ? "text-token-description-foreground"
                          : "text-token-description-foreground/60",
                      )}
                    >
                      <FormattedMessage
                        id="requestInputPanel.optionIndex"
                        defaultMessage="{index}."
                        description="Index label for a selectable option"
                        values={{ index: index + 1 }}
                      />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="min-w-0 truncate">
                            {option.value}
                          </span>
                          {option.description != null && (
                            <Tooltip
                              tooltipContent={
                                <div className="max-w-xs text-center text-sm">
                                  {option.description}
                                </div>
                              }
                            >
                              <span className="flex shrink-0 items-center text-token-description-foreground">
                                <InfoIcon className="icon-2xs" />
                              </span>
                            </Tooltip>
                          )}
                        </span>
                        {isSelected &&
                        revisitedQuestionIndexes.includes(questionIndex) ? (
                          <Badge className="px-1.5 py-0 text-[10px] leading-none">
                            <FormattedMessage
                              id="requestInputPanel.selectedBadge"
                              defaultMessage="Selected"
                              description="Badge shown for a selected option when revisiting a question"
                            />
                          </Badge>
                        ) : null}
                      </span>
                    </span>
                    <div
                      className={clsx(
                        "text-token-description-foreground ml-auto flex items-center gap-2 text-xs",
                        !isSelected && "invisible",
                      )}
                      aria-hidden={!isSelected}
                    >
                      <span className="flex items-center gap-0.5">
                        <ArrowUpIcon
                          className={clsx(
                            "icon-xxs",
                            isAtFirstOption &&
                              "text-token-description-foreground/50",
                          )}
                        />
                        <ArrowUpIcon
                          className={clsx(
                            "icon-xxs rotate-180",
                            isAtLastOption &&
                              "text-token-description-foreground/50",
                          )}
                        />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
          {showNonInlineFreeformInput && (
            <div
              ref={freeformInputWrapperRef}
              className="flex w-full items-center"
            >
              <textarea
                className="w-full resize-none rounded-xl border border-token-border bg-transparent p-2 text-sm text-token-foreground shadow-none ring-0 outline-none placeholder:text-token-description-foreground"
                placeholder={freeformPlaceholder}
                rows={4}
                value={freeformText}
                onChange={handleFreeformChange}
                onFocus={handleFreeformFocus}
                onKeyDown={handleNonInlineFreeformKeyDown}
              />
            </div>
          )}
          <div
            className={clsx(
              "flex items-center gap-2",
              showInlineFreeformInput ? "justify-between -mt-1" : "justify-end",
            )}
          >
            {showInlineFreeformInput && (
              <div
                ref={freeformInputWrapperRef}
                className="group flex min-w-0 flex-1 items-center justify-items-start gap-2 rounded-xl px-2 py-0 text-sm focus-within:outline-none"
                onMouseDown={handleInlineFreeformMouseDown}
              >
                <span
                  className={clsx(
                    "min-w-[1.5ch] text-left text-token-description-foreground/60",
                    inlineFreeformIsActive && "text-token-foreground/70",
                    "group-focus-within:text-token-foreground/70",
                  )}
                >
                  <FormattedMessage
                    id="requestInputPanel.optionIndex"
                    defaultMessage="{index}."
                    description="Index label for a selectable option"
                    values={{ index: currentQuestionOptions.length + 1 }}
                  />
                </span>
                <span className="relative min-w-0 flex-1">
                  {!inlineFreeformIsActive && freeformText.length === 0 ? (
                    <span className="pointer-events-none absolute inset-x-0 top-0 truncate text-sm leading-5 text-token-description-foreground">
                      {freeformPlaceholder}
                    </span>
                  ) : null}
                  <textarea
                    ref={inlineFreeformTextareaRef}
                    className="request-input-panel__inline-freeform w-full min-w-0 flex-1 resize-none overflow-hidden bg-transparent text-sm leading-4 text-token-foreground shadow-none outline-none placeholder:text-transparent focus:border-transparent focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none"
                    data-autoresize
                    placeholder={freeformPlaceholder}
                    rows={1}
                    value={freeformText}
                    onChange={handleFreeformChange}
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                    onKeyDown={handleInlineFreeformKeyDown}
                    onFocus={handleInlineFreeformFocus}
                    onBlur={handleInlineFreeformBlur}
                  />
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 place-self-end py-1">
              {canDismissWithEscape ? (
                <Button
                  className="group shrink-0"
                  color="ghost"
                  onClick={() => {
                    onEscapeDissmiss?.();
                  }}
                >
                  <span className="text-sm text-token-description-foreground">
                    <FormattedMessage
                      id="requestInputPanel.dismiss"
                      defaultMessage="Dismiss"
                      description="Dismiss label shown when escape can close the request input panel"
                    />
                  </span>
                  <Badge className="bg-token-foreground/10 px-1.5 py-0 text-[10px] leading-none text-token-foreground group-hover:bg-token-foreground/15">
                    <span className="font-mono">
                      <FormattedMessage
                        id="requestInputPanel.escapeKey"
                        defaultMessage="ESC"
                        description="Label for the escape key"
                      />
                    </span>
                  </Badge>
                </Button>
              ) : null}
              {onSkip ? (
                <Button
                  className="shrink-0"
                  color="ghost"
                  onClick={() => {
                    onSkip();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.stopPropagation();
                    }
                  }}
                >
                  <span className="text-sm text-token-description-foreground">
                    <FormattedMessage
                      id="requestInputPanel.skip"
                      defaultMessage="Skip"
                      description="Secondary action label to deny a request without additional guidance"
                    />
                  </span>
                </Button>
              ) : null}
              <Button
                className={clsx(
                  "shrink-0",
                  isPlanMode &&
                    "!bg-token-text-link-foreground !text-token-dropdown-background enabled:hover:!bg-token-text-link-foreground/90 border-transparent",
                )}
                color="primary"
                size="composer"
                loading={isSubmitting}
                onClick={() => handleSubmit({})}
              >
                <span className="text-sm font-medium">
                  {isOnLastQuestion ? (
                    <FormattedMessage
                      id="requestInputPanel.submit"
                      defaultMessage="Submit"
                      description="Primary action label for submitting a user input response"
                    />
                  ) : (
                    <FormattedMessage
                      id="requestInputPanel.continue"
                      defaultMessage="Continue"
                      description="Primary action label to move to the next question"
                    />
                  )}
                </span>
                <Badge
                  aria-hidden
                  className="bg-token-dropdown-background/15 !px-1.5 !py-[1px] text-sm leading-none text-token-dropdown-background"
                >
                  <span className="font-mono">
                    {/* oxlint-disable-next-line formatjs/no-literal-string-in-jsx */}
                    {"\u23CE"}
                  </span>
                </Badge>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
