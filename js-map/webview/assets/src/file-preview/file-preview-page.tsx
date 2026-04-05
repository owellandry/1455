import { lookup } from "mime-types";
import { FormattedMessage } from "react-intl";
import { useLocation } from "react-router";
import { z } from "zod";

import { CodeSnippet } from "@/components/code-snippet";

const filePreviewRouteStateSchema = z.object({
  filePath: z.string(),
  contents: z.string(),
  line: z.number().optional(),
  column: z.number().optional(),
});

type FilePreviewRouteState = z.infer<typeof filePreviewRouteStateSchema>;

function isFilePreviewRouteState(
  value: unknown,
): value is FilePreviewRouteState {
  return filePreviewRouteStateSchema.safeParse(value).success;
}

export function FilePreviewPage(): React.ReactElement {
  const location = useLocation();
  const state = isFilePreviewRouteState(location.state) ? location.state : null;

  if (!state) {
    return <div className="h-full" />;
  }

  const shouldShowBinaryMessage = lookup(state.filePath) === "application/pdf";

  if (shouldShowBinaryMessage) {
    return (
      <div className="flex h-full items-center justify-center text-token-text-tertiary">
        <FormattedMessage
          id="wham.diff.binaryFile"
          defaultMessage="Binary file not shown"
          description="Text shown when a binary file is not shown."
        />
      </div>
    );
  }

  const normalizedContents = state.contents.replace(/\r\n/g, "\n");

  return (
    <div className="h-full overflow-auto">
      <CodeSnippet
        content={normalizedContents}
        shouldWrapCode
        showActionBar={false}
        wrapperClassName="border-0 shadow-none rounded-none"
        codeContainerClassName="p-panel overflow-visible"
        codeClassName="block"
      />
    </div>
  );
}
