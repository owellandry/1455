import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { GlobalStateKey } from "protocol";
import React, { useCallback } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router";

import { useAuth } from "@/auth/use-auth";
import { Button } from "@/components/button";
import { CodeSnippet } from "@/components/code-snippet";
import { Spinner } from "@/components/spinner";
import { CODEX_IDE_URL } from "@/constants/links";
import { useGlobalState } from "@/hooks/use-global-state";
// import ChevronRightIcon from "@/icons/chevron-right.svg";
import ArrowUp from "@/icons/arrow-up.svg";
import CheckIcon from "@/icons/check-md.svg";
import GitHubIcon from "@/icons/github-mark.svg";
import InfoIcon from "@/icons/info.svg";
import OpenAIIcon from "@/icons/openai-blossom.svg";
import PlusIcon from "@/icons/plus.svg";
import RobotIcon from "@/icons/robot.svg";
import SendToCloudIcon from "@/icons/send-to-cloud.svg";

import { AsciiShader } from "./ascii-shader";
import { useAsciiEngine } from "./use-ascii-engine";
import { useNux } from "./use-nux";
const STEP_INTRO = 0;
const STEP_CLOUD = 1;
const STEP_TODO = 2;
const STEP_LEGAL = 3;
const TOTAL_STEPS = STEP_LEGAL + 1;

const TODO_CODE_PREFIX = `import mongoose, { Schema } from "mongoose";
export const collection = "Product";`;

const TODO_CODE_SUFFIX = `const schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {`;

export function FirstRunPage(): React.ReactElement {
  const nux = useNux();
  const { authMethod } = useAuth();
  const hasCloudAccess = authMethod === "chatgpt";
  const isUsingCopilotAuth = authMethod === "copilot";
  let initialStep: number;
  switch (nux) {
    case "2025-09-15-full-chatgpt-auth":
      initialStep = STEP_INTRO;
      break;
    case "2025-09-15-apikey-auth":
      // Start with the legal step when using API key auth to avoid telling the
      // user about features they can't access.
      initialStep = STEP_LEGAL;
      break;
    case "none":
    case undefined:
      if (hasCloudAccess) {
        initialStep = STEP_INTRO;
      } else {
        initialStep = STEP_LEGAL;
      }
      break;
  }

  const navigate = useNavigate();
  const { setData: setNuxData } = useGlobalState(GlobalStateKey.NUX_2025_09_15);
  const { setData: setFullChatGptAuthNux } = useGlobalState(
    GlobalStateKey.NUX_2025_09_15_FULL_CHATGPT_AUTH_VIEWED,
  );
  const { setData: setApiKeyAuthNux } = useGlobalState(
    GlobalStateKey.NUX_2025_09_15_APIKEY_AUTH_VIEWED,
  );

  const onAccept = useCallback(async (): Promise<void> => {
    // Mark NUX as seen before navigating to <App> or the NUX will show again.
    await setNuxData(true);

    // Mark more specific NUXes as seen.
    if (nux === "2025-09-15-full-chatgpt-auth") {
      await setFullChatGptAuthNux(true);
    } else if (nux === "2025-09-15-apikey-auth") {
      await setApiKeyAuthNux(true);
    }

    void navigate("/");
  }, [nux, navigate, setApiKeyAuthNux, setFullChatGptAuthNux, setNuxData]);

  return (
    <FirstRunPageAtStep
      initialStep={initialStep}
      onAccept={onAccept}
      hasCloudAccess={hasCloudAccess}
      isUsingCopilotAuth={isUsingCopilotAuth}
    />
  );
}

