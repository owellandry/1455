// Adapted from chatgpt/web
import type { ErrorInfo, ReactElement, ReactNode } from "react";
import { Component, isValidElement } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router";

import InfoIcon from "../icons/info.svg";
import { reportRendererErrorBoundary } from "../sentry-init";
import { logger } from "../utils/logger";
import { Button } from "./button";

function objectToString(value: unknown): string {
  return Object.prototype.toString.call(value);
}

// oxlint-disable-next-line typescript/no-explicit-any
function isInstanceOf(wat: any, base: any): boolean {
  try {
    return wat instanceof base;
  } catch (_e) {
    return false;
  }
}

function isError(wat: unknown): wat is Error {
  switch (objectToString(wat)) {
    case "[object Error]":
    case "[object Exception]":
    case "[object DOMException]":
      return true;
    default:
      return isInstanceOf(wat, Error);
  }
}

type FallbackRender = (errorData: {
  error: Error;
  componentStack: string;
  eventId: string;
  resetError(): void;
}) => ReactElement;

type ErrorBoundaryState =
  | {
      componentStack: null;
      error: null;
      eventId: "";
    }
  | {
      componentStack: ErrorInfo["componentStack"];
      error: Error;
      eventId: string;
    };

const INITIAL_STATE: ErrorBoundaryState = {
  componentStack: null,
  error: null,
  eventId: "",
};

interface ExtendedError extends Error {
  cause?: ExtendedError;
}

function setCause(error: ExtendedError, cause: ExtendedError): void {
  const seenErrors = new WeakMap<ExtendedError, boolean>();

  function recurse(error: ExtendedError, cause: ExtendedError): void {
    // If we've already seen the error, there is a recursive loop somewhere in the error's
    // cause chain. Let's just bail out then to prevent a stack overflow.
    if (seenErrors.has(error)) {
      return;
    }
    if (error.cause) {
      seenErrors.set(error, true);
      return recurse(error.cause, cause);
    }
    error.cause = cause;
  }

  recurse(error, cause);
}

function ProdFallback({
  resetError,
}: {
  resetError: () => void;
}): ReactElement {
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <InfoIcon className="icon-lg text-token-error-foreground" />
      <FormattedMessage
        id="codex.errorBoundary.genericError"
        defaultMessage="Oops, an error has occurred"
        description="Generic error message shown when the extension webview fails"
      />
      <Button
        onClick={() => {
          resetError();
          void navigate("/");
        }}
      >
        <FormattedMessage
          id="codex.errorBoundary.goHome"
          defaultMessage="Try again"
          description="Button label to navigate to the home page after an error"
        />
      </Button>
    </div>
  );
}

class ErrorBoundary extends Component<
  {
    children?: ReactNode | (() => ReactNode);
    fallback?: ReactElement | FallbackRender;
    onError?(error: Error, componentStack: string, eventId: string): void;
    onReset?(
      error: Error | null,
      componentStack: string | null,
      eventId: string,
    ): void;
    name: string;
    logRequestErrors?: boolean;
  },
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState;

  public constructor(props: {
    children?: ReactNode | (() => ReactNode);
    fallback?: ReactElement | FallbackRender;
    onError?(error: Error, componentStack: string, eventId: string): void;
    onReset?(
      error: Error | null,
      componentStack: string | null,
      eventId: string,
    ): void;
    name: string;
    logRequestErrors?: boolean;
  }) {
    super(props);

    this.state = INITIAL_STATE;
  }

  public componentDidCatch(
    error: Error & { cause?: Error },
    { componentStack }: ErrorInfo,
  ): void {
    const componentStackValue = componentStack ?? "";
    const reportableError = isError(error) ? error : new Error(String(error));

    // Although `componentDidCatch` is typed to accept an `Error` object, it can also be invoked
    // with non-error objects. This is why we need to check if the error is an error-like object.
    // See: https://github.com/getsentry/sentry-javascript/issues/6167
    if (isError(error)) {
      const errorBoundaryError = new Error(error.message);
      errorBoundaryError.name = `React ErrorBoundary ${errorBoundaryError.name}`;
      errorBoundaryError.stack = componentStackValue;

      // Using the `LinkedErrors` integration to link the errors together.
      setCause(error as ExtendedError, errorBoundaryError as ExtendedError);
    }
    const eventId = reportRendererErrorBoundary(reportableError, {
      boundaryName: this.props.name,
      componentStack: componentStackValue,
    });

    if (this.props.onError) {
      this.props.onError(reportableError, componentStackValue, eventId);
    }

    try {
      logger.error(`error boundary`, {
        safe: {
          name: this.props.name,
        },
        sensitive: {
          error: error,
          componentStack: componentStack ?? "",
        },
      });
    } catch {
      // Never throw from an ErrorBoundary while attempting to report telemetry.
    }
    // componentDidCatch is used over getDerivedStateFromError
    // so that componentStack is accessible through state.
    this.setState({ error: reportableError, componentStack, eventId });
  }

  public resetErrorBoundary: () => void = () => {
    const { onReset } = this.props;
    const { error, componentStack, eventId } = this.state;
    if (onReset) {
      onReset(error, componentStack ?? "", eventId);
    }
    this.setState(INITIAL_STATE);
  };

  public render(): ReactNode {
    const { fallback: fallbackOverride, children } = this.props;
    const state = this.state;

    const fallback =
      fallbackOverride ??
      ((fallbackData): ReactElement =>
        __DEV__ ? (
          <div className="flex h-full flex-col gap-2">
            <FormattedMessage
              id="localConversationPage.error.render"
              defaultMessage="Error rendering local conversation"
              description="Error message for when the local conversation fails to render"
            />
            <pre className="overflow-auto text-xs whitespace-pre-wrap">
              {fallbackData.error.stack ?? ""}
            </pre>
          </div>
        ) : (
          <ProdFallback resetError={() => fallbackData.resetError()} />
        ));

    if (state.error) {
      let element: ReactElement | undefined = undefined;
      if (typeof fallback === "function") {
        element = fallback({
          error: state.error,
          componentStack: state.componentStack ?? "",
          eventId: state.eventId,
          resetError: this.resetErrorBoundary,
        });
      } else {
        element = fallback;
      }

      if (isValidElement(element)) {
        return element;
      }

      // Fail gracefully if no fallback provided or is not valid
      return null;
    }

    if (typeof children === "function") {
      return children();
    }
    return children;
  }
}

export { ErrorBoundary };
