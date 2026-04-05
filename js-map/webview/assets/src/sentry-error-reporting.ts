type RendererErrorBoundaryCapture = {
  error: Error;
  extra: Record<string, unknown>;
  tags: Record<string, string>;
};

type RendererErrorBoundaryCaptureOptions = {
  boundaryName: string;
  componentStack: string;
  transformStack?: (stack: string | undefined) => string | null;
};

export function getRendererErrorBoundaryCapture(
  error: Error,
  options: RendererErrorBoundaryCaptureOptions,
): RendererErrorBoundaryCapture {
  const reportableError = new Error(error.message);
  reportableError.name = error.name;

  const stack =
    options.transformStack?.(error.stack) ??
    error.stack ??
    reportableError.stack;
  if (stack != null) {
    reportableError.stack = stack;
  }

  return {
    error: reportableError,
    extra: {
      componentStack: options.componentStack,
    },
    tags: {
      errorBoundary: options.boundaryName,
    },
  };
}