function FirstRunPageAtStep({
  initialStep,
  onAccept,
  hasCloudAccess,
  isUsingCopilotAuth,
}: {
  initialStep: number;
  onAccept: () => Promise<void>;
  hasCloudAccess: boolean;
  isUsingCopilotAuth: boolean;
}): React.ReactElement {
  const [activeStep, setActiveStep] = React.useState<number>(initialStep);
  const isWideViewport = useIsViewportWiderThan(560);
  const initialColumns = 130;
  const initialRows = 100;
  const { columns, rows, lines } = useAsciiEngine({
    initialColumns,
    initialRows,
    initialMode: "composite",
    preferredVideoKeyword: "blossom",
  });
  const [isLeavingLegalStep, setIsLeavingLegalStep] = React.useState(false);

  function onBack(): void {
    setActiveStep((prev) => Math.max(STEP_INTRO, prev - 1));
  }

  function onContinue(): void {
    if (activeStep === STEP_LEGAL) {
      setIsLeavingLegalStep(true);
      return;
    }

    if (activeStep < TOTAL_STEPS - 1) {
      setActiveStep((prev) => Math.min(TOTAL_STEPS - 1, prev + 1));
    } else {
      void onAccept();
    }
  }

  const fadeVariants = {
    initial: { opacity: 0 },
    active: {
      opacity: 1,
      transition: { duration: 0.4, ease: "easeInOut", delay: 0.01 },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.4, ease: "easeOut", delay: 0 },
    },
  } as const;

  function renderTitle(): React.ReactNode {
    if (activeStep === STEP_INTRO) {
      return (
        <FormattedMessage
          id="codex.legal.step.intro.title"
          defaultMessage="Codex in your IDE"
          description="Heading for step 1 intro"
        />
      );
    }
    if (activeStep === STEP_CLOUD) {
      return (
        <FormattedMessage
          id="codex.legal.step.cloud.title"
          defaultMessage="Hand off to Codex in the cloud"
          description="Heading for step 2 cloud"
        />
      );
    }
    if (activeStep === STEP_TODO) {
      return (
        <FormattedMessage
          id="codex.legal.step.todo.title"
          defaultMessage="Turn TODOs into Codex tasks"
          description="Heading for step 3 todo"
        />
      );
    }
    if (activeStep === STEP_LEGAL) {
      return null;
    }
    return null;
  }

  function renderSubtitle(): React.ReactNode {
    if (activeStep === STEP_INTRO) {
      return (
        <FormattedMessage
          id="codex.legal.step.intro.subtitle"
          defaultMessage="Codex navigates, edits, runs commands, and executes tests directly in your repo. Powered by your ChatGPT account."
          description="Subtitle for step 1 intro"
        />
      );
    } else if (activeStep === STEP_CLOUD) {
      return (
        <FormattedMessage
          id="codex.legal.step.cloud.subtitle"
          defaultMessage="Send tasks to Codex to run in the background so you can stay focused and move faster."
          description="Subtitle for step 2 cloud"
        />
      );
    } else if (activeStep === STEP_TODO) {
      return (
        <FormattedMessage
          id="codex.legal.step.todo.subtitle"
          defaultMessage="Write a TODO comment and convert it into a Codex task with a single click."
          description="Subtitle for step 3 todo"
        />
      );
    } else {
      return null;
    }
  }

  const activeSlideVariant =
    React.useMemo<OnboardingSlideVariant | null>(() => {
      if (activeStep === STEP_LEGAL) {
        return null;
      }
      if (activeStep === STEP_INTRO) {
        return "intro";
      }
      if (activeStep === STEP_CLOUD) {
        return "cloud";
      }
      return "todo";
    }, [activeStep]);

  function renderBottomCopy(): React.ReactNode {
    if (activeStep !== STEP_LEGAL) {
      return (
        <div className="mx-auto w-full max-w-sm text-center text-base text-token-description-foreground">
          {renderSubtitle()}
        </div>
      );
    }
    return (
      <ul className="mt-3 space-y-4 overflow-y-auto">
        <ListItem
          Icon={RobotIcon}
          title={
            <FormattedMessage
              id="codex.legal.autonomy.title"
              defaultMessage="Decide how much autonomy you want to grant"
              description="Title for autonomy decision info"
            />
          }
        >
          <FormattedMessage
            id="codex.legal.autonomy.details"
            defaultMessage="For more details, see the {link}"
            description="Details directing users to Codex documentation"
            values={{
              link: (
                <a
                  href={CODEX_IDE_URL}
                  className="!text-token-description-foreground underline hover:no-underline"
                  onClick={(e) => e.preventDefault()}
                >
                  <FormattedMessage
                    id="codex.legal.autonomy.details.link"
                    defaultMessage="Codex docs"
                    description="Link text to Codex docs"
                  />
                </a>
              ),
            }}
          />
        </ListItem>
        <ListItem
          Icon={InfoIcon}
          title={
            <FormattedMessage
              id="codex.legal.mistakes.title"
              defaultMessage="Codex can make mistakes"
              description="Warning title about Codex fallibility"
            />
          }
        >
          <FormattedMessage
            id="codex.legal.mistakes.review"
            defaultMessage="Review the code it writes and commands it runs"
            description="Instruction to review generated code and executed commands"
          />
        </ListItem>
        <LegalMessageFromApiProviderListItem
          isUsingCopilotAuth={isUsingCopilotAuth}
        />
      </ul>
    );
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-token-side-bar-background px-4 electron:!bg-transparent">
      <div
        className="pointer-events-none absolute inset-0 -ml-6"
        style={{
          WebkitMaskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,1) 25%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0) 50%)",
          maskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,1) 35%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0) 78%)",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          opacity: 0.15,
        }}
      >
        <AsciiShader
          lines={lines}
          columns={columns}
          rows={rows}
          scale={0.95}
          autoCover
        />
      </div>
      <MotionConfig transition={{ type: "spring", duration: 0.6, bounce: 0 }}>
        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="relative h-full w-full">
            <AnimatePresence initial={false} mode="wait">
              {activeSlideVariant && (
                <motion.div
                  key={`slide-${activeStep}`}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 [@media(max-height:500px)]:hidden"
                  variants={fadeVariants}
                  initial="initial"
                  animate="active"
                  exit="exit"
                >
                  <OnboardingSlide
                    variant={activeSlideVariant}
                    isWideViewport={isWideViewport}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Back button for debugging
        {activeStep === STEP_UPGRADE && (
          <div className="absolute left-4 top-4">
            <Button
              color="ghost"
              onClick={onBack}
              className="hover:text-token-foreground hover:bg-transparent"
            >
              <ChevronRightIcon className="text-token-input-placeholder-foreground icon-xs shrink-0 rotate-180" />
            </Button>
          </div>
        )}
        */}

        <div className="absolute bottom-10 left-1/2 z-20 w-full max-w-lg -translate-x-1/2 px-6">
          <div className="mb-2 flex items-center justify-center">
            <h1 className="mx-auto w-full max-w-sm text-center text-base leading-tight font-medium text-token-foreground">
              <AnimatePresence initial={false} mode="wait">
                {renderTitle() && (
                  <motion.span
                    key={`title-${activeStep}`}
                    variants={fadeVariants}
                    initial="initial"
                    animate="active"
                    exit="exit"
                  >
                    {renderTitle()}
                  </motion.span>
                )}
              </AnimatePresence>
            </h1>
          </div>
          <div className="flex justify-center px-2">
            <AnimatePresence
              initial={false}
              mode="wait"
              onExitComplete={() => {
                if (isLeavingLegalStep) {
                  setIsLeavingLegalStep(false);
                  void onAccept();
                }
              }}
            >
              {!(activeStep === STEP_LEGAL && isLeavingLegalStep) && (
                <motion.div
                  key={`copy-${activeStep}`}
                  variants={fadeVariants}
                  initial="initial"
                  animate="active"
                  exit="exit"
                >
                  {renderBottomCopy()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="mt-10 mb-0 px-2">
            <div className="mx-auto flex w-full max-w-[400px] items-center justify-between gap-2">
              {hasCloudAccess && (
                <Button
                  type="button"
                  size="large"
                  color="outline"
                  onClick={onBack}
                  disabled={activeStep === STEP_INTRO}
                >
                  <FormattedMessage
                    id="codex.legal.backButton"
                    defaultMessage="Back"
                    description="Button text to go to previous step"
                  />
                </Button>
              )}
              <Button type="button" size="large" onClick={onContinue}>
                {!hasCloudAccess ? (
                  <FormattedMessage
                    id="codex.legal.continue.apikey"
                    defaultMessage="Continue"
                    description="Button text when using API key auth to accept legal disclaimers"
                  />
                ) : (
                  <FormattedMessage
                    id="codex.legal.continueButton"
                    defaultMessage="Next"
                    description="Button text to proceed to next step or finish"
                  />
                )}
              </Button>
            </div>
          </div>
        </div>
      </MotionConfig>
    </div>
  );
}

type OnboardingSlideVariant = "intro" | "cloud" | "todo";

function OnboardingSlide({
  variant,
  isWideViewport,
}: {
  variant: OnboardingSlideVariant;
  isWideViewport: boolean;
}): React.ReactElement {
  const widthPx = isWideViewport ? 560 : 320;
  const heightPx = isWideViewport ? 320 : 240;

  function renderContent(): React.ReactNode {
    if (variant === "intro") {
      return (
        <div className="relative flex flex-1 flex-col gap-4 overflow-y-auto rounded-2xl border border-token-border bg-token-dropdown-background p-2 shadow-2xl">
          <div className="text-md pt-2 pl-2 text-token-description-foreground opacity-40">
            <FormattedMessage
              id="composer.placeholder.newTask.doAnything"
              defaultMessage="Ask Codex to do anything"
              description="Message shown in the Codex onboarding slide to educate users that they can ask Codex to do anything"
            />
          </div>
          <div className="flex w-full items-center justify-end">
            <div className="flex w-full min-w-0 flex-nowrap items-center justify-start gap-[5px]">
              <PlusIcon
                color="ghost"
                className="size-token-button-composer rounded-full border border-token-border p-1"
                onClick={() => {}}
              />
            </div>
            <div className="flex h-[32px] w-[34px] items-center justify-center rounded-full bg-token-foreground p-0">
              <ArrowUp className="text-token-dropdown-background" />
            </div>
          </div>
        </div>
      );
    }
    if (variant === "cloud") {
      return (
        <div className="relative flex flex-col items-center justify-center gap-4 rounded-2xl border border-token-border bg-token-dropdown-background px-4 py-4 shadow-2xl">
          <SendToCloudIcon className="size-8" />
          <div className="flex w-full items-center justify-between gap-4">
            <Spinner className="size-4" />

            <div className="flex flex-1 flex-col text-token-foreground">
              <div className="flex-1 text-sm font-medium">
                <FormattedMessage
                  id="codex.legal.cloud.taskOne.title"
                  defaultMessage="Explain repository to a new designer"
                  description="Sample task title shown on the cloud onboarding slide"
                />
              </div>
              <div className="text-sm font-medium opacity-50">
                <FormattedMessage
                  id="codex.legal.cloud.taskOne.meta"
                  defaultMessage="openai/agi · Oct 12"
                  description="Sample repository and date metadata for the first cloud onboarding task"
                />
              </div>
            </div>
          </div>
          <div className="flex w-full items-center justify-between gap-4">
            <CheckIcon className="size-4" />
            <div className="flex flex-1 flex-col text-token-foreground">
              <div className="text-sm font-medium">
                <FormattedMessage
                  id="codex.legal.cloud.taskTwo.title"
                  defaultMessage="Fix an onboarding bug"
                  description="Sample completed task title on the cloud onboarding slide"
                />
              </div>
              <div className="text-sm font-medium opacity-50">
                <FormattedMessage
                  id="codex.legal.cloud.taskTwo.meta"
                  defaultMessage="openai/agi · Oct 9"
                  description="Sample repository and date metadata for the second cloud onboarding task"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="text-green-500">
                <FormattedMessage
                  id="codex.legal.cloud.taskTwo.stats.positive"
                  defaultMessage="+2"
                  description="Sample positive stat associated with a cloud task"
                />
              </span>
              <span className="text-red-500">
                <FormattedMessage
                  id="codex.legal.cloud.taskTwo.stats.negative"
                  defaultMessage="-20"
                  description="Sample negative stat associated with a cloud task"
                />
              </span>
            </div>
          </div>
          <div className="flex w-full items-center justify-between gap-4">
            <CheckIcon className="size-4" />
            <div className="flex flex-1 flex-col text-token-foreground">
              <div className="text-sm font-medium">
                <FormattedMessage
                  id="codex.legal.cloud.taskThree.title"
                  defaultMessage="Create a darkmode theme"
                  description="Sample completed task title for the third cloud onboarding example"
                />
              </div>
              <div className="text-sm font-medium opacity-50">
                <FormattedMessage
                  id="codex.legal.cloud.taskThree.meta"
                  defaultMessage="openai/codex · Oct 8"
                  description="Sample repository and date metadata for the third cloud onboarding task"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="text-green-500">
                <FormattedMessage
                  id="codex.legal.cloud.taskThree.stats.positive"
                  defaultMessage="+249"
                  description="Sample positive stat associated with the third cloud task"
                />
              </span>
              <span className="text-red-500">
                <FormattedMessage
                  id="codex.legal.cloud.taskThree.stats.negative"
                  defaultMessage="-123"
                  description="Sample negative stat associated with the third cloud task"
                />
              </span>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="relative rounded-xl border-token-border bg-token-dropdown-background p-2 font-mono shadow-xl">
        <CodeSnippet
          language="typescript"
          content={TODO_CODE_PREFIX}
          showActionBar={false}
          showStickyRightContent={false}
          wrapperClassName="pointer-events-none w-full"
          codeContainerClassName="pointer-events-none"
        />
        <div className="relative rounded-xl border-token-border bg-token-dropdown-background p-2 pb-2.5 font-mono">
          <span className="text-mono pointer-events-none px-2 py-1 text-[11px] tracking-[0.2em] text-token-description-foreground uppercase">
            <FormattedMessage
              id="codex.legal.todo.heading"
              defaultMessage="// TODO: implement schema"
              description="Example TODO comment shown during onboarding"
            />
          </span>
        </div>
        <CodeSnippet
          language="typescript"
          content={TODO_CODE_SUFFIX}
          showActionBar={false}
          showStickyRightContent={false}
          wrapperClassName="pointer-events-none w-full"
          codeContainerClassName="pointer-events-none"
          shouldWrapCode
        />
      </div>
    );
  }

  return (
    <div style={{ width: widthPx, height: heightPx }} aria-hidden>
      {renderContent()}
    </div>
  );
}

export function LegalMessageFromApiProviderListItem({
  isUsingCopilotAuth,
}: {
  isUsingCopilotAuth: boolean;
}): React.ReactElement {
  let icon;
  let title;
  let content;
  if (isUsingCopilotAuth) {
    icon = GitHubIcon;
    title = (
      <FormattedMessage
        id="codex.legal.copilot.title"
        defaultMessage="Powered by GitHub Copilot"
        description="Statement that Codex uses user's Copilot account"
      />
    );
    content = (
      <FormattedMessage
        id="codex.legal.copilot.details"
        defaultMessage="Uses your Copilot plan for all model calls, billing, and rate limits. Codex extension usage is subject to both {oaiTos} and {gitHubTos}."
        description="Details about using Copilot subscription and training data preferences"
        values={{
          oaiTos: (
            <a
              href="https://openai.com/policies/row-terms-of-use/"
              className="!text-token-description-foreground underline hover:no-underline"
              onClick={(e) => e.preventDefault()}
            >
              <FormattedMessage
                id="codex.legal.copilot.oaiTosLink"
                defaultMessage="OpenAI Codex terms of service"
                description="Link to OpenAI Codex terms of service from Copilot NUX"
              />
            </a>
          ),
          gitHubTos: (
            <a
              href="https://docs.github.com/en/site-policy/github-terms/github-terms-of-service"
              className="!text-token-description-foreground underline hover:no-underline"
              onClick={(e) => e.preventDefault()}
            >
              <FormattedMessage
                id="codex.legal.copilot.gitHubTosLink"
                defaultMessage="GitHub Terms of Service"
                description="Link to GitHub Terms of Service from Copilot NUX"
              />
            </a>
          ),
        }}
      />
    );
  } else {
    icon = OpenAIIcon;
    title = (
      <FormattedMessage
        id="codex.legal.powered.title"
        defaultMessage="Powered by your ChatGPT account"
        description="Statement that Codex uses user's ChatGPT account"
      />
    );
    content = (
      <FormattedMessage
        id="codex.legal.powered.details"
        defaultMessage="Uses your plan’s rate limits and {link}"
        description="Details about using plan rate limits and training data preferences"
        values={{
          link: (
            <a
              href="https://chatgpt.com/#settings/DataControls"
              className="!text-token-description-foreground underline hover:no-underline"
              onClick={(e) => e.preventDefault()}
            >
              <FormattedMessage
                id="codex.legal.powered.details.link"
                defaultMessage="training data preferences"
                description="Link text to training data preferences settings"
              />
            </a>
          ),
        }}
      />
    );
  }

  return (
    <ListItem Icon={icon} title={title}>
      {content}
    </ListItem>
  );
}

function ListItem({
  Icon,
  title,
  children,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <li className="flex items-start gap-3">
      <Icon className="icon-base mt-0.5 shrink-0 opacity-80" />
      <div className="text-sm">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-base text-token-description-foreground">
          {children}
        </span>
      </div>
    </li>
  );
}

function useIsViewportWiderThan(threshold: number): boolean {
  const [isWider, setIsWider] = React.useState<boolean>(() => {
    return window.innerWidth > threshold;
  });

  React.useEffect(() => {
    function handleResize(): void {
      setIsWider(window.innerWidth > threshold);
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return (): void => {
      window.removeEventListener("resize", handleResize);
    };
  }, [threshold]);

  return isWider;
}
